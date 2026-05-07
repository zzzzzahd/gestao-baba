// public/sw.js
// Sprint 9 — Service Worker: recebe push, trata notificationclick, renova subscription

const SUPABASE_URL     = self.__SUPABASE_URL__ || '';
const SUPABASE_ANON    = self.__SUPABASE_ANON__ || '';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));

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
      tag:     payload.tag || 'draft-play',
      renotify: true,
      data:    { url: payload.url },
      actions: [
        { action: 'open',    title: 'Abrir'     },
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
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

// ── Renovação automática de subscription (browser rotaciona chaves) ──────────
self.addEventListener('pushsubscriptionchange', (e) => {
  e.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey: e.oldSubscription?.options?.applicationServerKey,
    }).then(async (newSub) => {
      const subJson = newSub.toJSON();

      // Notificar clientes abertos para salvar a nova subscription
      const allClients = await clients.matchAll({ type: 'window' });
      for (const client of allClients) {
        client.postMessage({
          type:       'PUSH_RESUBSCRIBED',
          endpoint:   subJson.endpoint,
          p256dh:     subJson.keys?.p256dh,
          auth:       subJson.keys?.auth,
        });
      }
    })
  );
});
