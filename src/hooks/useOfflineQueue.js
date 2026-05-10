// src/hooks/useOfflineQueue.js
// Sprint 20 — Detecta offline, enfileira ações e sincroniza via RPC process_offline_queue

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';
import toast        from 'react-hot-toast';

const QUEUE_KEY    = 'draft_play_offline_queue';
const MAX_RETRIES  = 3;

// ─── Persistência local ───────────────────────────────────────────────────────

const loadQueue = () => {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
};

const saveQueue = (queue) => {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    console.warn('[useOfflineQueue] não foi possível salvar fila no localStorage');
  }
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOfflineQueue() {
  const [isOnline,   setIsOnline]   = useState(navigator.onLine);
  const [queue,      setQueue]      = useState(loadQueue);
  const [syncing,    setSyncing]    = useState(false);
  const syncLock     = useRef(false);

  // Monitorar conexão
  useEffect(() => {
    const handleOnline  = () => {
      setIsOnline(true);
      toast.success('Conexão restaurada', { icon: '📶', id: 'online-toast' });
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast('Sem conexão — ações serão salvas localmente', { icon: '📵', id: 'offline-toast' });
    };

    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Persistir fila no localStorage sempre que mudar
  useEffect(() => {
    saveQueue(queue);
  }, [queue]);

  // Sincronizar automaticamente ao voltar online
  useEffect(() => {
    if (isOnline && queue.length > 0) {
      sync();
    }
  }, [isOnline]);

  // ── Adicionar operação à fila ──────────────────────────────────────────────
  const enqueue = useCallback((operation, payload) => {
    const item = {
      client_id:   `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      operation,
      payload,
      created_at:  new Date().toISOString(),
      retry_count: 0,
    };

    setQueue(prev => {
      // Evitar duplicata para a mesma operação + baba + data
      const isDup = prev.some(
        q => q.operation === operation &&
             q.payload?.baba_id   === payload?.baba_id &&
             q.payload?.game_date === payload?.game_date
      );
      if (isDup) return prev;
      return [...prev, item];
    });

    return item.client_id;
  }, []);

  // ── Remover item da fila ───────────────────────────────────────────────────
  const dequeue = useCallback((clientId) => {
    setQueue(prev => prev.filter(q => q.client_id !== clientId));
  }, []);

  // ── Sincronizar tudo com o servidor ───────────────────────────────────────
  const sync = useCallback(async () => {
    if (syncLock.current || syncing) return;
    const pending = loadQueue();
    if (!pending.length) return;

    syncLock.current = true;
    setSyncing(true);

    try {
      const { data: results, error } = await supabase.rpc('process_offline_queue', {
        p_items: pending,
      });

      if (error) throw error;

      const resultMap = new Map((results || []).map(r => [r.client_id, r]));
      const failed    = [];

      pending.forEach(item => {
        const result = resultMap.get(item.client_id);
        if (result?.result?.error) {
          // Retentar até MAX_RETRIES
          if (item.retry_count < MAX_RETRIES) {
            failed.push({ ...item, retry_count: item.retry_count + 1 });
          } else {
            console.warn('[useOfflineQueue] item descartado após max tentativas:', item);
          }
        }
        // Sucesso — item removido da fila
      });

      setQueue(failed);
      saveQueue(failed);

      if (pending.length > failed.length) {
        const syncedCount = pending.length - failed.length;
        toast.success(`${syncedCount} ação${syncedCount > 1 ? 'ões' : ''} sincronizada${syncedCount > 1 ? 's' : ''}`, {
          icon: '✅',
          id:   'sync-toast',
        });
      }
    } catch (err) {
      console.error('[useOfflineQueue] sync error:', err);
      // Incrementar retry_count em todos
      setQueue(prev => prev.map(q => ({
        ...q,
        retry_count: (q.retry_count || 0) + 1,
      })).filter(q => q.retry_count <= MAX_RETRIES));
    } finally {
      syncLock.current = false;
      setSyncing(false);
    }
  }, [syncing]);

  // ── Executar operação: online direto, offline enfileira ───────────────────
  const execute = useCallback(async (operation, payload, onlineAction) => {
    if (isOnline) {
      try {
        return await onlineAction();
      } catch (err) {
        // Se falhar por rede, enfileirar
        if (err?.message?.includes('network') || err?.message?.includes('fetch')) {
          enqueue(operation, payload);
          toast('Salvo offline — sincronizará ao reconectar', { icon: '💾' });
          return { queued: true };
        }
        throw err;
      }
    } else {
      const clientId = enqueue(operation, payload);
      toast('Salvo offline — sincronizará ao reconectar', { icon: '💾', id: clientId });
      return { queued: true, client_id: clientId };
    }
  }, [isOnline, enqueue]);

  return {
    isOnline,
    queue,
    syncing,
    pendingCount: queue.length,
    enqueue,
    dequeue,
    sync,
    execute,
  };
}
