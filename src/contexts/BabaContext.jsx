import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, TABLES } from '../services/supabase';
import { useAuth } from './AuthContext';

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

  // Configuração padrão para visitantes (Modo Ferramenta Rápida)
  const GUEST_BABA = {
    id: 'guest-session',
    name: 'Baba Rápido (Visitante)',
    match_duration: 10,
    modality: 'futsal'
  };

  // 1. Efeito para monitorar login/logout
  useEffect(() => {
    if (user) {
      fetchBabas();
    } else {
      setMyBabas([]);
      setCurrentBaba(GUEST_BABA);
    }
  }, [user]);

  // 2. Busca babas no Banco de Dados
  const fetchBabas = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(TABLES.BABAS)
        .select(`*, players:players(count)`)
        .or(`president_id.eq.${user.id},coordinators.cs.{${user.id}}`);

      if (error) throw error;
      setMyBabas(data || []);
      if (data?.length > 0) setCurrentBaba(data[0]);
    } catch (err) {
      console.error("Erro ao buscar babas:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Seleção de Baba (DB ou Visitante)
  const selectBaba = async (id) => {
    if (id === 'guest-session') {
      setCurrentBaba(GUEST_BABA);
      return GUEST_BABA;
    }
    const { data } = await supabase.from(TABLES.BABAS).select('*').eq('id', id).single();
    if (data) setCurrentBaba(data);
    return data;
  };

  // 4. Atualização de Baba
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

  // 5. Funções Vazias (Placeholder para evitar erros em outros componentes)
  const createBaba = async () => console.warn("Login necessário para criar");
  const deleteBaba = async () => console.warn("Login necessário para deletar");

  // Objeto de valor do contexto
  const contextValue = {
    currentBaba,
    myBabas,
    loading,
    selectBaba,
    updateBaba,
    loadMyBabas: fetchBabas, // Mantém compatibilidade com o nome antigo
    createBaba,
    deleteBaba
  };

  return (
    <BabaContext.Provider value={contextValue}>
      {children}
    </BabaContext.Provider>
  );
};
