// src/hooks/usePushNotifications.js
// Sprint 9.1a — Gerencia permissão de push e registro de subscription no Supabase.

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';

// Chave pública VAPID — preencher após gerar com `npx web-push generate-vapid-keys`
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? '';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications() {
  const [permission, setPermission]   = useState(Notification?.permission ?? 'default');
  const [subscribed, setSubscribed]   = useState(false);
  const [loading,    setLoading]      = useState(false);
  const [supported,  setSupported]    = useState(false);

  useEffect(() => {
    const ok = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setSupported(ok);
    if (ok) setPermission(Notification.permission);
  }, []);

  // Verifica se já tem subscription ativa no banco
  useEffect(() => {
    if (!supported) return;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return;

      const { data } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('endpoint', sub.endpoint)
        .maybeSingle();

      setSubscribed(!!data);
    })();
  }, [supported]);

  const subscribe = useCallback(async () => {
    if (!supported || !VAPID_PUBLIC_KEY) return false;
    setLoading(true);
    try {
      // Solicitar permissão
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return false;

      // Registrar service worker (se ainda não estiver)
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Criar subscription
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const subJson = sub.toJSON();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;

      // Salvar no Supabase
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert(
          {
            user_id:    session.user.id,
            endpoint:   subJson.endpoint,
            p256dh:     subJson.keys?.p256dh,
            auth:       subJson.keys?.auth,
            user_agent: navigator.userAgent.substring(0, 200),
          },
          { onConflict: 'user_id,endpoint' }
        );

      if (error) throw error;

      setSubscribed(true);
      return true;
    } catch (err) {
      console.error('[usePushNotifications] subscribe:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [supported]);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return;

      await sub.unsubscribe();

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', session.user.id)
          .eq('endpoint', sub.endpoint);
      }

      setSubscribed(false);
    } catch (err) {
      console.error('[usePushNotifications] unsubscribe:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { permission, subscribed, loading, supported, subscribe, unsubscribe };
}
