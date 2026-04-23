import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

const BabaContext = createContext();

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

export const sanitizeGameDaysConfig = (raw) => {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const seen = new Set();
  return raw
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      day:      Number(item.day),
      // ✅ FIX: aceita tanto 'HH:MM' quanto 'HH:MM:SS' — normaliza para 'HH:MM'
      time:     String(item.time || '').trim().substring(0, 5),
      location: item.location ? String(item.location).trim() : '',
    }))
    .filter((item) => {
      if (!Number.isInteger(item.day) || item.day < 0 || item.day > 6) return false;
      const timeMatch = item.time.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
      if (!timeMatch) return false;
      if (seen.has(item.day)) return false;
      seen.add(item.day);
      return true;
    })
    .map((item) => ({
      day:      item.day,
      time:     item.time,
      location: item.location,
    }))
    .sort((a, b) => a.day - b.day);
};

export const getNextGameDay = (baba) => {
  if (!baba) return null;
  const now = new Date();
  const todayDow = now.getDay();
  let configs = [];

  if (Array.isArray(baba.game_days_config) && baba.game_days_config.length > 0) {
    configs = sanitizeGameDaysConfig(baba.game_days_config);
  } else if (Array.isArray(baba.game_days) && baba.game_days.length > 0) {
    // ✅ FIX: game_time do banco vem como 'HH:MM:SS' — trunca para 'HH:MM'
    const time = baba.game_time ? String(baba.game_time).substring(0, 5) : '20:00';
    configs = [...new Set(baba.game_days.map(Number))]
      .filter(d => d >= 0 && d <= 6)
      .map(d => ({ day: d, time, location: baba.location || '' }))
      .sort((a, b) => a.day - b.day);
  }

  if (configs.length === 0) return null;

  for (let offset = 0; offset < 7; offset++) {
    const checkDow = (todayDow + offset) % 7;
    const match = configs.find((c) => c.day === checkDow);
    if (!match) continue;
    const [h, m] = match.time.split(':').map(Number);
    const gameDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    gameDate.setHours(h, m, 0, 0);
    const deadline = new Date(gameDate.getTime() - 30 * 60 * 1000);
    if (now < deadline) {
      return { ...match, date: gameDate, deadline, daysAhead: offset, dateStr: gameDate.toISOString().split('T')[0] };
    }
  }

  const first = configs[0];
  const daysAhead = ((first.day - todayDow + 7) % 7) || 7;
  const gameDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysAhead);
  const [h, m] = first.time.split(':').map(Number);
  gameDate.setHours(h, m, 0, 0);
  return {
    ...first, date: gameDate,
    deadline: new Date(gameDate.getTime() - 30 * 60 * 1000),
    daysAhead, dateStr: gameDate.toISOString().split('T')[0],
  };
};

// ─────────────────────────────────────────────
// SORTEIO BALANCEADO POR RATING
// ─────────────────────────────────────────────
export const generateBalancedTeams = (players, numTeams = 2) => {
  const n = Math.max(2, numTeams);

  const goalies  = players.filter(p => p.position === 'goleiro')
                          .sort((a, b) => (b.final_rating || 0) - (a.final_rating || 0));
  const outfield = players.filter(p => p.position !== 'goleiro')
                          .sort((a, b) => (b.final_rating || 0) - (a.final_rating || 0));

  const teams = Array.from({ length: n }, (_, i) => ({
    name: `Time ${String.fromCharCode(65 + i)}`,
    players: [],
    totalRating: 0,
  }));

  goalies.forEach((g, i) => {
    const t = i % n;
    teams[t].players.push(g);
    teams[t].totalRating += g.final_rating || 0;
  });

  let direction = 1;
  let pointer   = 0;
  outfield.forEach((p) => {
    teams[pointer].players.push(p);
    teams[pointer].totalRating += p.final_rating || 0;
    pointer += direction;
    if (pointer >= n) { pointer = n - 1; direction = -1; }
    else if (pointer < 0) { pointer = 0; direction = 1; }
  });

  return teams;
};

// ─────────────────────────────────────────────
// PROVIDER
// ─────────────────────────────────────────────

export const BabaProvider = ({ children }) => {
  const { user, profile } = useAuth();

  const [myBabas,        setMyBabas]        = useState([]);
  const [currentBaba,    setCurrentBaba]    = useState(null);
  const [players,        setPlayers]        = useState([]);
  const [loading,        setLoading]        = useState(true);

  const [gameConfirmations,    setGameConfirmations]    = useState([]);
  const [myConfirmation,       setMyConfirmation]       = useState(null);
  const [confirmationDeadline, setConfirmationDeadline] = useState(null);
  const [canConfirm,           setCanConfirm]           = useState(false);
  const [nextGameDay,          setNextGameDay]          = useState(null);

  const [countdown,    setCountdown]    = useState({ d: 0, h: 0, m: 0, s: 0, active: false });
  const [drawConfig,   setDrawConfig]   = useState({ playersPerTeam: 5, strategy: 'reserve' });
  const [currentMatch, setCurrentMatch] = useState(null);
  const [matchPlayers, setMatchPlayers] = useState([]);
  const [isDrawing,    setIsDrawing]    = useState(false);
  const [drawStatus,   setDrawStatus]   = useState('waiting');

  const hasAutoDrawnRef = useRef(false);

  // ─────────────────────────────────────────────
  // RATING
  // ─────────────────────────────────────────────

  const getAllRatings = useCallback(async () => {
    if (!currentBaba) return [];
    try {
      const { data, error } = await supabase
        .from('player_rating_summary')
        .select(`
          *,
          player:players!player_id(name, position)
        `)
        .eq('baba_id', currentBaba.id)
        .order('final_rating', { ascending: false });

      if (error) throw error;
      return (data || []).map(r => ({
        ...r,
        name:     r.player?.name     || 'Jogador',
        position: r.player?.position || 'linha',
      }));
    } catch (e) {
      console.error('[getAllRatings]', e);
      return [];
    }
  }, [currentBaba?.id]);

  const ratePlayer = useCallback(async (ratedId, ratings) => {
    if (!user || !currentBaba) return;
    try {
      const myPlayer = players.find(p => p.user_id === user.id);
      if (!myPlayer) throw new Error('Jogador não identificado');

      const { error } = await supabase
        .from('player_ratings')
        .upsert(
          {
            baba_id:    currentBaba.id,
            rater_id:   myPlayer.id,
            rated_id:   ratedId,
            skill:      ratings.skill,
            physical:   ratings.physical,
            commitment: ratings.commitment,
          },
          { onConflict: 'baba_id,rater_id,rated_id' }
        );

      if (error) throw error;
      toast.success('Avaliação enviada! ⭐');
    } catch (err) {
      console.error('[ratePlayer]', err);
      toast.error('Erro ao enviar avaliação');
    }
  }, [user, currentBaba, players]);

  const setManualWeight = useCallback(async (playerId, weight) => {
    if (!currentBaba) return;
    const clamped = Math.max(0, Math.min(5, Number(weight)));
    try {
      const { error } = await supabase
        .from('player_rating_summary')
        .update({ manual_weight: clamped })
        .eq('player_id', playerId)
        .eq('baba_id', currentBaba.id);

      if (error) throw error;

      await supabase.rpc('recalculate_player_rating', {
        p_rated_id: playerId,
        p_baba_id:  currentBaba.id,
      });

      toast.success('Peso manual atualizado!');
    } catch (err) {
      console.error('[setManualWeight]', err);
      toast.error('Erro ao atualizar peso');
    }
  }, [currentBaba]);

  // ─────────────────────────────────────────────
  // CARREGAMENTO
  // ─────────────────────────────────────────────

  const loadMyBabas = async () => {
    if (!user) return;
    try {
      const { data: presidentBabas } = await supabase.from('babas').select('*').eq('president_id', user.id);
      const { data: playerRows }     = await supabase.from('players').select('baba_id').eq('user_id', user.id);

      let memberBabas = [];
      if (playerRows?.length > 0) {
        const { data: mb } = await supabase.from('babas').select('*').in('id', playerRows.map(r => r.baba_id));
        memberBabas = mb || [];
      }

      const uniqueMap = new Map();
      [...(presidentBabas || []), ...memberBabas].forEach(b => uniqueMap.set(b.id, b));
      const unique = Array.from(uniqueMap.values());
      setMyBabas(unique);

      if (unique.length > 0) {
        const savedId = localStorage.getItem('selected_baba_id');
        const saved   = savedId ? unique.find(b => String(b.id) === savedId) : null;
        setCurrentBaba(saved || unique[0]);
      }
    } catch (error) {
      console.error('[loadMyBabas]', error);
      throw error;
    }
  };

  const loadPlayers = async (babaId) => {
    const { data, error } = await supabase
      .from('players')
      .select('*, profile:profiles(avatar_url, name)')
      .eq('baba_id', babaId)
      .order('name');
    if (error) console.error('[loadPlayers]', error);
    const normalized = (data || []).map(p => ({
      ...p,
      avatar_url:   p.profile?.avatar_url || null,
      display_name: p.name || p.profile?.name || 'Jogador',
    }));
    setPlayers(normalized);
    return normalized;
  };

  const loadTodayMatch = async (babaId, dateStr) => {
    try {
      const { data: draw } = await supabase
        .from('draw_results').select('id')
        .eq('baba_id', babaId).eq('draw_date', dateStr).maybeSingle();
      if (!draw) { setCurrentMatch(null); setMatchPlayers([]); return; }

      const { data: match } = await supabase
        .from('matches').select('*')
        .eq('baba_id', babaId).eq('draw_result_id', draw.id).maybeSingle();
      if (match) {
        setCurrentMatch(match);
        const { data: mp } = await supabase
          .from('match_players')
          .select('*, player:players(*, profile:profiles(avatar_url))')
          .eq('match_id', match.id).order('team');
        setMatchPlayers(mp || []);
        setDrawStatus('ready');
      }
    } catch (e) { console.error('[loadTodayMatch]', e); }
  };

  // ─────────────────────────────────────────────
  // CONFIRMAÇÃO DE PRESENÇA
  // ─────────────────────────────────────────────

  const confirmPresence = async () => {
    if (!currentBaba || !user || !nextGameDay) return;
    setLoading(true);
    try {
      const myPlayer = players.find(p => p.user_id === user.id);
      if (!myPlayer) throw new Error('Jogador não encontrado');
      const { data, error } = await supabase
        .from('game_confirmations')
        .insert([{ baba_id: currentBaba.id, player_id: myPlayer.id, game_date: nextGameDay.dateStr }])
        .select('*, player:players(*)')
        .single();
      if (error) throw error;
      setGameConfirmations(prev => [...prev, data]);
      setMyConfirmation(data);
      toast.success('Presença confirmada!');
    } catch (error) { toast.error('Erro ao confirmar'); }
    finally { setLoading(false); }
  };

  const cancelConfirmation = async () => {
    if (!myConfirmation) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('game_confirmations').delete().eq('id', myConfirmation.id);
      if (error) throw error;
      setGameConfirmations(prev => prev.filter(c => c.id !== myConfirmation.id));
      setMyConfirmation(null);
      toast.success('Presença cancelada');
    } catch (error) { toast.error('Erro ao cancelar'); }
    finally { setLoading(false); }
  };

  // ─────────────────────────────────────────────
  // CRUD
  // ─────────────────────────────────────────────

  const createBaba = async (babaData) => {
    setLoading(true);
    try {
      // ✅ FIX 1: sanitiza e normaliza game_days_config
      let clean = [];
      if (Array.isArray(babaData.game_days_config) && babaData.game_days_config.length > 0) {
        clean = sanitizeGameDaysConfig(babaData.game_days_config);
      }

      // ✅ FIX 2: payload estritamente alinhado com o schema da tabela `babas`
      // Campos que NÃO existem no banco são explicitamente excluídos.
      // `players_per_team` não existe — o campo real é `max_players`.
      const insert = {
        name:             babaData.name,
        modality:         babaData.modality         ?? 'society',
        location:         babaData.location         ?? null,
        // ✅ FIX 3: campo correto do banco (não players_per_team)
        max_players:      babaData.max_players       ?? null,
        game_days:        clean.map(c => c.day),
        game_days_config: clean,
        // ✅ FIX 4: game_time como 'HH:MM:SS' — tipo TIME do Postgres
        game_time:        clean[0]?.time ? `${clean[0].time}:00` : null,
        president_id:     user.id,
        is_private:       false,
        allow_reserves:   false,
        // ✅ FIX 5: invite_code gerado aqui, não depende de default do banco
        invite_code:      nanoid(),
      };

      console.log('[createBaba] insert payload:', insert);

      const { data, error } = await supabase
        .from('babas')
        .insert([insert])
        .select()
        .single();

      if (error) {
        console.error('[createBaba] Supabase error:', error);
        throw error;
      }

      // Insere o presidente como jogador do próprio baba
      const { error: playerError } = await supabase
        .from('players')
        .insert([{
          baba_id:  data.id,
          user_id:  user.id,
          name:     profile?.name || 'Presidente',
          position: 'linha',
        }]);

      if (playerError) {
        // Não fatal — loga mas não interrompe o fluxo
        console.warn('[createBaba] Erro ao inserir presidente como jogador:', playerError);
      }

      // Atualiza lista local sem precisar recarregar tudo do servidor
      setMyBabas(prev => [...prev, data]);
      setCurrentBaba(data);
      localStorage.setItem('selected_baba_id', String(data.id));

      return data;

    } catch (error) {
      console.error('[createBaba] falhou:', error?.message ?? error);
      toast.error(error?.message || 'Erro ao criar baba');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateBaba = async (babaId, updates) => {
    setLoading(true);
    try {
      const sanitized = { ...updates };
      if (Array.isArray(sanitized.game_days_config)) {
        const clean = sanitizeGameDaysConfig(sanitized.game_days_config);
        sanitized.game_days_config = clean;
        sanitized.game_days        = clean.map(c => c.day);
        // ✅ FIX: game_time como 'HH:MM:SS' — consistente com createBaba
        sanitized.game_time        = clean[0]?.time ? `${clean[0].time}:00` : null;
      }
      const { data, error } = await supabase
        .from('babas').update(sanitized).eq('id', babaId).select('*').single();
      if (error) throw error;
      setMyBabas(prev => prev.map(b => b.id === babaId ? { ...b, ...data } : b));
      if (currentBaba?.id === babaId) setCurrentBaba({ ...data });
      toast.success('Configurações salvas!');
      return data;
    } catch (error) {
      console.error('[updateBaba]', error);
      toast.error('Erro ao salvar');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteBaba = async (babaId) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('babas').delete().eq('id', babaId);
      if (error) throw error;
      const remaining = myBabas.filter(b => b.id !== babaId);
      setMyBabas(remaining);
      if (currentBaba?.id === babaId) {
        const next = remaining[0] || null;
        setCurrentBaba(next);
        if (next) localStorage.setItem('selected_baba_id', String(next.id));
        else localStorage.removeItem('selected_baba_id');
      }
      toast.success('Baba excluído');
      return true;
    } catch (error) {
      console.error('[deleteBaba]', error);
      toast.error('Erro ao excluir');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const joinBaba = async (inviteCode) => {
    setLoading(true);
    try {
      const code = inviteCode.trim().toUpperCase();

      const { data: baba, error: babaError } = await supabase
        .from('babas')
        .select('*')
        .eq('invite_code', code)
        .maybeSingle();

      if (babaError) throw babaError;
      if (!baba) throw new Error('Código inválido');

      if (baba.invite_expires_at && new Date(baba.invite_expires_at) < new Date()) {
        throw new Error('Código expirado');
      }

      const { error: insertError } = await supabase
        .from('players')
        .upsert(
          [{
            baba_id:  baba.id,
            user_id:  user.id,
            name:     profile?.name || 'Jogador',
            position: 'linha',
          }],
          { onConflict: 'baba_id,user_id' }
        );

      if (insertError) throw insertError;

      await loadMyBabas();
      setCurrentBaba(baba);
      toast.success('Entrou no Baba! 🎉');
      return baba;

    } catch (error) {
      console.error('[joinBaba]', error);
      toast.error(error.message || 'Erro ao entrar no baba');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const uploadBabaImage = async (file, type = 'avatar') => {
    if (!currentBaba || !file) return null;
    try {
      const ext  = file.name.split('.').pop()?.toLowerCase() || 'png';
      const path = `babas/${currentBaba.id}/${type}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('baba-images').upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('baba-images').getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      const field = type === 'avatar' ? 'logo_url' : 'cover_url';
      const { data: updatedBaba, error: updateError } = await supabase
        .from('babas').update({ [field]: publicUrl }).eq('id', currentBaba.id).select('*').single();
      if (updateError) throw updateError;
      setMyBabas(prev => prev.map(b => b.id === currentBaba.id ? { ...b, ...updatedBaba } : b));
      setCurrentBaba(prev => ({ ...prev, ...updatedBaba }));
      toast.success('Imagem atualizada!');
      return publicUrl;
    } catch (error) {
      toast.error('Erro no upload');
      return null;
    }
  };

  const generateInviteCode = async () => {
    if (!currentBaba) return null;
    try {
      let newCode;
      let attempts = 0;
      while (attempts < 10) {
        newCode = nanoid();
        const { data: exists } = await supabase
          .from('babas').select('id').eq('invite_code', newCode).maybeSingle();
        if (!exists) break;
        attempts++;
      }

      if (!newCode) {
        toast.error('Erro ao gerar código único');
        return null;
      }

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 6);

      const { data, error } = await supabase
        .from('babas')
        .update({ invite_code: newCode, invite_expires_at: expiresAt.toISOString() })
        .eq('id', currentBaba.id).select('*').single();

      if (error) throw error;

      setCurrentBaba(data);
      setMyBabas(prev => prev.map(b => b.id === data.id ? data : b));
      toast.success('Novo código gerado!');
      return data;
    } catch (error) {
      console.error('[generateInviteCode]', error);
      toast.error('Erro ao gerar código');
      return null;
    }
  };

  // ─────────────────────────────────────────────
  // SORTEIO
  // ─────────────────────────────────────────────

  const drawTeamsIntelligent = async () => {
    if (isDrawing || !currentBaba || !nextGameDay) return null;
    setIsDrawing(true);
    try {
      const dateStr   = nextGameDay.dateStr;
      const confirmed = gameConfirmations.map(c => c?.player).filter(p => p && p.id);

      if (confirmed.length < drawConfig.playersPerTeam * 2) {
        setDrawStatus('insufficient');
        return null;
      }

      const ratingsData = await getAllRatings();
      const ratingMap   = new Map(ratingsData.map(r => [r.player_id, r.final_rating || 0]));

      const enriched = confirmed.map(p => ({
        ...p,
        final_rating: ratingMap.get(p.id) || 0,
      }));

      const numTeams  = Math.max(2, Math.floor(confirmed.length / drawConfig.playersPerTeam));
      const teamsRaw  = generateBalancedTeams(enriched, numTeams);
      const teams     = teamsRaw.map(({ name, players }) => ({ name, players }));
      const teamSlots = drawConfig.playersPerTeam;
      const reserves  = teamsRaw.flatMap(t => t.players.slice(teamSlots));
      const mainTeams = teams.map(t => ({ ...t, players: t.players.slice(0, teamSlots) }));

      const { data: drawResult } = await supabase
        .from('draw_results')
        .upsert({
          baba_id: currentBaba.id, draw_date: dateStr,
          teams: mainTeams, reserves, players_per_team: drawConfig.playersPerTeam,
        })
        .select().single();

      const { data: existingMatch } = await supabase
        .from('matches').select('id')
        .eq('baba_id', currentBaba.id).eq('draw_result_id', drawResult.id).maybeSingle();

      if (!existingMatch) {
        const { data: match } = await supabase.from('matches').insert([{
          baba_id:        currentBaba.id,
          match_date:     `${dateStr}T${nextGameDay.time}:00`,
          team_a_name:    mainTeams[0]?.name || 'Time A',
          team_b_name:    mainTeams[1]?.name || 'Time B',
          draw_result_id: drawResult.id,
          status:         'scheduled',
        }]).select().single();

        const mPlayers = mainTeams.slice(0, 2).flatMap((t, i) =>
          t.players.map(p => ({
            match_id:  match.id,
            player_id: p.id,
            team:      i === 0 ? 'A' : 'B',
            position:  p.position || 'linha',
          }))
        );
        await supabase.from('match_players').insert(mPlayers);
      }

      await loadTodayMatch(currentBaba.id, dateStr);
      return true;
    } catch (error) {
      console.error('[drawTeams]', error);
      return null;
    } finally {
      setIsDrawing(false);
    }
  };

  const tryAutoDraw = async () => {
    if (!currentBaba || hasAutoDrawnRef.current || isDrawing || !nextGameDay) return;
    if (new Date() < nextGameDay.deadline) return;
    const { data: existing } = await supabase
      .from('draw_results').select('id')
      .eq('baba_id', currentBaba.id).eq('draw_date', nextGameDay.dateStr).maybeSingle();
    if (existing) { hasAutoDrawnRef.current = true; return; }
    if (gameConfirmations.length >= drawConfig.playersPerTeam * 2) {
      hasAutoDrawnRef.current = true;
      const res = await drawTeamsIntelligent();
      if (res) toast.success('Sorteio automático realizado!');
    } else {
      setDrawStatus('insufficient');
    }
  };

  // ─────────────────────────────────────────────
  // EFFECTS
  // ─────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      try {
        if (user) await loadMyBabas();
      } catch (e) {
        console.error('[INIT ERROR]', e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [user]);

  useEffect(() => {
    if (!currentBaba || !user) return;
    localStorage.setItem('selected_baba_id', String(currentBaba.id));
    hasAutoDrawnRef.current = false;

    const syncData = async () => {
      const playersData = await loadPlayers(currentBaba.id);
      const next        = getNextGameDay(currentBaba);
      setNextGameDay(next);

      if (next) {
        setConfirmationDeadline(next.deadline);
        setCanConfirm(new Date() < next.deadline);
        const { data: c } = await supabase
          .from('game_confirmations')
          .select('*, player:players(*)')
          .eq('baba_id', currentBaba.id)
          .eq('game_date', next.dateStr);
        const confirmations = c || [];
        setGameConfirmations(confirmations);
        const myP = playersData.find(p => p.user_id === user.id);
        setMyConfirmation(myP ? confirmations.find(conf => conf.player_id === myP.id) || null : null);
        await loadTodayMatch(currentBaba.id, next.dateStr);
      } else {
        setGameConfirmations([]);
        setMyConfirmation(null);
        setConfirmationDeadline(null);
      }
    };
    syncData();
  }, [currentBaba?.id, user?.id]);

  useEffect(() => {
    let timeoutId;
    const update = () => {
      if (!nextGameDay?.date) {
        setCountdown({ d: 0, h: 0, m: 0, s: 0, active: false });
        return;
      }
      const diff = new Date(nextGameDay.date) - Date.now();
      if (diff <= 0) {
        setCountdown(prev => prev.active ? { d: 0, h: 0, m: 0, s: 0, active: false } : prev);
        return;
      }
      const totalSeconds = Math.floor(diff / 1000);
      setCountdown({
        d:      Math.floor(totalSeconds / 86400),
        h:      Math.floor((totalSeconds % 86400) / 3600),
        m:      Math.floor((totalSeconds % 3600) / 60),
        s:      totalSeconds % 60,
        active: true,
      });
      timeoutId = setTimeout(update, 1000 - (Date.now() % 1000));
    };
    update();
    return () => clearTimeout(timeoutId);
  }, [nextGameDay?.dateStr]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (nextGameDay) {
        setCanConfirm(new Date() < nextGameDay.deadline);
        if (drawStatus === 'waiting' && !isDrawing) tryAutoDraw();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [nextGameDay?.dateStr, gameConfirmations.length, drawStatus, isDrawing]);

  // ─────────────────────────────────────────────
  // PROVIDER VALUE
  // ─────────────────────────────────────────────

  return (
    <BabaContext.Provider value={{
      myBabas, currentBaba, setCurrentBaba, players, loading,
      createBaba, joinBaba, updateBaba, deleteBaba, uploadBabaImage, generateInviteCode,
      gameConfirmations, myConfirmation, canConfirm, confirmationDeadline, nextGameDay,
      countdown, currentMatch, matchPlayers, isDrawing, drawStatus,
      drawTeamsIntelligent, drawConfig, setDrawConfig,
      confirmPresence, cancelConfirmation,
      ratePlayer, getAllRatings, setManualWeight,
      generateBalancedTeams,
    }}>
      {children}
    </BabaContext.Provider>
  );
};

export const useBaba = () => useContext(BabaContext);
