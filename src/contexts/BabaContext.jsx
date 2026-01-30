import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, TABLES } from '../services/supabase';
import { useAuth } from './AuthContext';

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

  // Configuração padrão para o Visitante
  const guestBaba = {
    id: 'guest-session',
    name: 'Baba Rápido (Visitante)',
    match_duration: 10,
    modality: 'futsal'
  };

  useEffect(() => {
    if (user) {
      loadMyBabas();
    } else {
      setMyBabas([]);
      setCurrentBaba(guestBaba);
    }
  }, [user]);

  const loadMyBabas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from(TABLES.BABAS)
        .select(`*, players:players(count)`)
        .or(`president_id.eq.${user.id},coordinators.cs.{${user.id}}`);

      if (error) throw error;
      setMyBabas(data || []);
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
    if (!user) return { data: null, error: 'Auth required' };
    try {
      const { data, error } = await supabase
        .from(TABLES.BABAS)
        .insert([{ ...babaData, president_id: user.id, created_at: new Date().toISOString() }])
        .select().single();
      if (error) throw error;
      await loadMyBabas();
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const updateBaba = async (babaId, updates) => {
    if (babaId === 'guest-session') {
      setCurrentBaba(prev => ({ ...prev, ...updates }));
      return { data: { ...currentBaba, ...updates }, error: null };
    }
    try {
      const { data, error } = await supabase
        .from(TABLES.BABAS)
        .update(updates).eq('id', babaId).select().single();
      if (error) throw error;
      await loadMyBabas();
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const deleteBaba = async (babaId) => {
    if (babaId === 'guest-session') return;
    try {
      await supabase.from(TABLES.BABAS).delete().eq('id', babaId);
      await loadMyBabas();
    } catch (error) {
      console.error(error);
    }
  };

  const selectBaba = async (babaId) => {
    if (babaId === 'guest-session') {
      setCurrentBaba(guestBaba);
      return guestBaba;
    }
    try {
      const { data } = await supabase.from(TABLES.BABAS).select('*').eq('id', babaId).single();
      setCurrentBaba(data);
      return data;
    } catch (error) {
      return null;
    }
  };

  return (
    <BabaContext.Provider value={{ currentBaba, myBabas, loading, createBaba, updateBaba, deleteBaba, selectBaba, loadMyBabas }}>
      {children}
    </BabaContext.Provider>
  );
};
