import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const BabaContext = createContext();

// ─────────────────────────────────────────────
// HELPERS PUROS (Sua lógica de sanitização e datas)
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
      day: Number(d), time: baba.game_time.substring(0, 5), location: '' 
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

    // Se ainda não passou do deadline, esse é o jogo
    if (now < deadline) {
      return { ...match, date: gameDate, deadline, daysAhead: offset, dateStr: gameDate.toISOString().split('T')[0] };
    }
  }
  // Se já passou de todos da semana, pega o primeiro da próxima semana
  const first = configs[0];
  const daysAhead = ((first.day - todayDow + 7) % 7) || 7;
  const gameDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysAhead);
  const [h, m] = first.time.split(':').map(Number);
  gameDate.setHours(h, m, 0, 0);
  return { ...first, date: gameDate, deadline: new Date(gameDate.getTime() - 30 * 60 * 1000), daysAhead, dateStr: gameDate.toISOString().split('T')[0] };
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
  const [drawStatus, setDrawStatus] = useState('waiting');

  const hasAutoDrawnRef = useRef(false);

  // ─────────────────────────────────────────────
  // CARREGAMENTO (LOADERS)
  // ─────────────────────────────────────────────

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
    } catch (error) { console.error(error); }
  };

  const loadPlayers = async (babaId) => {
    const { data } = await supabase.from('players').select('*').eq('baba_id', babaId).order('name');
    setPlayers(data || []);
  };

  const loadTodayMatch = async (babaId, dateStr) => {
    try {
      const { data: draw } = await supabase.from('draw_results')
        .select('id').eq('baba_id', babaId).eq('draw_date', dateStr).maybeSingle();

      if (!draw) {
        setCurrentMatch(null);
        setMatchPlayers([]);
        return;
      }

      const { data: match } = await supabase.from('matches')
        .select('*').eq('baba_id', babaId).eq('draw_result_id', draw.id).maybeSingle();

      if (match) {
        setCurrentMatch(match);
        const { data: mp } = await supabase.from('match_players').select(`*, player:players(*)`).eq('match_id', match.id).order('team');
        setMatchPlayers(mp || []);
        setDrawStatus('ready');
      }
    } catch (e) { console.error(e); }
  };

  // ─────────────────────────────────────────────
  // CRUD E GESTÃO (Seu código completo reintegrado)
  // ─────────────────────────────────────────────

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
        sanitized.game_days = [];
        sanitized.game_time = clean[0]?.time || '20:00';
      }
      const { data, error } = await supabase.from('babas').update(sanitized).eq('id', babaId).select().single();
      if (error) throw error;
      setMyBabas(prev => prev.map(b => b.id === babaId ? data : b));
      if (currentBaba?.id === babaId) setCurrentBaba(data);
      return data;
    } catch (error) { toast.error('Erro ao atualizar'); return null; }
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
      const field = type === 'avatar' ? 'avatar_url' : 'cover_url';
      
      await supabase.from('babas').update({ [field]: publicUrl }).eq('id', currentBaba.id);
      setMyBabas(prev => prev.map(b => b.id === currentBaba.id ? { ...b, [field]: publicUrl } : b));
      setCurrentBaba(prev => ({ ...prev, [field]: publicUrl }));
      toast.success('Imagem atualizada!');
      return publicUrl;
    } catch (error) { toast.error('Erro no upload'); return null; }
  };

  // ─────────────────────────────────────────────
  // SORTEIO E AUTO-DRAW (Segurança Máxima)
  // ─────────────────────────────────────────────

  const drawTeamsIntelligent = async () => {
    if (isDrawing || !currentBaba || !nextGameDay) return null;
    setIsDrawing(true);
    try {
      const dateStr = nextGameDay.dateStr;
      const confirmed = gameConfirmations.map(c => c.player).filter(Boolean);
      
      if (confirmed.length < (drawConfig.playersPerTeam * 2)) {
        setDrawStatus('insufficient');
        return null;
      }

      let goalies = confirmed.filter(p => p.position === 'goleiro').sort(() => Math.random() - 0.5);
      let outfield = confirmed.filter(p => p.position !== 'goleiro').sort(() => Math.random() - 0.5);

      const numTeams = Math.floor(confirmed.length / drawConfig.playersPerTeam);
      const teams = Array.from({ length: Math.max(2, numTeams) }, (_, i) => ({ 
        name: `Time ${String.fromCharCode(65 + i)}`, players: [] 
      }));
      
      for (let i = 0; i < teams.length && goalies.length > 0; i++) teams[i].players.push(goalies.shift());
      let remaining = [...outfield, ...goalies];
      let tIdx = 0;
      while (remaining.length > 0) {
        if (teams[tIdx].players.length < drawConfig.playersPerTeam) teams[tIdx].players.push(remaining.shift());
        tIdx = (tIdx + 1) % teams.length;
        if (teams.every(t => t.players.length >= drawConfig.playersPerTeam)) break;
      }

      const { data: drawResult } = await supabase.from('draw_results').upsert({ 
        baba_id: currentBaba.id, draw_date: dateStr, teams, reserves: remaining, players_per_team: drawConfig.playersPerTeam 
      }).select().single();
      
      const { data: existingMatch } = await supabase.from('matches').select('id').eq('baba_id', currentBaba.id).eq('draw_result_id', drawResult.id).maybeSingle();

      if (!existingMatch) {
        const { data: match } = await supabase.from('matches').insert([{ 
          baba_id: currentBaba.id, match_date: `${dateStr}T${nextGameDay.time}:00`, 
          team_a_name: teams[0].name, team_b_name: teams[1].name, draw_result_id: drawResult.id, status: 'scheduled' 
        }]).select().single();

        const mPlayers = teams.slice(0, 2).flatMap((t, i) => t.players.map(p => ({ 
          match_id: match.id, player_id: p.id, team: i === 0 ? 'A' : 'B', position: p.position || 'linha' 
        })));
        await supabase.from('match_players').insert(mPlayers);
      }

      await loadTodayMatch(currentBaba.id, dateStr);
      return true;
    } catch (error) { console.error(error); return null; }
    finally { setIsDrawing(false); }
  };

  const tryAutoDraw = async () => {
    if (!currentBaba || hasAutoDrawnRef.current || isDrawing || !nextGameDay) return;
    if (new Date() >= nextGameDay.deadline) {
      const { data: existing } = await supabase.from('draw_results').select('id').eq('baba_id', currentBaba.id).eq('draw_date', nextGameDay.dateStr).maybeSingle();
      if (existing) { hasAutoDrawnRef.current = true; return; }

      if (gameConfirmations.length >= drawConfig.playersPerTeam * 2) {
        hasAutoDrawnRef.current = true;
        const res = await drawTeamsIntelligent();
        if (res) toast.success('Sorteio automático realizado!');
      } else { setDrawStatus('insufficient'); }
    }
  };

  // ─────────────────────────────────────────────
  // CICLO DE VIDA (useEffect)
  // ─────────────────────────────────────────────

  useEffect(() => {
    if (user) loadMyBabas().finally(() => setLoading(false));
    else setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!currentBaba) return;
    localStorage.setItem('selected_baba_id', String(currentBaba.id));
    hasAutoDrawnRef.current = false;
    
    const syncData = async () => {
      await loadPlayers(currentBaba.id);
      const next = getNextGameDay(currentBaba);
      setNextGameDay(next);
      if (next) {
        setConfirmationDeadline(next.deadline);
        const { data: c } = await supabase.from('game_confirmations').select(`*, player:players(*)`).eq('baba_id', currentBaba.id).eq('game_date', next.dateStr);
        setGameConfirmations(c || []);
        const myP = players.find(p => p.user_id === user?.id);
        if (myP) setMyConfirmation(c?.find(conf => conf.player_id === myP.id) || null);
        await loadTodayMatch(currentBaba.id, next.dateStr);
      }
    };
    syncData();
  }, [currentBaba, user]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (nextGameDay) {
        setCanConfirm(new Date() < nextGameDay.deadline);
        tryAutoDraw();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [nextGameDay, gameConfirmations]);

  return (
    <BabaContext.Provider value={{
      myBabas, currentBaba, setCurrentBaba, players, loading,
      createBaba, joinBaba, updateBaba, uploadBabaImage,
      gameConfirmations, myConfirmation, canConfirm, confirmationDeadline, nextGameDay,
      currentMatch, matchPlayers, isDrawing, drawStatus,
      drawTeamsIntelligent, drawConfig, setDrawConfig
    }}>
      {children}
    </BabaContext.Provider>
  );
};

export const useBaba = () => useContext(BabaContext);
