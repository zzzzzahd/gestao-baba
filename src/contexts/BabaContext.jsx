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
    modality: 'futsal'
  };

  useEffect(() => {
    // 🔒 Proteção CRÍTICA
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
      if (data?.length > 0) setCurrentBaba(data[0]);
    } catch (err) {
      console.error('Erro no fetchBabas:', err);
      toast.error('Erro ao carregar babas');
    } finally {
      setLoading(false);
    }
  };

  const selectBaba = async (id) => {
    if (!supabase) return null;

    if (id === 'guest-session') {
      setCurrentBaba(GUEST_BABA);
      return GUEST_BABA;
    }

    const { data, error } = await supabase
      .from(TABLES.BABAS)
      .select('*')
      .eq('id', id)
      .single();

    if (!error && data) {
      setCurrentBaba(data);
      return data;
    }

    return null;
  };

  const updateBaba = async (id, updates) => {
    if (!supabase) return { data: null, error: 'Supabase indisponível' };

    if (id === 'guest-session') {
      setCurrentBaba(prev => ({ ...prev, ...updates }));
      return { data: updates };
    }

    const { data, error } = await supabase
      .from(TABLES.BABAS)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (!error) fetchBabas();
    return { data, error };
  };

  const createBaba = async (babaData) => {
    if (!user || !supabase) {
      toast.error('Você precisa estar logado');
      return { error: 'Not authenticated' };
    }

    try {
      const { data, error } = await supabase
        .from(TABLES.BABAS)
        .insert([{ ...babaData, president_id: user.id }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Baba criado com sucesso!');
      fetchBabas();
      return { data, error: null };
    } catch (error) {
      toast.error(error.message);
      return { data: null, error };
    }
  };

  const deleteBaba = async (id) => {
    if (!user || !supabase) return;

    const { error } = await supabase
      .from(TABLES.BABAS)
      .delete()
      .eq('id', id);

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
    loadMyBabas: fetchBabas,
    createBaba,
    deleteBaba
  };

  return (
    <BabaContext.Provider value={contextValue}>
      {children}
    </BabaContext.Provider>
  );
};
