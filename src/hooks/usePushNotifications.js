// src/hooks/usePushNotifications.js
// Sprint 9 — Gerencia permissão de push e registro de subscription no Supabase.
// Usa RPCs upsert_push_subscription / deactivate_push_subscription + get_push_status

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? '';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications() {
  const [permission, setPermission] = useState(Notification?.permission ?? 'default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [supported,  setSupported]  = useState(false);

  // Detectar suporte
  useEffect(() => {
    const ok = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setSupported(ok);
    if (ok) setPermission(Notification.permission);
  }, []);

  // Verificar status via RPC ao montar
  useEffect(() => {
    if (!supported) return;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase.rpc('get_push_status');
      if (data?.[0]?.has_subscription) {
        // Confirmar que o browser também tem a subscription
        try {
          const reg = await navigator.serviceWorker.ready;
          const sub = await reg.pushManager.getSubscription();
          setSubscribed(!!sub && data[0].has_subscription);
        } catch {
          setSubscribed(data[0].has_subscription);
        }
      }
    })();
  }, [supported]);

  const subscribe = useCallback(async () => {
    if (!supported || !VAPID_PUBLIC_KEY) {
      console.warn('[usePushNotifications] Push não suportado ou VAPID_PUBLIC_KEY ausente');
      return false;
    }
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return false;

      // Registrar / obter service worker
      let reg;
      try {
        reg = await navigator.serviceWorker.register('/sw.js');
      } catch {
        reg = await navigator.serviceWorker.ready;
      }
      await navigator.serviceWorker.ready;

      // Criar subscription no browser
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const subJson = sub.toJSON();

      // Salvar via RPC (faz upsert correto por endpoint)
      const { error } = await supabase.rpc('upsert_push_subscription', {
        p_endpoint: subJson.endpoint,
        p_p256dh:   subJson.keys?.p256dh,
        p_auth:     subJson.keys?.auth,
        p_ua:       navigator.userAgent.substring(0, 200),
      });

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
      if (!sub) {
        setSubscribed(false);
        return;
      }

      const endpoint = sub.endpoint;
      await sub.unsubscribe();

      // Desativar no banco via RPC (soft delete — mantém histórico)
      await supabase.rpc('deactivate_push_subscription', { p_endpoint: endpoint });

      setSubscribed(false);
    } catch (err) {
      console.error('[usePushNotifications] unsubscribe:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { permission, subscribed, loading, supported, subscribe, unsubscribe };
}
