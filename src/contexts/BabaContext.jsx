import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, TABLES } from '../services/supabase';
import { useAuth } from './AuthContext'; // Verifique se o nome do arquivo é exatamente este
import toast from 'react-hot-toast';

const BabaContext = createContext({});

export const useBaba = () => {
  const context = useContext(BabaContext);
  if (!context) throw new Error('useBaba deve ser usado dentro de um BabaProvider');
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
    if (user) {
      fetchBabas();
    } else {
      setMyBabas([]);
      setCurrentBaba(GUEST_BABA);
    }
  }, [user]);

  const fetchBabas = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // O erro de tela branca pode estar aqui se a coluna 'coordinators' não existir ou não for array
      const { data, error } = await supabase
        .from(TABLES.BABAS)
        .select(`*, players:players(count)`)
        .or(`president_id.eq.${user.id},coordinators.cs.{${user.id}}`);

      if (error) {
        console.error("Erro na query do Supabase:", error);
        // Se a query falhar, tentamos buscar apenas pelo president_id para não travar o app
        const { data: retryData } = await supabase
          .from(TABLES.BABAS)
          .select(`*, players:players(count)`)
          .eq('president_id', user.id);
        
        setMyBabas(retryData || []);
      } else {
        setMyBabas(data || []);
        if (data?.length > 0) setCurrentBaba(data[0]);
      }
    } catch (err) {
      console.error("Erro fatal no fetchBabas:", err.message);
    } finally {
      setLoading(false); // Garante que o loading pare, evitando a tela branca infinita
    }
  };

  const selectBaba = async (id) => {
    if (id === 'guest-session') {
      setCurrentBaba(GUEST_BABA);
      return GUEST_BABA;
    }
    const { data } = await supabase.from(TABLES.BABAS).select('*').eq('id', id).single();
    if (data) setCurrentBaba(data);
    return data;
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
      .select()
      .single();
    
    if (!error) fetchBabas();
    return { data, error };
  };

  const createBaba = async (babaData) => {
    if (!user) {
      toast.error("Você precisa estar logado para criar um baba.");
      return { error: 'Not authenticated' };
    }
    try {
      const { data, error } = await supabase
        .from(TABLES.BABAS)
        .insert([{ ...babaData, president_id: user.id }])
        .select()
        .single();
      if (error) throw error;
      toast.success("Baba criado com sucesso!");
      fetchBabas();
      return { data, error: null };
    } catch (error) {
      toast.error(error.message);
      return { data: null, error };
    }
  };

  const deleteBaba = async (id) => {
    if (!user) return;
    const { error } = await supabase.from(TABLES.BABAS).delete().eq('id', id);
    if (!error) {
      toast.success("Baba removido.");
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
