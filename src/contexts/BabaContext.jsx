import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const BabaContext = createContext();

// --- HELPERS (ORIGINAIS) ---
export const sanitizeGameDaysConfig = (raw) => {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const seen = new Set();
  return raw
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      day: Number(item.day),
      time: String(item.time || '').trim(),
      location: item.location ? String(item.location).trim() : '',
    }))
    .filter((item) => {
      if (!Number.isInteger(item.day) || item.day < 0 || item.day > 6) return false;
      const timeMatch = item.time.match(/^(\d{1,2}):(\d{2})$/);
      if (!timeMatch) return false;
      const h = Number(timeMatch[1]), m = Number(timeMatch[2]);
      if (h < 0 || h > 23 || m < 0 || m > 59) return false;
      if (seen.has(item.day)) return false;
      seen.add(item.day);
      return true;
    })
    .map((item) => ({
      day: item.day,
      time: item.time.padStart(5, '0').substring(0, 5),
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

export const BabaProvider = ({ children }) => {
  const { user, profile } = useAuth();
  const [myBabas, setMyBabas] = useState([]);
  const [currentBaba, setCurrentBaba] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [gameConfirmations, setGameConfirmations] = useState([]);
  const [myConfirmation, setMyConfirmation] = useState(null);
  const [confirmationDeadline, setConfirmationDeadline] = useState(null);
  const [canConfirm, setCanConfirm] = useState(false);
  const [nextGameDay, setNextGameDay] = useState(null);

  const [countdown, setCountdown] = useState({ d: 0, h: 0, m: 0, s: 0, active: false });

  const [drawConfig, setDrawConfig] = useState({ playersPerTeam: 5, strategy: 'reserve' });
  const [currentMatch, setCurrentMatch] = useState(null);
  const [matchPlayers, setMatchPlayers] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStatus, setDrawStatus] = useState('waiting');

  const hasAutoDrawnRef = useRef(false);

  // --- CARREGAMENTO ---
  const loadMyBabas = async () => {
    if (!user) return;
    try {
      const { data: presidentBabas } = await supabase.from('babas').select('*').eq('president_id', user.id);
      const { data: playerRows } = await supabase.from('players').select('baba_id').eq('user_id', user.id);

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
        const saved = savedId ? unique.find(b => String(b.id) === savedId) : null;
        setCurrentBaba(saved || unique[0]);
      }
    } catch (error) { 
        console.error('[loadMyBabas]', error);
        throw error; // Repassa para o init tratar
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
      avatar_url: p.profile?.avatar_url || null,
      display_name: p.name || p.profile?.name || 'Jogador',
    }));
    setPlayers(normalized);
    return normalized;
  };

  const loadTodayMatch = async (babaId, dateStr) => {
    try {
      const { data: draw } = await supabase.from('draw_results').select('id').eq('baba_id', babaId).eq('draw_date', dateStr).maybeSingle();
      if (!draw) { setCurrentMatch(null); setMatchPlayers([]); return; }
      const { data: match } = await supabase.from('matches').select('*').eq('baba_id', babaId).eq('draw_result_id', draw.id).maybeSingle();
      if (match) {
        setCurrentMatch(match);
        const { data: mp } = await supabase.from('match_players').select('*, player:players(*, profile:profiles(avatar_url))').eq('match_id', match.id).order('team');
        setMatchPlayers(mp || []);
        setDrawStatus('ready');
      }
    } catch (e) { console.error('[loadTodayMatch]', e); }
  };

  const confirmPresence = async () => {
    if (!currentBaba || !user || !nextGameDay) return;
    setLoading(true);
    try {
      const myPlayer = players.find(p => p.user_id === user.id);
      if (!myPlayer) throw new Error('Jogador não encontrado');
      const { data, error } = await supabase.from('game_confirmations').insert([{ baba_id: currentBaba.id, player_id: myPlayer.id, game_date: nextGameDay.dateStr }]).select('*, player:players(*)').single();
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

  // --- CRUD (ORIGINAIS) ---
  const createBaba = async (babaData) => {
    setLoading(true);
    try {
      const sanitized = { ...babaData };
      if (Array.isArray(sanitized.game_days_config)) {
        const clean = sanitizeGameDaysConfig(sanitized.game_days_config);
        sanitized.game_days_config = clean;
        sanitized.game_days = clean.map(c => c.day);
        sanitized.game_time = clean[0]?.time || '20:00';
      }
      const { data, error } = await supabase.from('babas').insert([{ ...sanitized, president_id: user.id }]).select().single();
      if (error) throw error;
      await supabase.from('players').insert([{ baba_id: data.id, user_id: user.id, name: profile?.name || 'Presidente', position: 'linha' }]);
      await loadMyBabas();
      setCurrentBaba(data);
      return data;
    } catch (error) { toast.error('Erro ao criar baba'); return null; }
    finally { setLoading(false); }
  };

  const updateBaba = async (babaId, updates) => {
    setLoading(true);
    try {
      const sanitized = { ...updates };
      if (Array.isArray(sanitized.game_days_config)) {
        const clean = sanitizeGameDaysConfig(sanitized.game_days_config);
        sanitized.game_days_config = clean;
        sanitized.game_days = clean.map(c => c.day);
        sanitized.game_time = clean[0]?.time || '20:00';
      }
      const { data, error } = await supabase.from('babas').update(sanitized).eq('id', babaId).select('*').single();
      if (error) throw error;
      setMyBabas(prev => prev.map(b => b.id === babaId ? { ...b, ...data } : b));
      if (currentBaba?.id === babaId) setCurrentBaba({ ...data });
      toast.success('Configurações salvas!');
      return data;
    } catch (error) { toast.error('Erro ao salvar'); return null; }
    finally { setLoading(false); }
  };

  const joinBaba = async (inviteCode) => {
    setLoading(true);
    try {
      const code = inviteCode.trim().toUpperCase();
      const { data: baba } = await supabase.from('babas').select('*').eq('invite_code', code).maybeSingle();
      if (!baba) throw new Error('Código inválido');
      await supabase.from('players').upsert([{ baba_id: baba.id, user_id: user.id, name: profile?.name || 'Jogador', position: 'linha' }]);
      await loadMyBabas();
      setCurrentBaba(baba);
      toast.success('Entrou no Baba!');
      return baba;
    } catch (error) { toast.error(error.message); return null; }
    finally { setLoading(false); }
  };

  const uploadBabaImage = async (file, type = 'avatar') => {
    if (!currentBaba || !file) return null;
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const path = `babas/${currentBaba.id}/${type}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('baba-images').upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('baba-images').getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      const field = type === 'avatar' ? 'logo_url' : 'cover_url';
      const { data: updatedBaba, error: updateError } = await supabase.from('babas').update({ [field]: publicUrl }).eq('id', currentBaba.id).select('*').single();
      if (updateError) throw updateError;
      setMyBabas(prev => prev.map(b => b.id === currentBaba.id ? { ...b, ...updatedBaba } : b));
      setCurrentBaba(prev => ({ ...prev, ...updatedBaba }));
      toast.success('Imagem atualizada!');
      return publicUrl;
    } catch (error) { toast.error('Erro no upload'); return null; }
  };

  const generateInviteCode = async () => {
    if (!currentBaba) return;
    try {
      const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      const { data, error } = await supabase.from('babas').update({ invite_code: newCode, invite_expires_at: expiresAt.toISOString() }).eq('id', currentBaba.id).select('*').single();
      if (error) throw error;
      setCurrentBaba(data);
      setMyBabas(prev => prev.map(b => b.id === data.id ? data : b));
      toast.success('Novo código gerado!');
    } catch (error) { toast.error('Erro ao gerar código'); }
  };

  // --- SORTEIO (FIX: BLINDAGEM DE MAP) ---
  const drawTeamsIntelligent = async () => {
    if (isDrawing || !currentBaba || !nextGameDay) return null;
    setIsDrawing(true);
    try {
      const dateStr = nextGameDay.dateStr;
      // ✅ SOLUÇÃO 2: Blindagem no map e filter
      const confirmed = gameConfirmations
        .map(c => c?.player)
        .filter(p => p && p.id);

      if (confirmed.length < (drawConfig.playersPerTeam * 2)) { setDrawStatus('insufficient'); return null; }
      let goalies = confirmed.filter(p => p.position === 'goleiro').sort(() => Math.random() - 0.5);
      let outfield = confirmed.filter(p => p.position !== 'goleiro').sort(() => Math.random() - 0.5);
      const numTeams = Math.floor(confirmed.length / drawConfig.playersPerTeam);
      const teams = Array.from({ length: Math.max(2, numTeams) }, (_, i) => ({ name: `Time ${String.fromCharCode(65 + i)}`, players: [] }));
      for (let i = 0; i < teams.length && goalies.length > 0; i++) teams[i].players.push(goalies.shift());
      let remaining = [...outfield, ...goalies];
      let tIdx = 0;
      while (remaining.length > 0) {
        if (teams[tIdx].players.length < drawConfig.playersPerTeam) teams[tIdx].players.push(remaining.shift());
        tIdx = (tIdx + 1) % teams.length;
        if (teams.every(t => t.players.length >= drawConfig.playersPerTeam)) break;
      }
      const { data: drawResult } = await supabase.from('draw_results').upsert({ baba_id: currentBaba.id, draw_date: dateStr, teams, reserves: remaining, players_per_team: drawConfig.playersPerTeam }).select().single();
      const { data: existingMatch } = await supabase.from('matches').select('id').eq('baba_id', currentBaba.id).eq('draw_result_id', drawResult.id).maybeSingle();
      if (!existingMatch) {
        const { data: match } = await supabase.from('matches').insert([{ baba_id: currentBaba.id, match_date: `${dateStr}T${nextGameDay.time}:00`, team_a_name: teams[0].name, team_b_name: teams[1].name, draw_result_id: drawResult.id, status: 'scheduled' }]).select().single();
        const mPlayers = teams.slice(0, 2).flatMap((t, i) => t.players.map(p => ({ match_id: match.id, player_id: p.id, team: i === 0 ? 'A' : 'B', position: p.position || 'linha' })));
        await supabase.from('match_players').insert(mPlayers);
      }
      await loadTodayMatch(currentBaba.id, dateStr);
      return true;
    } catch (error) { console.error('[drawTeams]', error); return null; }
    finally { setIsDrawing(false); }
  };

  const tryAutoDraw = async () => {
    if (!currentBaba || hasAutoDrawnRef.current || isDrawing || !nextGameDay) return;
    if (new Date() < nextGameDay.deadline) return;
    const { data: existing } = await supabase.from('draw_results').select('id').eq('baba_id', currentBaba.id).eq('draw_date', nextGameDay.dateStr).maybeSingle();
    if (existing) { hasAutoDrawnRef.current = true; return; }
    if (gameConfirmations.length >= drawConfig.playersPerTeam * 2) {
      hasAutoDrawnRef.current = true;
      const res = await drawTeamsIntelligent();
      if (res) toast.success('Sorteio automático realizado!');
    } else { setDrawStatus('insufficient'); }
  };

  // ✅ 1. INIT COM TRATAMENTO DE ERRO (SOLUÇÃO 1 e 4)
  useEffect(() => {
    const init = async () => {
      try {
        if (user) {
          await loadMyBabas();
        }
      } catch (e) {
        console.error('[INIT ERROR]', e);
      } finally {
        setLoading(false); // ✅ Garante que o loading saia SEMPRE
      }
    };
    init();
  }, [user]); // ✅ Depende do objeto user inteiro para garantir re-trigger

  // ✅ 2. SINCRONIZAÇÃO (SOLUÇÃO 5)
  useEffect(() => {
    if (!currentBaba || !user) return;
    localStorage.setItem('selected_baba_id', String(currentBaba.id));
    hasAutoDrawnRef.current = false;

    const syncData = async () => {
      const playersData = await loadPlayers(currentBaba.id);
      const next = getNextGameDay(currentBaba);
      setNextGameDay(next);

      if (next) {
        setConfirmationDeadline(next.deadline);
        setCanConfirm(new Date() < next.deadline);
        const { data: c } = await supabase.from('game_confirmations').select('*, player:players(*)').eq('baba_id', currentBaba.id).eq('game_date', next.dateStr);
        const confirmations = c || [];
        setGameConfirmations(confirmations);
        const myP = playersData.find(p => p.user_id === user.id);
        setMyConfirmation(myP ? confirmations.find(conf => conf.player_id === myP.id) || null : null);
        await loadTodayMatch(currentBaba.id, next.dateStr);
      } else {
        // ✅ Reset se não houver próximo jogo
        setGameConfirmations([]);
        setMyConfirmation(null);
        setConfirmationDeadline(null);
      }
    };
    syncData();
  }, [currentBaba?.id, user?.id]);

  // ✅ 3. CRONÔMETRO (SOLUÇÃO 3)
  useEffect(() => {
    let timeoutId;
    const update = () => {
      if (!nextGameDay?.date) {
        setCountdown({ d: 0, h: 0, m: 0, s: 0, active: false });
        return;
      }
      const now = new Date();
      const diff = new Date(nextGameDay.date) - now;
      if (diff <= 0) {
        setCountdown(prev => prev.active ? { d: 0, h: 0, m: 0, s: 0, active: false } : prev);
        return;
      }
      const totalSeconds = Math.floor(diff / 1000);
      setCountdown({
        d: Math.floor(totalSeconds / (60 * 60 * 24)),
        h: Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60)),
        m: Math.floor((totalSeconds % (60 * 60)) / 60),
        s: totalSeconds % 60,
        active: true
      });
      const delay = 1000 - (Date.now() % 1000);
      timeoutId = setTimeout(update, delay);
    };
    update();
    return () => clearTimeout(timeoutId);
  }, [nextGameDay?.dateStr]);

  // ✅ 4. INTERVALO AUTO-DRAW
  useEffect(() => {
    const interval = setInterval(() => {
      if (nextGameDay) {
        setCanConfirm(new Date() < nextGameDay.deadline);
        if (drawStatus === 'waiting' && !isDrawing) {
          tryAutoDraw();
        }
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [nextGameDay?.dateStr, gameConfirmations.length, drawStatus, isDrawing]);

  return (
    <BabaContext.Provider value={{
      myBabas, currentBaba, setCurrentBaba, players, loading,
      createBaba, joinBaba, updateBaba, uploadBabaImage, generateInviteCode,
      gameConfirmations, myConfirmation, canConfirm, confirmationDeadline, nextGameDay,
      countdown, currentMatch, matchPlayers, isDrawing, drawStatus,
      drawTeamsIntelligent, drawConfig, setDrawConfig,
      confirmPresence, cancelConfirmation
    }}>
      {children}
    </BabaContext.Provider>
  );
};

export const useBaba = () => useContext(BabaContext);
