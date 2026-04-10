import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const BabaContext = createContext();

// ─────────────────────────────────────────────
// HELPERS PUROS
// ─────────────────────────────────────────────

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
  } else if (Array.isArray(baba.game_days) && baba.game_days.length > 0 && baba.game_time) {
    configs = baba.game_days.map(d => ({ 
      day: Number(d), 
      time: baba.game_time.substring(0, 5), 
      location: '' 
    })).sort((a, b) => a.day - b.day);
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
      return { ...match, date: gameDate, deadline, daysAhead: offset };
    }
  }

  const first = configs[0];
  const daysAhead = ((first.day - todayDow + 7) % 7) || 7;
  const gameDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysAhead);
  const [h, m] = first.time.split(':').map(Number);
  gameDate.setHours(h, m, 0, 0);
  
  return { ...first, date: gameDate, deadline: new Date(gameDate.getTime() - 30 * 60 * 1000), daysAhead };
};

// ─────────────────────────────────────────────
// PROVIDER
// ─────────────────────────────────────────────

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

  const [drawConfig, setDrawConfig] = useState({ playersPerTeam: 5, strategy: 'reserve' });
  const [currentMatch, setCurrentMatch] = useState(null);
  const [matchPlayers, setMatchPlayers] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);

  const hasAutoDrawnRef = useRef(false);

  const calculateDeadline = (baba) => {
    const next = getNextGameDay(baba);
    return next?.deadline || null;
  };

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

      if (!currentBaba && unique.length > 0) {
        const savedId = localStorage.getItem('selected_baba_id');
        const saved = savedId ? unique.find(b => String(b.id) === savedId) : null;
        setCurrentBaba(saved || unique[0]);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const loadPlayers = async (babaId) => {
    const { data } = await supabase.from('players').select('*').eq('baba_id', babaId).order('name');
    setPlayers(data || []);
  };

  const loadGameConfirmations = async (babaId) => {
    if (!players.length || !user) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase.from('game_confirmations').select(`*, player:players(*)`).eq('baba_id', babaId).eq('game_date', today);
      const confirmations = data || [];
      setGameConfirmations(confirmations);
      const myP = players.find(p => p.user_id === user.id);
      if (myP) setMyConfirmation(confirmations.find(c => c.player_id === myP.id) || null);
    } catch (error) {
      console.error(error);
    }
  };

  const loadTodayMatch = async (babaId) => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase.from('matches')
      .select('*')
      .eq('baba_id', babaId)
      .gte('match_date', `${today}T00:00:00`)
      .lte('match_date', `${today}T23:59:59`)
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setCurrentMatch(data);
      loadMatchPlayers(data.id);
    } else {
      setCurrentMatch(null);
      setMatchPlayers([]);
    }
  };

  const loadMatchPlayers = async (matchId) => {
    const { data } = await supabase.from('match_players').select(`*, player:players(*)`).eq('match_id', matchId).order('team');
    setMatchPlayers(data || []);
  };

  const createBaba = async (babaData) => {
    setLoading(true);
    try {
      const sanitized = { ...babaData };
      if (Array.isArray(sanitized.game_days_config)) {
        const clean = sanitizeGameDaysConfig(sanitized.game_days_config);
        sanitized.game_days_config = clean;
        sanitized.game_time = clean[0]?.time || '20:00';
      }
      const { data, error } = await supabase.from('babas').insert([{ ...sanitized, president_id: user.id }]).select().single();
      if (error) throw error;
      await supabase.from('players').insert([{ baba_id: data.id, user_id: user.id, name: profile?.name || 'Presidente', position: 'linha' }]);
      await loadMyBabas();
      setCurrentBaba(data);
      return data;
    } catch (error) {
      toast.error('Erro ao criar baba');
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
        sanitized.game_days = [];
        sanitized.game_time = clean[0]?.time || '20:00';
      }
      const { data, error } = await supabase.from('babas').update(sanitized).eq('id', babaId).select().single();
      if (error) throw error;
      setMyBabas(prev => prev.map(b => b.id === babaId ? data : b));
      if (currentBaba?.id === babaId) {
        setCurrentBaba(data);
        setNextGameDay(getNextGameDay(data));
      }
      return data;
    } catch (error) {
      toast.error('Erro ao atualizar');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteBaba = async (babaId) => {
    try {
      const { error } = await supabase.from('babas').delete().eq('id', babaId);
      if (error) throw error;
      if (currentBaba?.id === babaId) {
        setCurrentBaba(null);
        localStorage.removeItem('selected_baba_id');
      }
      await loadMyBabas();
      return true;
    } catch (error) {
      toast.error('Erro ao excluir baba');
      return false;
    }
  };

  const joinBaba = async (inviteCode) => {
    setLoading(true);
    try {
      const code = inviteCode.trim().toUpperCase();
      const { data: baba, error: fetchError } = await supabase.from('babas').select('*').eq('invite_code', code).maybeSingle();
      if (fetchError || !baba) throw new Error('Código inválido');
      await supabase.from('players').upsert([{ baba_id: baba.id, user_id: user.id, name: profile?.name || 'Jogador', position: 'linha' }]);
      await loadMyBabas();
      setCurrentBaba(baba);
      return baba;
    } catch (error) {
      toast.error(error.message || 'Erro ao entrar no baba');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const generateInviteCode = async () => {
    if (!currentBaba) return null;
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const expires = new Date();
      expires.setHours(expires.getHours() + 24);
      const { error } = await supabase.from('babas').update({ invite_code: code, invite_expires_at: expires.toISOString() }).eq('id', currentBaba.id);
      if (error) throw error;
      const updated = { ...currentBaba, invite_code: code, invite_expires_at: expires.toISOString() };
      setCurrentBaba(updated);
      return code;
    } catch (error) {
      toast.error('Erro ao gerar código');
      return null;
    }
  };

  const uploadBabaImage = async (file, type = 'avatar') => {
    if (!currentBaba || !file) return null;
    try {
      const ext = file.name.split('.').pop();
      const path = `babas/${currentBaba.id}/${type}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('baba-images').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('baba-images').getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      const field = type === 'avatar' ? 'avatar_url' : 'cover_url';
      const { error: updateError } = await supabase.from('babas').update({ [field]: publicUrl }).eq('id', currentBaba.id);
      if (updateError) throw updateError;
      setMyBabas(prev => prev.map(b => b.id === currentBaba.id ? { ...b, [field]: publicUrl } : b));
      setCurrentBaba(prev => ({ ...prev, [field]: publicUrl }));
      return publicUrl;
    } catch (error) {
      toast.error('Erro no upload da imagem');
      return null;
    }
  };

  const confirmPresence = async () => {
    const myP = players.find(p => p.user_id === user?.id);
    if (!myP) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase.from('game_confirmations').upsert([{ 
        baba_id: currentBaba.id, 
        player_id: myP.id, 
        game_date: today 
      }], { onConflict: 'baba_id,player_id,game_date' }).select(`*, player:players(*)`).single();
      if (error) throw error;
      setMyConfirmation(data);
      await loadGameConfirmations(currentBaba.id);
    } catch (error) {
      toast.error('Erro ao confirmar presença');
    }
  };

  const cancelConfirmation = async () => {
    if (!myConfirmation) return;
    try {
      const { error } = await supabase.from('game_confirmations').delete().eq('id', myConfirmation.id);
      if (error) throw error;
      setMyConfirmation(null);
      await loadGameConfirmations(currentBaba.id);
    } catch (error) {
      toast.error('Erro ao cancelar confirmação');
    }
  };

  const drawTeamsIntelligent = async () => {
    if (isDrawing || !currentBaba || !gameConfirmations.length) return null;
    setIsDrawing(true);
    try {
      const nextGame = getNextGameDay(currentBaba);
      if (!nextGame) throw new Error('Nenhum dia de jogo configurado');
      const schedDate = new Date();
      schedDate.setDate(schedDate.getDate() + (nextGame?.daysAhead || 0));
      const dateStr = schedDate.toISOString().split('T')[0];
      const gameTimeStr = nextGame?.time || '20:00';

      const confirmed = gameConfirmations.map(c => c.player).filter(Boolean);
      let goalies = confirmed.filter(p => p.position === 'goleiro').sort(() => Math.random() - 0.5);
      let outfield = confirmed.filter(p => p.position !== 'goleiro').sort(() => Math.random() - 0.5);

      const numTeams = drawConfig.strategy === 'reserve' ? Math.floor(confirmed.length / drawConfig.playersPerTeam) : Math.ceil(confirmed.length / drawConfig.playersPerTeam);
      const teams = Array.from({ length: Math.max(2, numTeams) }, (_, i) => ({ name: `Time ${String.fromCharCode(65 + i)}`, players: [] }));
      for (let i = 0; i < teams.length && goalies.length > 0; i++) teams[i].players.push(goalies.shift());
      let remaining = [...outfield, ...goalies];
      let tIdx = 0;
      while (remaining.length > 0) {
        if (drawConfig.strategy === 'reserve' && teams.every(t => t.players.length >= drawConfig.playersPerTeam)) break;
        if (teams[tIdx].players.length < drawConfig.playersPerTeam) teams[tIdx].players.push(remaining.shift());
        tIdx = (tIdx + 1) % teams.length;
      }

      const { data: drawResult, error: drawError } = await supabase.from('draw_results').upsert({ 
        baba_id: currentBaba.id, 
        draw_date: dateStr, 
        teams, 
        reserves: remaining, 
        players_per_team: drawConfig.playersPerTeam 
      }, { onConflict: 'baba_id,draw_date' }).select().single();
      if (drawError || !drawResult) throw new Error('Erro ao salvar sorteio');
      
      await supabase.from('matches').delete()
        .eq('baba_id', currentBaba.id)
        .gte('match_date', `${dateStr}T00:00:00`)
        .lte('match_date', `${dateStr}T23:59:59`)
        .neq('status', 'finished');

      const { data: match, error: matchError } = await supabase.from('matches').insert([{ 
        baba_id: currentBaba.id, 
        match_date: `${dateStr}T${gameTimeStr}:00`, 
        team_a_name: teams[0].name, 
        team_b_name: teams[1].name, 
        draw_result_id: drawResult.id, 
        status: 'scheduled' 
      }]).select().single();
      if (matchError) throw matchError;
      
      const mPlayers = teams.slice(0, 2).flatMap((t, i) => t.players.map(p => ({ 
        match_id: match.id, 
        player_id: p.id, 
        team: i === 0 ? 'A' : 'B', 
        position: p.position || 'linha' 
      })));
      await supabase.from('match_players').insert(mPlayers);

      setCurrentMatch(match);
      await loadMatchPlayers(match.id);
      return { match, teams, reserves: remaining };
    } catch (error) {
      console.error(error);
      return null;
    } finally {
      setIsDrawing(false);
    }
  };

  const manualDraw = async () => {
    hasAutoDrawnRef.current = false;
    const res = await drawTeamsIntelligent();
    if (res) toast.success('Sorteio realizado!');
    return res;
  };

  // 🔥 SISTEMA DE AUTO-SORTEIO
  const tryAutoDraw = async () => {
    if (!currentBaba || hasAutoDrawnRef.current || isDrawing) return;

    try {
      const now = new Date();
      const deadline = calculateDeadline(currentBaba);
      if (!deadline || now < deadline) return;

      const nextGame = getNextGameDay(currentBaba);
      if (!nextGame) return;
      const dateStr = nextGame.date.toISOString().split('T')[0];

      // Proteção de banco: verifica se já existe sorteio para a data do jogo
      const { data: existingDraw } = await supabase
        .from('draw_results')
        .select('id')
        .eq('baba_id', currentBaba.id)
        .eq('draw_date', dateStr)
        .maybeSingle();

      if (existingDraw) {
        hasAutoDrawnRef.current = true;
        return;
      }

      // Só sorteia se houver o mínimo para 2 times
      if (gameConfirmations.length < drawConfig.playersPerTeam * 2) return;

      console.log('🔥 Executando Auto Sorteio...');
      hasAutoDrawnRef.current = true;
      const result = await drawTeamsIntelligent();
      if (result) toast.success('Sorteio automático realizado!');

    } catch (error) {
      console.error('Erro no auto draw:', error);
    }
  };

  useEffect(() => {
    if (user) loadMyBabas().finally(() => setLoading(false));
    else setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!currentBaba) return;
    localStorage.setItem('selected_baba_id', String(currentBaba.id));
    hasAutoDrawnRef.current = false;
    loadPlayers(currentBaba.id);
    loadTodayMatch(currentBaba.id);
    setNextGameDay(getNextGameDay(currentBaba));
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
    const interval = setInterval(() => setCanConfirm(new Date() < confirmationDeadline), 60000);
    return () => clearInterval(interval);
  }, [confirmationDeadline]);

  // Watcher do Auto Sorteio
  useEffect(() => {
    if (!currentBaba || !players.length) return;
    const interval = setInterval(() => {
      tryAutoDraw();
    }, 30000); 
    return () => clearInterval(interval);
  }, [currentBaba, players, gameConfirmations]);

  return (
    <BabaContext.Provider value={{
      myBabas, currentBaba, setCurrentBaba, players, loading,
      createBaba, joinBaba, updateBaba, deleteBaba, loadMyBabas,
      generateInviteCode, uploadBabaImage,
      gameConfirmations, myConfirmation, canConfirm, confirmationDeadline, nextGameDay,
      confirmPresence, cancelConfirmation,
      currentMatch, matchPlayers, isDrawing,
      drawTeamsIntelligent, manualDraw, drawConfig, setDrawConfig,
      loadTodayMatch, loadMatchPlayers,
      calculateDeadline, sanitizeGameDaysConfig, getNextGameDay, hasAutoDrawnRef
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
