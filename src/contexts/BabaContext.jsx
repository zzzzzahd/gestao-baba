import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const BabaContext = createContext(null);

export const useBaba = () => {
  const context = useContext(BabaContext);
  if (!context) {
    throw new Error('useBaba deve ser usado dentro de um BabaProvider');
  }
  return context;
};

export const BabaProvider = ({ children }) => {
  const { user } = useAuth();
  const [currentBaba, setCurrentBaba] = useState(null);
  const [myBabas, setMyBabas] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados para o Sorteio de Times (Essencial para as telas de jogo)
  const [teamA, setTeamA] = useState([]);
  const [teamB, setTeamB] = useState([]);

  const TABLES = {
    BABAS: 'babas',
    PLAYERS: 'players',
    PROFILES: 'profiles',
    MATCHES: 'matches'
  };

  // 1. Carregar Babas do Usuário
  const loadMyBabas = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from(TABLES.BABAS)
        .select('*')
        .or(`president_id.eq.${user.id},coordinators.cs.{${user.id}}`);

      if (error) throw error;
      setMyBabas(data || []);
      if (data?.length > 0 && !currentBaba) {
        setCurrentBaba(data[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar babas:', error);
    } finally {
      setLoading(false);
    }
  };

  // 2. Carregar Jogadores do Baba Atual (Join com Profiles)
  const loadPlayers = async () => {
    if (!currentBaba) return;
    try {
      const { data, error } = await supabase
        .from(TABLES.PLAYERS)
        .select(`
          *,
          profile:profiles (name, avatar_url)
        `)
        .eq('baba_id', currentBaba.id);

      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      console.error('Erro ao carregar jogadores:', error);
    }
  };

  // 3. Lógica de Sorteio de Times (O "Coração" do App)
  const drawTeams = (availablePlayers) => {
    if (availablePlayers.length < 2) {
      toast.error("Adicione pelo menos 2 jogadores!");
      return;
    }

    // Separa goleiros e jogadores de linha
    const goalies = availablePlayers.filter(p => p.position === 'goleiro');
    const fieldPlayers = availablePlayers.filter(p => p.position !== 'goleiro');

    // Embaralhamento (Fisher-Yates)
    const shuffle = (array) => {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    };

    const shuffledGoalies = shuffle([...goalies]);
    const shuffledField = shuffle([...fieldPlayers]);

    const ta = [];
    const tb = [];

    // Distribui Goleiros
    shuffledGoalies.forEach((g, index) => {
      if (index % 2 === 0) ta.push(g); else tb.push(g);
    });

    // Distribui Linha
    shuffledField.forEach((p, index) => {
      if (index % 2 === 0) ta.push(p); else tb.push(p);
    });

    setTeamA(ta);
    setTeamB(tb);
    toast.success("Times sorteados!");
  };

  // 4. Salvar Resultado da Partida
  const saveMatchResult = async (matchData) => {
    try {
      const { data, error } = await supabase
        .from(TABLES.MATCHES)
        .insert([{ ...matchData, baba_id: currentBaba.id }])
        .select();

      if (error) throw error;
      toast.success("Partida registrada!");
      return data;
    } catch (error) {
      toast.error("Erro ao salvar partida");
      return null;
    }
  };

  useEffect(() => { loadMyBabas(); }, [user]);
  useEffect(() => { loadPlayers(); }, [currentBaba]);

  const value = {
    currentBaba,
    setCurrentBaba,
    myBabas,
    players,
    loading,
    teamA,
    teamB,
    drawTeams,
    saveMatchResult,
    refreshBabas: loadMyBabas,
    refreshPlayers: loadPlayers
  };

  return (
    <BabaContext.Provider value={value}>
      {children}
    </BabaContext.Provider>
  );
};
