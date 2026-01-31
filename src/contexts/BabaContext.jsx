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

  // Tabelas conforme o Schema do Banco
  const TABLES = {
    BABAS: 'babas',
    PLAYERS: 'players',
    PROFILES: 'profiles'
  };

  // Carrega os Babas que o usuário participa ou administra
  const loadMyBabas = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Busca Babas onde o usuário é presidente ou está na lista de coordenadores
      const { data, error } = await supabase
        .from(TABLES.BABAS)
        .select('*')
        .or(`president_id.eq.${user.id},coordinators.cs.{${user.id}}`);

      if (error) throw error;
      
      setMyBabas(data || []);

      // Se houver babas e nenhum selecionado, seleciona o primeiro por padrão
      if (data && data.length > 0 && !currentBaba) {
        setCurrentBaba(data[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar seus babas:', error);
    } finally {
      setLoading(false);
    }
  };

  // Carrega jogadores do Baba atual (fazendo Join com Profiles)
  const loadPlayers = async () => {
    if (!currentBaba) return;

    try {
      const { data, error } = await supabase
        .from(TABLES.PLAYERS)
        .select(`
          *,
          profile:profiles (
            name,
            avatar_url,
            phone
          )
        `)
        .eq('baba_id', currentBaba.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      console.error('Erro ao carregar jogadores:', error);
    }
  };

  // Efeito para recarregar babas quando o usuário logar
  useEffect(() => {
    loadMyBabas();
  }, [user]);

  // Efeito para recarregar jogadores quando o Baba atual mudar
  useEffect(() => {
    loadPlayers();
  }, [currentBaba]);

  // Função para trocar o Baba ativo
  const selectBaba = (baba) => {
    setCurrentBaba(baba);
    toast.success(`Baba ${baba.name} selecionado!`);
  };

  // Função para criar um novo Baba
  const createBaba = async (babaData) => {
    try {
      const { data, error } = await supabase
        .from(TABLES.BABAS)
        .insert([{ 
          ...babaData, 
          president_id: user.id 
        }])
        .select()
        .single();

      if (error) throw error;

      setMyBabas([...myBabas, data]);
      setCurrentBaba(data);
      toast.success('Baba criado com sucesso!');
      return { data, error: null };
    } catch (error) {
      toast.error('Erro ao criar baba');
      return { data: null, error };
    }
  };

  const value = {
    currentBaba,
    setCurrentBaba: selectBaba,
    myBabas,
    players,
    loading,
    refreshBabas: loadMyBabas,
    refreshPlayers: loadPlayers,
    createBaba
  };

  return (
    <BabaContext.Provider value={value}>
      {children}
    </BabaContext.Provider>
  );
};
