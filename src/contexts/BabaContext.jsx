import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase'; // Mantive seu caminho original
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
      
      // Recupera o baba selecionado do localStorage para não perder no F5
      const savedId = localStorage.getItem('selected_baba_id');
      if (savedId && data) {
        const found = data.find(b => b.id === savedId);
        if (found) setCurrentBaba(found);
      }
    } catch (error) {
      console.error('Erro ao carregar babas:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- NOVAS FUNÇÕES PARA O DASHBOARD FUNCIONAR ---

  // Criar Novo Baba
  const createBaba = async (nome) => {
    try {
      const { data, error } = await supabase
        .from(TABLES.BABAS)
        .insert([{ 
          nome, 
          president_id: user.id,
          created_at: new Date()
        }])
        .select();

      if (error) throw error;
      setMyBabas([data[0], ...myBabas]);
      return data[0];
    } catch (error) {
      console.error('Erro ao criar baba:', error);
      throw error;
    }
  };

  // Deletar Baba
  const deleteBaba = async (id) => {
    try {
      const { error } = await supabase
        .from(TABLES.BABAS)
        .delete()
        .eq('id', id);

      if (error) throw error;
      setMyBabas(myBabas.filter(b => b.id !== id));
      if (currentBaba?.id === id) setCurrentBaba(null);
    } catch (error) {
      console.error('Erro ao deletar:', error);
      throw error;
    }
  };

  // Selecionar Baba (O que faz o clique no card funcionar)
  const selectBaba = (baba) => {
    setCurrentBaba(baba);
    localStorage.setItem('selected_baba_id', baba.id);
  };

  // ------------------------------------------------

  const loadPlayers = async () => {
    if (!currentBaba) return;
    try {
      const { data, error } = await supabase
        .from(TABLES.PLAYERS)
        .select(`*, profile:profiles (name, avatar_url)`)
        .eq('baba_id', currentBaba.id);

      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      console.error('Erro ao carregar jogadores:', error);
    }
  };

  const drawTeams = (availablePlayers) => {
    if (availablePlayers.length < 2) {
      toast.error("Adicione pelo menos 2 jogadores!");
      return;
    }
    const goalies = availablePlayers.filter(p => p.position === 'goleiro');
    const fieldPlayers = availablePlayers.filter(p => p.position !== 'goleiro');

    const shuffle = (array) => {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    };

    const shuffledGoalies = shuffle([...goalies]);
    const shuffledField = shuffle([...fieldPlayers]);
    const ta = []; const tb = [];

    shuffledGoalies.forEach((g, i) => { if (i % 2 === 0) ta.push(g); else tb.push(g); });
    shuffledField.forEach((p, i) => { if (i % 2 === 0) ta.push(p); else tb.push(p); });

    setTeamA(ta);
    setTeamB(tb);
    toast.success("Times sorteados!");
  };

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
    babas: myBabas, // Mapeado para 'babas' para o Dashboard entender
    myBabas,
    players,
    loading,
    teamA,
    teamB,
    createBaba,    // Exportado!
    deleteBaba,    // Exportado!
    selectBaba,    // Exportado!
    drawTeams,
    saveMatchResult,
    refreshBabas: loadMyBabas,
    refreshPlayers: loadPlayers
  };

  return <BabaContext.Provider value={value}>{children}</BabaContext.Provider>;
};
