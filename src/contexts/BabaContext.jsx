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

  // Carrega os babas do usuário
  useEffect(() => {
    if (user) {
      loadMyBabas();
    } else {
      setMyBabas([]);
      setCurrentBaba(null);
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
    } catch (error) {
      toast.error('Erro ao carregar babas');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const createBaba = async (babaData) => {
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
      console.error(error);
      return { data: null, error };
    }
  };

  const updateBaba = async (babaId, updates) => {
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
      console.error(error);
      return { data: null, error };
    }
  };

  const deleteBaba = async (babaId) => {
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
      console.error(error);
    }
  };

  const selectBaba = async (babaId) => {
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
      toast.error('Erro ao carregar baba');
      console.error(error);
      return null;
    }
  };

  const value = {
    currentBaba,
    myBabas,
    loading,
    createBaba,
    updateBaba,
    deleteBaba,
    selectBaba,
    loadMyBabas
  };

  return (
    <BabaContext.Provider value={value}>
      {children}
    </BabaContext.Provider>
  );
};
