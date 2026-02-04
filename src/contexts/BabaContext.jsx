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
  const [babas, setBabas] = useState([]);
  const [loading, setLoading] = useState(true);

  // Carregar babas do usuário
  const loadBabas = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Busca babas onde usuário é presidente OU participante
      const { data, error } = await supabase
        .from('babas')
        .select('*')
        .or(`president_id.eq.${user.id},players.cs.{${user.id}}`);

      if (error) throw error;

      setBabas(data || []);

      // Seleciona automaticamente se tiver apenas 1
      if (data && data.length === 1) {
        setCurrentBaba(data[0]);
        localStorage.setItem('selected_baba_id', data[0].id);
      } else {
        // Tenta recuperar último selecionado
        const savedId = localStorage.getItem('selected_baba_id');
        if (savedId && data) {
          const found = data.find(b => b.id === savedId);
          if (found) setCurrentBaba(found);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar babas:', error);
    } finally {
      setLoading(false);
    }
  };

  // Criar novo baba (LIMITE: 1 como presidente)
  const createBaba = async (babaData) => {
    if (!user) return { error: 'Usuário não autenticado' };

    try {
      // Verifica limite
      const myBabas = babas.filter(b => b.president_id === user.id);
      if (myBabas.length >= 1) {
        toast.error('Você já é presidente de 1 baba! Limite atingido.');
        return { error: 'Limite de babas atingido' };
      }

      const { data, error } = await supabase
        .from('babas')
        .insert([{
          ...babaData,
          president_id: user.id,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Baba criado com sucesso!');
      await loadBabas();
      return { data, error: null };
    } catch (error) {
      toast.error(error.message);
      return { data: null, error };
    }
  };

  // Atualizar baba
  const updateBaba = async (id, updates) => {
    try {
      const { data, error } = await supabase
        .from('babas')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast.success('Baba atualizado!');
      await loadBabas();
      return { data, error: null };
    } catch (error) {
      toast.error(error.message);
      return { data: null, error };
    }
  };

  // Deletar baba
  const deleteBaba = async (id) => {
    try {
      const { error } = await supabase
        .from('babas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Baba deletado!');
      
      if (currentBaba?.id === id) {
        setCurrentBaba(null);
        localStorage.removeItem('selected_baba_id');
      }
      
      await loadBabas();
      return { error: null };
    } catch (error) {
      toast.error(error.message);
      return { error };
    }
  };

  // Selecionar baba atual
  const selectBaba = (baba) => {
    setCurrentBaba(baba);
    localStorage.setItem('selected_baba_id', baba.id);
  };

  // Carregar ao montar
  useEffect(() => {
    loadBabas();
  }, [user]);

  const value = {
    babas,
    currentBaba,
    setCurrentBaba,
    loading,
    createBaba,
    updateBaba,
    deleteBaba,
    selectBaba,
    refreshBabas: loadBabas
  };

  return <BabaContext.Provider value={value}>{children}</BabaContext.Provider>;
};

export default BabaProvider;
