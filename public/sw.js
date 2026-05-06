// public/sw.js
// Sprint 9.1a — Service Worker: recebe push e trata notificationclick

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

// ── Receber push ──────────────────────────────────────────────────────────────
self.addEventListener('push', (e) => {
  if (!e.data) return;

  let payload = { title: 'Draft Play', body: 'Nova notificação', url: '/' };
  try { payload = { ...payload, ...e.data.json() }; } catch {}

  e.waitUntil(
    self.registration.showNotification(payload.title, {
      body:    payload.body,
      icon:    '/icons/icon-192x192.png',
      badge:   '/icons/icon-96x96.png',
      vibrate: [100, 50, 100],
      data:    { url: payload.url },
      actions: [
        { action: 'open',    title: 'Abrir'    },
        { action: 'dismiss', title: 'Dispensar' },
      ],
    })
  );
});

// ── Clique na notificação ────────────────────────────────────────────────────
self.addEventListener('notificationclick', (e) => {
  e.notification.close();

  if (e.action === 'dismiss') return;

  const targetUrl = e.notification.data?.url || '/';

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Se já tem aba aberta, focar nela e navegar
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      // Senão abre nova aba
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

// ── Push subscription change (browser renova automaticamente) ────────────────
self.addEventListener('pushsubscriptionchange', (e) => {
  e.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey: e.oldSubscription?.options?.applicationServerKey,
    }).then((newSub) => {
      return fetch('/api/push/resubscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ subscription: newSub }),
      });
    })
  );
});
