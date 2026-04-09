import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const BabaContext = createContext();

export const BabaProvider = ({ children }) => {
  const { user, profile } = useAuth();
  const [myBabas, setMyBabas] = useState([]);
  const [currentBaba, setCurrentBaba] = useState(null);
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados de confirmação de presença
  const [gameConfirmations, setGameConfirmations] = useState([]);
  const [myConfirmation, setMyConfirmation] = useState(null);
  const [confirmationDeadline, setConfirmationDeadline] = useState(null);
  const [canConfirm, setCanConfirm] = useState(false);

  // Configuração do sorteio
  const [drawConfig, setDrawConfig] = useState({
    playersPerTeam: 5,
    strategy: 'reserve', // 'reserve' ou 'substitute'
  });

  // Estados de sorteio
  const [currentMatch, setCurrentMatch] = useState(null);
  const [matchPlayers, setMatchPlayers] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);

  // ─────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────

  /**
   * Calcula o deadline de confirmação (30min antes do jogo).
   * Suporta game_days_config (novo formato) e game_time (legado).
   *
   * game_days_config: [{ day: 0-6, time: 'HH:MM', location?: string }]
   */
  const calculateDeadline = (baba) => {
    if (!baba) return null;

    const now = new Date();
    const todayDow = now.getDay(); // 0 = DOM … 6 = SÁB

    let gameTimeStr = null;

    // ── Novo formato ──
    if (Array.isArray(baba.game_days_config) && baba.game_days_config.length > 0) {
      const todayConfig = baba.game_days_config.find((c) => c.day === todayDow);
      if (todayConfig?.time) {
        gameTimeStr = todayConfig.time;
      }
    }

    // ── Legado: verifica se hoje é dia de jogo ──
    if (!gameTimeStr) {
      const hasTodayInLegacy =
        !Array.isArray(baba.game_days) ||
        baba.game_days.length === 0 ||
        baba.game_days.includes(todayDow);

      if (hasTodayInLegacy && baba.game_time) {
        gameTimeStr = baba.game_time;
      }
    }

    if (!gameTimeStr) return null;

    const [hours, minutes] = gameTimeStr.split(':').map(Number);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const gameDateTime = new Date(today);
    gameDateTime.setHours(hours, minutes, 0, 0);

    // Deadline = 30 minutos antes do jogo
    return new Date(gameDateTime.getTime() - 30 * 60 * 1000);
  };

  // ─────────────────────────────────────────────
  // LOAD FUNCTIONS
  // ─────────────────────────────────────────────

  const loadMyBabas = async () => {
    if (!user) return;
    try {
      // Busca babas onde é presidente OU onde é jogador
      const { data: presidentBabas, error: e1 } = await supabase
        .from('babas')
        .select('*')
        .eq('president_id', user.id);

      if (e1) throw e1;

      const { data: playerRows, error: e2 } = await supabase
        .from('players')
        .select('baba_id')
        .eq('user_id', user.id);

      if (e2) throw e2;

      let memberBabas = [];
      if (playerRows && playerRows.length > 0) {
        const babaIds = playerRows.map((r) => r.baba_id);
        const { data: mb, error: e3 } = await supabase
          .from('babas')
          .select('*')
          .in('id', babaIds);
        if (e3) throw e3;
        memberBabas = mb || [];
      }

      // Merge e deduplica por id (Map garante unicidade sem risco de duplicata)
      const uniqueMap = new Map();
      [...(presidentBabas || []), ...memberBabas].forEach((b) => uniqueMap.set(b.id, b));
      const unique = Array.from(uniqueMap.values());

      setMyBabas(unique);

      // Restaura baba do localStorage — valida se ainda existe na lista
      if (!currentBaba && unique.length > 0) {
        const savedId = localStorage.getItem('selected_baba_id');
        const saved = savedId ? unique.find((b) => String(b.id) === savedId) : null;

        if (saved) {
          setCurrentBaba(saved);
        } else {
          // id salvo não existe mais (baba deletado ou usuário removido) → limpa e usa o primeiro
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
        .from('players')
        .select('*')
        .eq('baba_id', babaId)
        .order('name');

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

      setGameConfirmations(data || []);

      const myPlayer = players.find((p) => p.user_id === user.id);
      if (myPlayer) {
        const myConf = data?.find((c) => c.player_id === myPlayer.id);
        setMyConfirmation(myConf || null);
      }
    } catch (error) {
      console.error('Error loading confirmations:', error);
    }
  };

  const loadTodayMatch = async (babaId) => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('baba_id', babaId)
        .eq('match_date', today)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

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
        .from('match_players')
        .select(`*, player:players(*)`)
        .eq('match_id', matchId)
        .order('team');

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

      const { data, error } = await supabase
        .from('babas')
        .insert([{
          ...babaData,
          president_id: user.id,
          invite_code: null,
          invite_expires_at: null,
        }])
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Insert retornou vazio');

      // Adiciona presidente como jogador (com verificação de duplicata)
      const { data: existingPlayer } = await supabase
        .from('players')
        .select('id')
        .eq('baba_id', data.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!existingPlayer) {
        const { error: playerError } = await supabase
          .from('players')
          .insert([{
            baba_id: data.id,
            user_id: user.id,
            name: profile?.name || 'Presidente',
            position: 'linha',
          }]);

        if (playerError) {
          console.error('⚠️ Erro ao adicionar presidente como jogador:', playerError);
        }
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

  /**
   * Entra em um baba existente por código de convite.
   * Valida:
   *  1. Existência do baba
   *  2. Expiração do convite
   *  3. Duplicação do jogador
   */
  const joinBaba = async (inviteCode) => {
    try {
      setLoading(true);

      const code = inviteCode.trim().toUpperCase().substring(0, 6);

      if (code.length < 4) {
        toast.error('Código inválido. Deve ter 6 caracteres.');
        return null;
      }

      // 1. Buscar baba
      const { data: baba, error: babaError } = await supabase
        .from('babas')
        .select('*')
        .eq('invite_code', code)
        .maybeSingle();

      if (babaError) throw babaError;
      if (!baba) {
        toast.error('Código inválido. Verifique e tente novamente.');
        return null;
      }

      // 2. Validar expiração
      if (baba.invite_expires_at) {
        const expiresAt = new Date(baba.invite_expires_at);
        if (new Date() > expiresAt) {
          toast.error('Este código de convite expirou. Peça um novo ao presidente.');
          return null;
        }
      }

      // 3. Proteção preventiva contra duplicação
      const { data: existingPlayer } = await supabase
        .from('players')
        .select('id, name')
        .eq('baba_id', baba.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingPlayer) {
        // Já é membro — sincroniza nome se divergir (profile pode ter sido atualizado)
        const currentName = profile?.name || 'Jogador';
        if (existingPlayer.name !== currentName) {
          await supabase
            .from('players')
            .update({ name: currentName })
            .eq('id', existingPlayer.id);
        }

        toast('Você já faz parte deste baba!', { icon: '⚽' });
        setCurrentBaba(baba);
        localStorage.setItem('selected_baba_id', String(baba.id));
        await loadMyBabas();
        return baba;
      }

      // 4. Inserir jogador + fallback 23505 (race condition)
      const { error: playerError } = await supabase
        .from('players')
        .insert([{
          baba_id: baba.id,
          user_id: user.id,
          name: profile?.name || 'Jogador',
          position: 'linha',
        }]);

      if (playerError) {
        if (playerError.code === '23505') {
          // Inserção simultânea — trata como sucesso silencioso
          toast('Você já faz parte deste baba!', { icon: '⚽' });
        } else {
          throw playerError;
        }
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

  const updateBaba = async (babaId, updates) => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('babas')
        .update(updates)
        .eq('id', babaId)
        .select()
        .single();

      if (error) throw error;

      toast.success('Baba atualizado com sucesso!');
      await loadMyBabas();

      if (currentBaba?.id === babaId) {
        setCurrentBaba(data);
      }

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

      const { error } = await supabase
        .from('babas')
        .delete()
        .eq('id', babaId);

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

  /**
   * Gera um código de convite de 6 chars com validade de 24h.
   * Atualiza currentBaba localmente sem precisar recarregar tudo.
   */
  const generateInviteCode = async () => {
    if (!currentBaba) return null;
    try {
      setLoading(true);

      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const { data, error } = await supabase
        .from('babas')
        .update({
          invite_code: code,
          invite_expires_at: expiresAt.toISOString(),
        })
        .eq('id', currentBaba.id)
        .select()
        .single();

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
  // CONFIRMAÇÃO DE PRESENÇA
  // ─────────────────────────────────────────────

  const confirmPresence = async () => {
    try {
      setLoading(true);

      const myPlayer = players.find((p) => p.user_id === user.id);
      if (!myPlayer) {
        toast.error('Você não está registrado neste baba');
        return;
      }

      const today = new Date().toISOString().split('T')[0];

      // Verificar duplicata antes de inserir
      const { data: existing } = await supabase
        .from('game_confirmations')
        .select('id')
        .eq('baba_id', currentBaba.id)
        .eq('player_id', myPlayer.id)
        .eq('game_date', today)
        .maybeSingle();

      if (existing) {
        toast.error('Você já confirmou presença!');
        return;
      }

      const { data, error } = await supabase
        .from('game_confirmations')
        .insert([{
          baba_id: currentBaba.id,
          player_id: myPlayer.id,
          game_date: today,
        }])
        .select(`*, player:players(*)`)
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('Você já confirmou presença!');
        } else {
          throw error;
        }
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

      if (!myConfirmation) {
        toast.error('Você não confirmou presença');
        return;
      }

      const { error } = await supabase
        .from('game_confirmations')
        .delete()
        .eq('id', myConfirmation.id);

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
        toast.error('Nenhum jogador confirmado');
        return null;
      }

      const { playersPerTeam, strategy } = drawConfig;
      const minPlayers = playersPerTeam * 2;

      if (gameConfirmations.length < minPlayers) {
        toast.error(`Mínimo de ${minPlayers} jogadores confirmados necessário`);
        return null;
      }

      setIsDrawing(true);

      const confirmedPlayers = gameConfirmations.map((conf) => conf.player).filter(Boolean);
      let goalies = confirmedPlayers.filter((p) => p.position === 'goleiro').sort(() => Math.random() - 0.5);
      let outfield = confirmedPlayers.filter((p) => p.position !== 'goleiro').sort(() => Math.random() - 0.5);

      let numTeams;
      if (strategy === 'reserve') {
        numTeams = Math.floor(confirmedPlayers.length / playersPerTeam);
      } else {
        numTeams = Math.ceil(confirmedPlayers.length / playersPerTeam);
      }

      if (numTeams < 2) {
        toast.error('Jogadores insuficientes para formar 2 times!');
        setIsDrawing(false);
        return null;
      }

      const teams = Array.from({ length: numTeams }, (_, i) => ({
        name: `Time ${String.fromCharCode(65 + i)}`,
        players: [],
      }));

      for (let i = 0; i < numTeams && goalies.length > 0; i++) {
        teams[i].players.push(goalies.shift());
      }

      let remaining = [...outfield, ...goalies];
      let teamIndex = 0;

      while (remaining.length > 0) {
        if (strategy === 'reserve' && teams.every((t) => t.players.length >= playersPerTeam)) break;
        if (teams[teamIndex].players.length < playersPerTeam) {
          teams[teamIndex].players.push(remaining.shift());
        }
        teamIndex = (teamIndex + 1) % numTeams;
      }

      const reserves = remaining;
      const today = new Date().toISOString().split('T')[0];

      // UPSERT em draw_results (sem duplicação)
      const { data: drawResult, error: drawError } = await supabase
        .from('draw_results')
        .upsert(
          {
            baba_id: currentBaba.id,
            draw_date: today,
            teams,
            queue_order: teams.map((_, i) => i),
            reserves,
            total_confirmed: confirmedPlayers.length,
            players_per_team: playersPerTeam,
            strategy,
          },
          { onConflict: 'baba_id,draw_date' }
        )
        .select()
        .single();

      if (drawError) throw drawError;

      // ── Fase 1: verificação inicial (limpa match reutilizável) ──
      const { data: existingMatch } = await supabase
        .from('matches')
        .select('id, status')
        .eq('baba_id', currentBaba.id)
        .eq('match_date', today)
        .maybeSingle();

      if (existingMatch) {
        if (existingMatch.status === 'finished') {
          toast.error('Já existe uma partida finalizada hoje. Não é possível re-sortear.');
          setIsDrawing(false);
          return null;
        }
        await supabase.from('matches').delete().eq('id', existingMatch.id);
      }

      const gameTimeStr = currentBaba.game_time?.substring(0, 5) || '00:00';
      const matchDateTime = `${today}T${gameTimeStr}:00`;

      // ── Fase 2: guard anti race condition — re-verifica ANTES do INSERT ──
      // Cenário: dois dispositivos chegaram aqui ao mesmo tempo após deletar.
      // A segunda chamada encontra um match recém-criado pela primeira e aborta.
      const { data: raceCheckMatch } = await supabase
        .from('matches')
        .select('id, status')
        .eq('baba_id', currentBaba.id)
        .eq('match_date', today)
        .maybeSingle();

      if (raceCheckMatch) {
        // Outra instância já criou o match — carrega e retorna sem duplicar
        console.warn('⚠️ Race condition detectada: match já criado por outra instância');
        setCurrentMatch(raceCheckMatch);
        await loadMatchPlayers(raceCheckMatch.id);
        toast('Times já foram sorteados!', { icon: '⚽' });
        setIsDrawing(false);
        return null;
      }

      const { data: match, error: matchError } = await supabase
        .from('matches')
        .insert([{
          baba_id: currentBaba.id,
          match_date: matchDateTime,
          team_a_name: teams[0].name,
          team_b_name: teams[1].name,
          draw_result_id: drawResult.id,
          status: 'scheduled',
        }])
        .select()
        .single();

      if (matchError) throw matchError;

      const matchPlayersData = teams.flatMap((team, ti) =>
        team.players.map((player) => ({
          match_id: match.id,
          player_id: player.id,
          team: String.fromCharCode(65 + ti),
          position: player.position || 'linha',
        }))
      );

      const { error: playersError } = await supabase
        .from('match_players')
        .insert(matchPlayersData);

      if (playersError) throw playersError;

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
    try {
      if (!currentBaba) return null;

      if (String(currentBaba.president_id) !== String(user.id)) {
        toast.error('Apenas o presidente pode sortear manualmente');
        return null;
      }

      if (gameConfirmations.length < 4) {
        toast.error('Mínimo de 4 jogadores confirmados necessário');
        return null;
      }

      // Deleção de match existente já está dentro de drawTeamsIntelligent
      const result = await drawTeamsIntelligent();
      return result;
    } catch (error) {
      console.error('Error manual draw:', error);
      toast.error('Erro ao sortear times');
      return null;
    }
  };

  // Função legada mantida para compatibilidade
  const drawTeams = (availablePlayers) => {
    const shuffled = [...availablePlayers].sort(() => Math.random() - 0.5);
    const mid = Math.ceil(shuffled.length / 2);
    return { teamA: shuffled.slice(0, mid), teamB: shuffled.slice(mid) };
  };

  // ─────────────────────────────────────────────
  // EFFECTS
  // ─────────────────────────────────────────────

  useEffect(() => {
    if (user) {
      loadMyBabas().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (currentBaba) {
      localStorage.setItem('selected_baba_id', String(currentBaba.id));
      loadPlayers(currentBaba.id);
      loadTodayMatch(currentBaba.id);
    }
  }, [currentBaba]);

  useEffect(() => {
    if (currentBaba && players.length > 0) {
      loadGameConfirmations(currentBaba.id);

      const deadline = calculateDeadline(currentBaba);
      setConfirmationDeadline(deadline);

      if (deadline) {
        setCanConfirm(new Date() < deadline);
      } else {
        setCanConfirm(false);
      }
    }
  }, [currentBaba, players]);

  // Atualizar canConfirm a cada minuto
  useEffect(() => {
    if (!confirmationDeadline) return;

    const interval = setInterval(() => {
      setCanConfirm(new Date() < confirmationDeadline);
    }, 60_000);

    return () => clearInterval(interval);
  }, [confirmationDeadline]);

  // ─────────────────────────────────────────────
  // CONTEXT VALUE
  // ─────────────────────────────────────────────

  return (
    <BabaContext.Provider value={{
      myBabas,
      currentBaba,
      setCurrentBaba,
      players,
      matches,
      loading,
      // BABA CRUD
      createBaba,
      joinBaba,
      updateBaba,
      deleteBaba,
      loadMyBabas,
      // Invite
      generateInviteCode,
      // Confirmação de presença
      gameConfirmations,
      myConfirmation,
      canConfirm,
      confirmationDeadline,
      confirmPresence,
      cancelConfirmation,
      // Sorteio
      currentMatch,
      matchPlayers,
      isDrawing,
      drawTeams,
      drawTeamsIntelligent,
      drawConfig,
      setDrawConfig,
      loadTodayMatch,
      loadMatchPlayers,
      manualDraw,
      // Utilitário
      calculateDeadline,
    }}>
      {children}
    </BabaContext.Provider>
  );
};

export const useBaba = () => {
  const context = useContext(BabaContext);
  if (!context) {
    throw new Error('useBaba must be used within BabaProvider');
  }
  return context;
};
