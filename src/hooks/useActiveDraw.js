// src/hooks/useActiveDraw.js
// ─────────────────────────────────────────────────────────────────────────────
// Sessão de sorteio ATIVA do baba (a que vale agora), venha ela do sorteio
// manual ou do automático — as duas gravam o mesmo draw_results.
//
//   draw     → linha de draw_results (ou null)
//   started  → true se alguma partida dessa sessão já foi criada (StepMatch)
//   reload   → recarrega (use após sortear/encerrar)
//
// refreshKey: qualquer valor que, ao mudar, força recarregar (ex: drawVersion
// do BabaContext, que sobe quando o sorteio automático roda no cliente).
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { fetchActiveDraw } from '../services/drawService';

export const useActiveDraw = (babaId, refreshKey = 0) => {
  const [draw,    setDraw]    = useState(null);
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(!!babaId);

  const reload = useCallback(async () => {
    if (!babaId) {
      setDraw(null); setStarted(false); setLoading(false);
      return;
    }
    try {
      const fetched = await fetchActiveDraw(babaId);
      const row = fetched && fetched.id ? fetched : null;
      setDraw(row);

      if (row?.id) {
        const res = await supabase
          .from('matches')
          .select('id')
          .eq('draw_result_id', row.id)
          .limit(1);
        setStarted(Array.isArray(res?.data) && res.data.length > 0);
      } else {
        setStarted(false);
      }
    } catch (err) {
      console.error('[useActiveDraw]', err);
      setDraw(null);
      setStarted(false);
    } finally {
      setLoading(false);
    }
  }, [babaId]);

  useEffect(() => { reload(); }, [reload, refreshKey]);

  return { draw, started, loading, reload };
};

export default useActiveDraw;
