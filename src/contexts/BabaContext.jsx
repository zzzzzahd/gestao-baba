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
  
  // ⭐ NOVO: Configuração do sorteio
  const [drawConfig, setDrawConfig] = useState({
    playersPerTeam: 5,
    strategy: 'reserve' // 'reserve' ou 'substitute'
  });

  // ⭐ NOVOS Estados de sorteio
  const [currentMatch, setCurrentMatch] = useState(null);
  const [matchPlayers, setMatchPlayers] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);

  // Carregar babas do usuário
  const loadMyBabas = async () => {
    try {
      const { data, error } = await supabase
        .from('babas')
        .select('*')
        .eq('president_id', user.id);

      if (error) throw error;
      setMyBabas(data || []);
      
      // Se houver babas, seleciona a primeira automaticamente
      if (data && data.length > 0 && !currentBaba) {
        setCurrentBaba(data[0]);
      }
    } catch (error) {
      console.error('Error loading babas:', error);
      toast.error('Erro ao carregar babas');
    }
  };

  // Carregar jogadores do baba atual
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

  // Calcular deadline de confirmação (30min antes do jogo)
  const calculateDeadline = (gameTime) => {
    if (!gameTime) return null;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Parse game_time (formato HH:MM ou HH:MM:SS)
    const [hours, minutes] = gameTime.split(':').map(Number);
    
    // Criar data/hora do jogo hoje
    const gameDateTime = new Date(today);
    gameDateTime.setHours(hours, minutes, 0, 0);
    
    // Deadline = 30 minutos antes do jogo
    const deadline = new Date(gameDateTime.getTime() - 30 * 60 * 1000);
    
    return deadline;
  };

  // Carregar confirmações do jogo de hoje
  const loadGameConfirmations = async (babaId) => {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      const { data, error } = await supabase
        .from('game_confirmations')
        .select(`
          *,
          player:players(*)
        `)
        .eq('baba_id', babaId)
        .eq('game_date', today);

      if (error) throw error;
      
      setGameConfirmations(data || []);
      
      // Verificar se o usuário atual confirmou
      const myPlayer = players.find(p => p.user_id === user.id);
      if (myPlayer) {
        const myConf = data?.find(c => c.player_id === myPlayer.id);
        setMyConfirmation(myConf || null);
      }
    } catch (error) {
      console.error('Error loading confirmations:', error);
    }
  };

  // ⭐ NOVO: Carregar partida de hoje
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

  // ⭐ NOVO: Carregar jogadores da partida
  const loadMatchPlayers = async (matchId) => {
    try {
      const { data, error } = await supabase
        .from('match_players')
        .select(`
          *,
          player:players(*)
        `)
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

  // ⭐ FUNÇÃO DE SORTEIO INTELIGENTE (Baseada no Visitor Mode)
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
      console.log(`🎲 Iniciando sorteio: ${gameConfirmations.length} confirmados`);

      const confirmedPlayers = gameConfirmations.map(conf => conf.player).filter(Boolean);

      let goalies = confirmedPlayers.filter(p => p.position === 'goleiro').sort(() => Math.random() - 0.5);
      let outfield = confirmedPlayers.filter(p => p.position !== 'goleiro').sort(() => Math.random() - 0.5);

      console.log(`⚽ ${outfield.length} linha | 🧤 ${goalies.length} goleiros`);

      let numTeams;
      if (strategy === 'reserve') {
        numTeams = Math.floor(confirmedPlayers.length / playersPerTeam);
      } else {
        numTeams = Math.ceil(confirmedPlayers.length / playersPerTeam);
      }
      
      if (numTeams < 2) {
        toast.error('Jogadores insuficientes para formar 2 times!');
        return null;
      }

      console.log(`🏆 Formando ${numTeams} times de ${playersPerTeam} jogadores`);

      const teams = Array.from({ length: numTeams }, (_, i) => ({
        name: `Time ${String.fromCharCode(65 + i)}`,
        players: []
      }));

      for (let i = 0; i < numTeams && goalies.length > 0; i++) {
        teams[i].players.push(goalies.shift());
      }

      let remaining = [...outfield, ...goalies];
      let teamIndex = 0;
      
      while (remaining.length > 0) {
        if (strategy === 'reserve' && teams.every(t => t.players.length >= playersPerTeam)) {
          break;
        }
        if (teams[teamIndex].players.length < playersPerTeam) {
          teams[teamIndex].players.push(remaining.shift());
        }
        teamIndex = (teamIndex + 1) % numTeams;
      }

      const reserves = remaining;
      console.log(`✅ ${teams.length} times | 📋 ${reserves.length} reservas`);

      const today = new Date().toISOString().split('T')[0];
      
      // ⭐ USAR UPSERT: Se já existir, atualiza. Se não existir, insere.
      const { data: drawResult, error: drawError } = await supabase
        .from('draw_results')
        .upsert({
          baba_id: currentBaba.id,
          draw_date: today,
          teams: teams,
          queue_order: teams.map((_, i) => i),
          reserves: reserves,
          total_confirmed: confirmedPlayers.length,
          players_per_team: playersPerTeam,
          strategy: strategy
        }, {
          onConflict: 'baba_id,draw_date' // Identifica pelo par único
        })
        .select()
        .single();

      if (drawError) throw drawError;

      const timeStr = currentBaba.game_time.substring(0, 5);
      const matchDateTime = `${today}T${timeStr}:00`;
      
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

      // ⭐ SALVAR TODOS OS JOGADORES DE TODOS OS TIMES
      const matchPlayersData = teams.flatMap((team, teamIndex) => 
        team.players.map(player => ({
          match_id: match.id,
          player_id: player.id,
          team: String.fromCharCode(65 + teamIndex), // A, B, C, D, E...
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

  // ⭐ NOVO: Sorteio manual (presidente)
  const manualDraw = async () => {
    try {
      if (!currentBaba) return;
      
      // Verificar se é presidente
      if (currentBaba.president_id !== user.id) {
        toast.error('Apenas o presidente pode sortear manualmente');
        return;
      }

      // Verificar se tem confirmados
      if (gameConfirmations.length < 4) {
        toast.error('Mínimo de 4 jogadores confirmados necessário');
        return;
      }

      // Se já existe match hoje, deletar antes
      if (currentMatch) {
        await supabase
          .from('matches')
          .delete()
          .eq('id', currentMatch.id);
      }

      // O UPSERT em drawTeamsIntelligent já resolve draw_results duplicado
      const match = await drawTeamsIntelligent();
      return match;
    } catch (error) {
      console.error('Error manual draw:', error);
      toast.error('Erro ao sortear times');
      return null;
    }
  };

  // Confirmar presença
  const confirmPresence = async () => {
    try {
      setLoading(true);
      
      // Encontrar o player do usuário atual
      const myPlayer = players.find(p => p.user_id === user.id);
      if (!myPlayer) {
        toast.error('Você não está registrado neste baba');
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('game_confirmations')
        .insert([{
          baba_id: currentBaba.id,
          player_id: myPlayer.id,
          game_date: today,
        }])
        .select(`
          *,
          player:players(*)
        `)
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

  // Cancelar confirmação
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

  // Criar novo baba
  const createBaba = async (babaData) => {
    try {
      setLoading(true);
      
      console.log('🔵 Tentando criar baba...', {
        babaData,
        userId: user.id,
        userName: profile?.name
      });
      
      const { data, error } = await supabase
        .from('babas')
        .insert([{
          ...babaData,
          president_id: user.id,
        }])
        .select()
        .single();

      console.log('📊 Resposta do INSERT:', { data, error });

      if (error) {
        console.error('❌ ERRO NO INSERT:', error);
        throw error;
      }

      if (!data) {
        console.error('❌ INSERT retornou vazio!');
        throw new Error('Insert retornou vazio');
      }

      console.log('✅ Baba criado no banco:', data);

      // Adicionar presidente como jogador automaticamente
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
      } else {
        console.log('✅ Presidente adicionado como jogador');
      }

      toast.success('Baba criado com sucesso!');
      await loadMyBabas();
      setCurrentBaba(data);
      return data;
    } catch (error) {
      console.error('💥 ERRO CRÍTICO ao criar baba:', error);
      console.error('Detalhes:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      toast.error('Erro ao criar baba');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Entrar em um baba existente por código de convite
  const joinBaba = async (inviteCode) => {
    try {
      setLoading(true);
      
      // Buscar baba pelo código
      const { data: baba, error: babaError } = await supabase
        .from('babas')
        .select('*')
        .eq('invite_code', inviteCode.toUpperCase())
        .single();

      if (babaError) throw new Error('Código inválido');

      // Adicionar usuário como jogador
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
          toast.error('Você já está neste baba!');
        } else {
          throw playerError;
        }
      } else {
        toast.success('Entrou no baba com sucesso!');
      }

      await loadMyBabas();
      setCurrentBaba(baba);
      return baba;
    } catch (error) {
      console.error('Error joining baba:', error);
      toast.error(error.message || 'Erro ao entrar no baba');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Sortear times (antiga função - mantida para compatibilidade)
  const drawTeams = (availablePlayers) => {
    const shuffled = [...availablePlayers].sort(() => Math.random() - 0.5);
    const mid = Math.ceil(shuffled.length / 2);
    
    const teamA = shuffled.slice(0, mid);
    const teamB = shuffled.slice(mid);

    return { teamA, teamB };
  };

  // ⭐ NOVO: Atualizar baba
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
      
      // Se estiver atualizando o baba atual, atualizar estado
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

  // ⭐ NOVO: Deletar baba
  const deleteBaba = async (babaId) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('babas')
        .delete()
        .eq('id', babaId);

      if (error) throw error;

      toast.success('Baba excluído com sucesso!');
      
      // Se deletou o baba atual, limpar estado
      if (currentBaba?.id === babaId) {
        setCurrentBaba(null);
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

  // Efeito para carregar dados quando o usuário está disponível
  useEffect(() => {
    if (user) {
      loadMyBabas();
    }
    setLoading(false);
  }, [user]);

  // Efeito para carregar jogadores quando o baba atual muda
  useEffect(() => {
    if (currentBaba) {
      loadPlayers(currentBaba.id);
      loadTodayMatch(currentBaba.id); // ⭐ Carregar partida de hoje
    }
  }, [currentBaba]);

  // Efeito para carregar confirmações e calcular deadline
  useEffect(() => {
    if (currentBaba && players.length > 0) {
      loadGameConfirmations(currentBaba.id);
      
      // Calcular deadline
      const deadline = calculateDeadline(currentBaba.game_time);
      setConfirmationDeadline(deadline);
      
      // Verificar se ainda pode confirmar
      if (deadline) {
        const now = new Date();
        setCanConfirm(now < deadline);
      }
    }
  }, [currentBaba, players]);

  // Atualizar canConfirm a cada minuto
  useEffect(() => {
    if (!confirmationDeadline) return;

    const interval = setInterval(() => {
      const now = new Date();
      setCanConfirm(now < confirmationDeadline);
    }, 60000); // Atualiza a cada 1 minuto

    return () => clearInterval(interval);
  }, [confirmationDeadline]);

  return (
    <BabaContext.Provider value={{
      myBabas,
      currentBaba,
      setCurrentBaba,
      players,
      matches,
      loading,
      createBaba,
      joinBaba,
      loadMyBabas,
      drawTeams,
      // Confirmação de presença
      gameConfirmations,
      myConfirmation,
      canConfirm,
      confirmationDeadline,
      confirmPresence,
      cancelConfirmation,
      // ⭐ NOVO: Sorteio de times
      currentMatch,
      matchPlayers,
      isDrawing,
      drawTeamsIntelligent,
      drawConfig,
      setDrawConfig,
      loadTodayMatch,
      loadMatchPlayers,
      manualDraw,
      // ⭐ NOVO: Editar/Deletar baba
      updateBaba,
      deleteBaba,
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
