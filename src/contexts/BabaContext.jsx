import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const BabaContext = createContext();

// ─────────────────────────────────────────────
// HELPER PURO exportado — pode ser importado em BabaSettings
// Sanitiza e normaliza game_days_config:
//   - sem duplicatas de day
//   - day sempre Number
//   - time sempre "HH:MM"
//   - ordenado por day
// ─────────────────────────────────────────────
export const sanitizeGameDaysConfig = (raw) => {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const seen = new Set();
  return raw
    .filter((item) => item && typeof item === 'object' && item.time)
    .map((item) => ({
      day: Number(item.day),
      time: String(item.time).substring(0, 5),
      location: item.location ? String(item.location).trim() : '',
    }))
    .filter((item) => {
      if (!Number.isInteger(item.day) || item.day < 0 || item.day > 6) return false;
      if (seen.has(item.day)) return false;
      seen.add(item.day);
      return true;
    })
    .sort((a, b) => a.day - b.day);
};

export const BabaProvider = ({ children }) => {
  const { user, profile } = useAuth();
  const [myBabas, setMyBabas] = useState([]);
  const [currentBaba, setCurrentBaba] = useState(null);
  const [players, setPlayers] = useState([]);
  // 'matches' removido — não estava sendo consumido na UI
  const [loading, setLoading] = useState(true);

  // Confirmação de presença
  const [gameConfirmations, setGameConfirmations] = useState([]);
  const [myConfirmation, setMyConfirmation] = useState(null);
  const [confirmationDeadline, setConfirmationDeadline] = useState(null);
  const [canConfirm, setCanConfirm] = useState(false);

  // Sorteio
  const [drawConfig, setDrawConfig] = useState({ playersPerTeam: 5, strategy: 'reserve' });
  const [currentMatch, setCurrentMatch] = useState(null);
  const [matchPlayers, setMatchPlayers] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);

  // ─────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────

  /**
   * Calcula deadline (30min antes do jogo).
   *
   * Prioridade:
   *  1. game_days_config — Number(c.day) corrige bug string vs number
   *  2. game_days + game_time (legado)
   *
   * Retorna null se hoje não for dia de jogo.
   */
  const calculateDeadline = (baba) => {
    if (!baba) return null;

    const now = new Date();
    const todayDow = now.getDay();
    let gameTimeStr = null;

    // 1. Novo formato
    if (Array.isArray(baba.game_days_config) && baba.game_days_config.length > 0) {
      const todayConfig = baba.game_days_config.find(
        (c) => Number(c.day) === todayDow   // ← FIX CRÍTICO: Number() resolve string vs number
      );
      if (todayConfig?.time) gameTimeStr = todayConfig.time;
    }

    // 2. Legado
    if (!gameTimeStr) {
      const hasTodayInLegacy =
        !Array.isArray(baba.game_days) ||
        baba.game_days.length === 0 ||
        baba.game_days.map(Number).includes(todayDow); // Number() aqui também

      if (hasTodayInLegacy && baba.game_time) gameTimeStr = baba.game_time;
    }

    if (!gameTimeStr) return null;

    const [hours, minutes] = gameTimeStr.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return null;

    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    base.setHours(hours, minutes, 0, 0);

    return new Date(base.getTime() - 30 * 60 * 1000);
  };

  // ─────────────────────────────────────────────
  // LOAD FUNCTIONS
  // ─────────────────────────────────────────────

  const loadMyBabas = async () => {
    if (!user) return;
    try {
      const { data: presidentBabas, error: e1 } = await supabase
        .from('babas').select('*').eq('president_id', user.id);
      if (e1) throw e1;

      const { data: playerRows, error: e2 } = await supabase
        .from('players').select('baba_id').eq('user_id', user.id);
      if (e2) throw e2;

      let memberBabas = [];
      if (playerRows?.length > 0) {
        const babaIds = playerRows.map((r) => r.baba_id);
        const { data: mb, error: e3 } = await supabase
          .from('babas').select('*').in('id', babaIds);
        if (e3) throw e3;
        memberBabas = mb || [];
      }

      const uniqueMap = new Map();
      [...(presidentBabas || []), ...memberBabas].forEach((b) => uniqueMap.set(b.id, b));
      const unique = Array.from(uniqueMap.values());
      setMyBabas(unique);

      if (!currentBaba && unique.length > 0) {
        const savedId = localStorage.getItem('selected_baba_id');
        const saved = savedId ? unique.find((b) => String(b.id) === savedId) : null;
        if (saved) {
          setCurrentBaba(saved);
        } else {
          localStorage.removeItem('selected_baba_id');
          setCurrentBaba(unique[0]);
        }
      }
    } catch (error) {
      console.error('Error loading babas:', error);
      toast.error('Erro ao carregar babas');
    }
  };

  const loadPlayers = async (babaId) => {
    try {
      const { data, error } = await supabase
        .from('players').select('*').eq('baba_id', babaId).order('name');
      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      console.error('Error loading players:', error);
    }
  };

  const loadGameConfirmations = async (babaId) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('game_confirmations')
        .select(`*, player:players(*)`)
        .eq('baba_id', babaId)
        .eq('game_date', today);
      if (error) throw error;

      const confirmations = data || [];
      setGameConfirmations(confirmations);

      const myPlayer = players.find((p) => p.user_id === user?.id);
      if (myPlayer) {
        setMyConfirmation(confirmations.find((c) => c.player_id === myPlayer.id) || null);
      }
    } catch (error) {
      console.error('Error loading confirmations:', error);
    }
  };

  const loadTodayMatch = async (babaId) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('matches').select('*').eq('baba_id', babaId).eq('match_date', today)
        .order('id', { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;

      if (data) {
        setCurrentMatch(data);
        await loadMatchPlayers(data.id);
      } else {
        setCurrentMatch(null);
        setMatchPlayers([]);
      }
      return data;
    } catch (error) {
      console.error('Error loading today match:', error);
      return null;
    }
  };

  const loadMatchPlayers = async (matchId) => {
    try {
      const { data, error } = await supabase
        .from('match_players').select(`*, player:players(*)`).eq('match_id', matchId).order('team');
      if (error) throw error;
      setMatchPlayers(data || []);
      return data;
    } catch (error) {
      console.error('Error loading match players:', error);
      return [];
    }
  };

  // ─────────────────────────────────────────────
  // BABA CRUD
  // ─────────────────────────────────────────────

  const createBaba = async (babaData) => {
    try {
      setLoading(true);
      const sanitized = { ...babaData };
      if (Array.isArray(sanitized.game_days_config)) {
        sanitized.game_days_config = sanitizeGameDaysConfig(sanitized.game_days_config);
      }

      const { data, error } = await supabase
        .from('babas')
        .insert([{ ...sanitized, president_id: user.id, invite_code: null, invite_expires_at: null }])
        .select().single();
      if (error) throw error;
      if (!data) throw new Error('Insert retornou vazio');

      // Presidente como jogador (guard duplicata)
      const { data: ep } = await supabase.from('players').select('id')
        .eq('baba_id', data.id).eq('user_id', user.id).maybeSingle();
      if (!ep) {
        await supabase.from('players').insert([{
          baba_id: data.id, user_id: user.id,
          name: profile?.name || 'Presidente', position: 'linha',
        }]);
      }

      toast.success('Baba criado com sucesso!');
      await loadMyBabas();
      setCurrentBaba(data);
      localStorage.setItem('selected_baba_id', String(data.id));
      return data;
    } catch (error) {
      console.error('Erro ao criar baba:', error);
      toast.error('Erro ao criar baba');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const joinBaba = async (inviteCode) => {
    try {
      setLoading(true);
      const code = inviteCode.trim().toUpperCase().substring(0, 6);
      if (code.length < 6) {
        toast.error('Código inválido. Deve ter 6 caracteres.');
        return null;
      }

      const { data: baba, error: babaError } = await supabase
        .from('babas').select('*').eq('invite_code', code).maybeSingle();
      if (babaError) throw babaError;
      if (!baba) { toast.error('Código inválido.'); return null; }

      if (baba.invite_expires_at && new Date() > new Date(baba.invite_expires_at)) {
        toast.error('Código expirado. Peça um novo ao presidente.');
        return null;
      }

      const { data: ep } = await supabase.from('players').select('id, name')
        .eq('baba_id', baba.id).eq('user_id', user.id).maybeSingle();

      if (ep) {
        const currentName = profile?.name || 'Jogador';
        if (ep.name !== currentName) {
          await supabase.from('players').update({ name: currentName }).eq('id', ep.id);
        }
        toast('Você já faz parte deste baba!', { icon: '⚽' });
        setCurrentBaba(baba);
        localStorage.setItem('selected_baba_id', String(baba.id));
        await loadMyBabas();
        return baba;
      }

      const { error: pe } = await supabase.from('players').insert([{
        baba_id: baba.id, user_id: user.id,
        name: profile?.name || 'Jogador', position: 'linha',
      }]);

      if (pe) {
        if (pe.code === '23505') {
          toast('Você já faz parte deste baba!', { icon: '⚽' });
        } else throw pe;
      } else {
        toast.success('Entrou no baba com sucesso!');
      }

      await loadMyBabas();
      setCurrentBaba(baba);
      localStorage.setItem('selected_baba_id', String(baba.id));
      return baba;
    } catch (error) {
      console.error('Error joining baba:', error);
      toast.error(error.message || 'Erro ao entrar no baba');
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * updateBaba — sanitiza game_days_config antes de salvar.
   * Suporta avatar_url e cover_url (imagens do baba).
   * Atualiza estado local sem refetch completo.
   */
  const updateBaba = async (babaId, updates) => {
    try {
      setLoading(true);
      const sanitized = { ...updates };

      if (Array.isArray(sanitized.game_days_config)) {
        sanitized.game_days_config = sanitizeGameDaysConfig(sanitized.game_days_config);
        // Se há config nova, zera game_days legado para evitar mistura
        if (sanitized.game_days_config.length > 0) {
          sanitized.game_days = [];
        }
      }

      const { data, error } = await supabase
        .from('babas').update(sanitized).eq('id', babaId).select().single();
      if (error) throw error;

      toast.success('Baba atualizado com sucesso!');
      setMyBabas((prev) => prev.map((b) => (b.id === babaId ? data : b)));
      if (currentBaba?.id === babaId) setCurrentBaba(data);
      return data;
    } catch (error) {
      console.error('Error updating baba:', error);
      toast.error('Erro ao atualizar baba');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteBaba = async (babaId) => {
    try {
      setLoading(true);
      const { error } = await supabase.from('babas').delete().eq('id', babaId);
      if (error) throw error;
      toast.success('Baba excluído com sucesso!');
      if (currentBaba?.id === babaId) {
        setCurrentBaba(null);
        localStorage.removeItem('selected_baba_id');
      }
      await loadMyBabas();
      return true;
    } catch (error) {
      console.error('Error deleting baba:', error);
      toast.error('Erro ao excluir baba');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  // INVITE CODE
  // ─────────────────────────────────────────────

  const generateInviteCode = async () => {
    if (!currentBaba) return null;
    try {
      setLoading(true);
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const { error } = await supabase.from('babas')
        .update({ invite_code: code, invite_expires_at: expiresAt.toISOString() })
        .eq('id', currentBaba.id);
      if (error) throw error;

      const updated = { ...currentBaba, invite_code: code, invite_expires_at: expiresAt.toISOString() };
      setCurrentBaba(updated);
      setMyBabas((prev) => prev.map((b) => (b.id === currentBaba.id ? updated : b)));
      toast.success('Código gerado! Válido por 24h.');
      return code;
    } catch (error) {
      console.error('Error generating invite code:', error);
      toast.error('Erro ao gerar código');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  // IMAGENS DO BABA
  // ─────────────────────────────────────────────

  /**
   * Upload de imagem para Supabase Storage.
   * Bucket: 'baba-images' (deve existir e ser público no Supabase)
   * @param {File} file
   * @param {'avatar'|'cover'} type
   */
  const uploadBabaImage = async (file, type = 'avatar') => {
    if (!currentBaba || !file) return null;
    try {
      setLoading(true);
      const ext = file.name.split('.').pop();
      const path = `babas/${currentBaba.id}/${type}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('baba-images')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('baba-images').getPublicUrl(path);

      return updateBaba(currentBaba.id, {
        [type === 'avatar' ? 'avatar_url' : 'cover_url']: urlData.publicUrl,
      });
    } catch (error) {
      console.error('Error uploading baba image:', error);
      toast.error('Erro ao enviar imagem');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  // CONFIRMAÇÃO DE PRESENÇA
  // ─────────────────────────────────────────────

  const confirmPresence = async () => {
    try {
      setLoading(true);
      const myPlayer = players.find((p) => p.user_id === user?.id);
      if (!myPlayer) { toast.error('Você não está registrado neste baba'); return; }

      const today = new Date().toISOString().split('T')[0];
      const { data: existing } = await supabase.from('game_confirmations').select('id')
        .eq('baba_id', currentBaba.id).eq('player_id', myPlayer.id)
        .eq('game_date', today).maybeSingle();

      if (existing) { toast.error('Você já confirmou presença!'); return; }

      const { data, error } = await supabase.from('game_confirmations')
        .insert([{ baba_id: currentBaba.id, player_id: myPlayer.id, game_date: today }])
        .select(`*, player:players(*)`).single();

      if (error) {
        if (error.code === '23505') { toast.error('Você já confirmou presença!'); }
        else throw error;
        return;
      }

      toast.success('Presença confirmada!');
      setMyConfirmation(data);
      await loadGameConfirmations(currentBaba.id);
    } catch (error) {
      console.error('Error confirming presence:', error);
      toast.error('Erro ao confirmar presença');
    } finally {
      setLoading(false);
    }
  };

  const cancelConfirmation = async () => {
    try {
      setLoading(true);
      if (!myConfirmation) { toast.error('Você não confirmou presença'); return; }
      const { error } = await supabase.from('game_confirmations')
        .delete().eq('id', myConfirmation.id);
      if (error) throw error;
      toast.success('Confirmação cancelada');
      setMyConfirmation(null);
      await loadGameConfirmations(currentBaba.id);
    } catch (error) {
      console.error('Error canceling confirmation:', error);
      toast.error('Erro ao cancelar confirmação');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  // SORTEIO
  // ─────────────────────────────────────────────

  const drawTeamsIntelligent = async () => {
    try {
      if (!currentBaba || !gameConfirmations.length) {
        toast.error('Nenhum jogador confirmado'); return null;
      }
      const { playersPerTeam, strategy } = drawConfig;
      if (gameConfirmations.length < playersPerTeam * 2) {
        toast.error(`Mínimo de ${playersPerTeam * 2} jogadores necessário`); return null;
      }

      setIsDrawing(true);
      const confirmed = gameConfirmations.map((c) => c.player).filter(Boolean);
      let goalies = confirmed.filter((p) => p.position === 'goleiro').sort(() => Math.random() - 0.5);
      let outfield = confirmed.filter((p) => p.position !== 'goleiro').sort(() => Math.random() - 0.5);

      const numTeams = strategy === 'reserve'
        ? Math.floor(confirmed.length / playersPerTeam)
        : Math.ceil(confirmed.length / playersPerTeam);

      if (numTeams < 2) {
        toast.error('Jogadores insuficientes para 2 times!');
        setIsDrawing(false); return null;
      }

      const teams = Array.from({ length: numTeams }, (_, i) => ({
        name: `Time ${String.fromCharCode(65 + i)}`, players: [],
      }));

      for (let i = 0; i < numTeams && goalies.length > 0; i++) teams[i].players.push(goalies.shift());

      let remaining = [...outfield, ...goalies];
      let ti = 0;
      while (remaining.length > 0) {
        if (strategy === 'reserve' && teams.every((t) => t.players.length >= playersPerTeam)) break;
        if (teams[ti].players.length < playersPerTeam) teams[ti].players.push(remaining.shift());
        ti = (ti + 1) % numTeams;
      }

      const reserves = remaining;
      const today = new Date().toISOString().split('T')[0];

      const { data: drawResult, error: drawError } = await supabase
        .from('draw_results')
        .upsert({
          baba_id: currentBaba.id, draw_date: today, teams,
          queue_order: teams.map((_, i) => i), reserves,
          total_confirmed: confirmed.length, players_per_team: playersPerTeam, strategy,
        }, { onConflict: 'baba_id,draw_date' })
        .select().single();
      if (drawError) throw drawError;

      // Fase 1 — limpa match do dia (respeita 'finished')
      const { data: em } = await supabase.from('matches').select('id, status')
        .eq('baba_id', currentBaba.id).eq('match_date', today).maybeSingle();
      if (em) {
        if (em.status === 'finished') {
          toast.error('Partida já finalizada hoje.'); setIsDrawing(false); return null;
        }
        await supabase.from('matches').delete().eq('id', em.id);
      }

      const gameTimeStr = currentBaba.game_time?.substring(0, 5) || '00:00';

      // Fase 2 — guard race condition
      const { data: rc } = await supabase.from('matches').select('id, status')
        .eq('baba_id', currentBaba.id).eq('match_date', today).maybeSingle();
      if (rc) {
        console.warn('⚠️ Race condition: match já criado por outra instância');
        setCurrentMatch(rc);
        await loadMatchPlayers(rc.id);
        toast('Times já sorteados!', { icon: '⚽' });
        setIsDrawing(false); return null;
      }

      const { data: match, error: me } = await supabase.from('matches')
        .insert([{
          baba_id: currentBaba.id,
          match_date: `${today}T${gameTimeStr}:00`,
          team_a_name: teams[0].name, team_b_name: teams[1].name,
          draw_result_id: drawResult.id, status: 'scheduled',
        }]).select().single();
      if (me) throw me;

      const { error: mpe } = await supabase.from('match_players').insert(
        teams.flatMap((team, i) => team.players.map((p) => ({
          match_id: match.id, player_id: p.id,
          team: String.fromCharCode(65 + i), position: p.position || 'linha',
        })))
      );
      if (mpe) throw mpe;

      setCurrentMatch(match);
      await loadMatchPlayers(match.id);
      toast.success(`${numTeams} times sorteados! ${reserves.length} na reserva`);
      return { match, drawResult, teams, reserves };
    } catch (error) {
      console.error('Error drawing teams:', error);
      toast.error('Erro ao sortear times');
      return null;
    } finally {
      setIsDrawing(false);
    }
  };

  const manualDraw = async () => {
    if (!currentBaba) return null;
    if (String(currentBaba.president_id) !== String(user?.id)) {
      toast.error('Apenas o presidente pode sortear manualmente'); return null;
    }
    if (gameConfirmations.length < 4) {
      toast.error('Mínimo de 4 jogadores confirmados'); return null;
    }
    return drawTeamsIntelligent();
  };

  const drawTeams = (availablePlayers) => {
    const shuffled = [...availablePlayers].sort(() => Math.random() - 0.5);
    const mid = Math.ceil(shuffled.length / 2);
    return { teamA: shuffled.slice(0, mid), teamB: shuffled.slice(mid) };
  };

  // ─────────────────────────────────────────────
  // EFFECTS
  // ─────────────────────────────────────────────

  useEffect(() => {
    if (user) { loadMyBabas().finally(() => setLoading(false)); }
    else setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!currentBaba) return;
    localStorage.setItem('selected_baba_id', String(currentBaba.id));
    loadPlayers(currentBaba.id);
    loadTodayMatch(currentBaba.id);
  }, [currentBaba]);

  useEffect(() => {
    if (!currentBaba || players.length === 0) return;
    loadGameConfirmations(currentBaba.id);
    const deadline = calculateDeadline(currentBaba);
    setConfirmationDeadline(deadline);
    setCanConfirm(deadline ? new Date() < deadline : false);
  }, [currentBaba, players]);

  useEffect(() => {
    if (!confirmationDeadline) return;
    const interval = setInterval(() => {
      setCanConfirm(new Date() < confirmationDeadline);
    }, 60_000);
    return () => clearInterval(interval);
  }, [confirmationDeadline]);

  // ─────────────────────────────────────────────
  // CONTEXT
  // ─────────────────────────────────────────────

  return (
    <BabaContext.Provider value={{
      myBabas, currentBaba, setCurrentBaba, players, loading,
      createBaba, joinBaba, updateBaba, deleteBaba, loadMyBabas,
      generateInviteCode, uploadBabaImage,
      gameConfirmations, myConfirmation, canConfirm, confirmationDeadline,
      confirmPresence, cancelConfirmation,
      currentMatch, matchPlayers, isDrawing,
      drawTeams, drawTeamsIntelligent, manualDraw,
      drawConfig, setDrawConfig,
      loadTodayMatch, loadMatchPlayers,
      calculateDeadline, sanitizeGameDaysConfig,
    }}>
      {children}
    </BabaContext.Provider>
  );
};

export const useBaba = () => {
  const context = useContext(BabaContext);
  if (!context) throw new Error('useBaba must be used within BabaProvider');
  return context;
};
