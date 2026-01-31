import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, TABLES } from '../services/supabase';
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
  const [loading, setLoading] = useState(false);

  const GUEST_BABA = {
    id: 'guest-session',
    name: 'Baba Rápido (Visitante)',
    match_duration: 10,
    modality: 'futsal',
    match_time: '20:00' // Adicionado para evitar erro no TeamsPage
  };

  useEffect(() => {
    if (!supabase) {
      setCurrentBaba(GUEST_BABA);
      setMyBabas([]);
      return;
    }

    if (user) {
      fetchBabas();
    } else {
      setMyBabas([]);
      setCurrentBaba(GUEST_BABA);
    }
  }, [user]);

  // --- FUNÇÕES DE CARREGAMENTO PRINCIPAIS ---

  const fetchBabas = async () => {
    if (!user || !supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(TABLES.BABAS)
        .select(`*, players:players(count)`)
        .or(`president_id.eq.${user.id}`);

      if (error) throw error;
      setMyBabas(data || []);
      if (data?.length > 0 && !currentBaba) setCurrentBaba(data[0]);
    } catch (err) {
      console.error('Erro no fetchBabas:', err);
      toast.error('Erro ao carregar babas');
    } finally {
      setLoading(false);
    }
  };

  const getBabaById = async (id) => {
    if (!supabase || id === 'guest-session') return GUEST_BABA;
    const { data, error } = await supabase
      .from(TABLES.BABAS)
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return data;
  };

  // --- FUNÇÕES DE RANKING (Usadas na RankingsPage) ---

  const getRankings = async (babaId, period) => {
    if (!supabase) return { goals: [], assists: [] };
    
    const goalField = period === 'month' ? 'total_goals_month' : 'total_goals_year';
    const assistField = period === 'month' ? 'total_assists_month' : 'total_assists_year';

    const { data: goals } = await supabase
      .from(TABLES.PLAYERS)
      .select(`name, position, avatar_url, ${goalField}`)
      .eq('baba_id', babaId)
      .order(goalField, { ascending: false })
      .limit(10);

    const { data: assists } = await supabase
      .from(TABLES.PLAYERS)
      .select(`name, position, avatar_url, ${assistField}`)
      .eq('baba_id', babaId)
      .order(assistField, { ascending: false })
      .limit(10);

    return { goals: goals || [], assists: assists || [] };
  };

  // --- FUNÇÕES DE ESCALAÇÃO E SORTEIO (Usadas na TeamsPage) ---

  const getConfirmedPlayers = async (babaId) => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('presences')
      .select('player_id, profiles(name, avatar_url)')
      .eq('baba_id', babaId);
    
    return data || [];
  };

  const getOfficialTeams = async (babaId) => {
    if (!supabase) return null;
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('official_teams')
      .select('*')
      .eq('baba_id', babaId)
      .eq('created_at', today)
      .single();
    return data;
  };

  const saveOfficialTeams = async (babaId, teamsData) => {
    if (!supabase) return;
    await supabase.from('official_teams').insert({
      baba_id: babaId,
      teams_data: teamsData
    });
  };

  // --- FUNÇÕES DE GERENCIAMENTO (CRUD) ---

  const selectBaba = async (id) => {
    if (id === 'guest-session') {
      setCurrentBaba(GUEST_BABA);
      return GUEST_BABA;
    }
    const data = await getBabaById(id);
    if (data) setCurrentBaba(data);
    return data;
  };

  const createBaba = async (babaData) => {
    if (!user || !supabase) return { error: 'Not authenticated' };
    try {
      const { data, error } = await supabase
        .from(TABLES.BABAS)
        .insert([{ ...babaData, president_id: user.id }])
        .select().single();

      if (!error) {
        toast.success('Baba criado!');
        fetchBabas();
      }
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  };

  const updateBaba = async (id, updates) => {
    if (id === 'guest-session') {
      setCurrentBaba(prev => ({ ...prev, ...updates }));
      return { data: updates };
    }
    const { data, error } = await supabase
      .from(TABLES.BABAS)
      .update(updates)
      .eq('id', id)
      .select().single();

    if (!error) fetchBabas();
    return { data, error };
  };

  const deleteBaba = async (id) => {
    const { error } = await supabase.from(TABLES.BABAS).delete().eq('id', id);
    if (!error) {
      toast.success('Baba removido');
      fetchBabas();
    }
  };

  const contextValue = {
    currentBaba,
    myBabas,
    loading,
    selectBaba,
    updateBaba,
    createBaba,
    deleteBaba,
    getBabaById,
    getRankings,
    getConfirmedPlayers,
    getOfficialTeams,
    saveOfficialTeams,
    loadMyBabas: fetchBabas
  };

  return (
    <BabaContext.Provider value={contextValue}>
      {children}
    </BabaContext.Provider>
  );
};
