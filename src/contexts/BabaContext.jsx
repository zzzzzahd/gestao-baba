import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, TABLES } from '../services/supabase';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const BabaContext = createContext({});

export const useBaba = () => {
  const context = useContext(BabaContext);
  if (!context) {
    throw new Error('useBaba must be used within BabaProvider');
  }
  return context;
};

export const BabaProvider = ({ children }) => {
  const { user } = useAuth();
  const [currentBaba, setCurrentBaba] = useState(null);
  const [myBabas, setMyBabas] = useState([]);
  const [loading, setLoading] = useState(false);

  // Objeto de Baba temporário para permitir o uso das ferramentas sem login
  const guestBaba = {
    id: 'guest-session',
    name: 'Baba Rápido (Visitante)',
    is_private: false,
    game_days: [],
    match_duration: 10,
    modality: 'futsal'
  };

  useEffect(() => {
    if (user) {
      loadMyBabas();
    } else {
      setMyBabas([]);
      // Define o baba virtual para o visitante em vez de deixar null
      setCurrentBaba(guestBaba);
    }
  }, [user]);

  const loadMyBabas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from(TABLES.BABAS)
        .select(`
          *,
          players:players(count)
        `)
        .or(`president_id.eq.${user.id},coordinators.cs.{${user.id}}`);

      if (error) throw error;
      setMyBabas(data || []);
      
      // Seleciona automaticamente o primeiro baba se disponível
      if (data && data.length > 0 && !currentBaba) {
        setCurrentBaba(data[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar babas:', error);
    } finally {
      setLoading(false);
    }
  };

  const createBaba = async (babaData) => {
    if (!user) {
      toast.error('Crie uma conta para salvar Babas fixos!');
      return { data: null, error: 'Auth required' };
    }
    try {
      const { data, error } = await supabase
        .from(TABLES.BABAS)
        .insert([{
          ...babaData,
          president_id: user.id,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Baba criado com sucesso!');
      await loadMyBabas();
      return { data, error: null };
    } catch (error) {
      toast.error('Erro ao criar baba');
      return { data: null, error };
    }
  };

  const updateBaba = async (babaId, updates) => {
    // Se for o baba do visitante, atualiza apenas no estado local
    if (babaId === 'guest-session') {
      setCurrentBaba(prev => ({ ...prev, ...updates }));
      return { data: { ...currentBaba, ...updates }, error: null };
    }

    try {
      const { data, error } = await supabase
        .from(TABLES.BABAS)
        .update(updates)
        .eq('id', babaId)
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Baba atualizado!');
      await loadMyBabas();
      if (currentBaba?.id === babaId) {
        setCurrentBaba(data);
      }
      return { data, error: null };
    } catch (error) {
      toast.error('Erro ao atualizar baba');
      return { data: null, error };
    }
  };

  const deleteBaba = async (babaId) => {
    if (babaId === 'guest-session') return;

    try {
      const { error } = await supabase
        .from(TABLES.BABAS)
        .delete()
        .eq('id', babaId);

      if (error) throw error;
      
      toast.success('Baba excluído!');
      await loadMyBabas();
      if (currentBaba?.id === babaId) {
        setCurrentBaba(null);
      }
    } catch (error) {
      toast.error('Erro ao excluir baba');
    }
  };

  const selectBaba = async (babaId) => {
    if (babaId === 'guest-session') {
      setCurrentBaba(guestBaba);
      return guestBaba;
    }

    try {
      const { data, error } = await supabase
        .from(TABLES.BABAS)
        .select('*')
        .eq('id', babaId)
        .single();

      if (error) throw error;
      setCurrentBaba(data);
      return data;
    } catch (error) {
      return null;
    }
  };

  const value = {
    currentBaba,
    myBabas,
    loading,
    createBaba,
    updateBaba,
