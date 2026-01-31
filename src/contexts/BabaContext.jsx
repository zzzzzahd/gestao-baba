import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, TABLES } from '../services/supabase';
import { useAuth } from './AuthContext';

const BabaContext = createContext({});

export const useBaba = () => useContext(BabaContext);

export const BabaProvider = ({ children }) => {
  const { user } = useAuth();
  const [currentBaba, setCurrentBaba] = useState(null);
  const [myBabas, setMyBabas] = useState([]);
  const [loading, setLoading] = useState(false);

  const guestBaba = {
    id: 'guest-session',
    name: 'Baba Rápido (Visitante)',
    match_duration: 10
  };

  const loadMyBabas = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data } = await supabase
        .from(TABLES.BABAS)
        .select(`*, players:players(count)`)
        .or(`president_id.eq.${user.id},coordinators.cs.{${user.id}}`);
      setMyBabas(data || []);
      if (data && data.length > 0) setCurrentBaba(data[0]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadMyBabas();
    } else {
      setCurrentBaba(guestBaba);
      setMyBabas([]);
    }
  }, [user]);

  const selectBaba = async (id) => {
    if (id === 'guest-session') {
      setCurrentBaba(guestBaba);
      return guestBaba;
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
    const { data } = await supabase.from(TABLES.BABAS).update(updates).eq('id', id).select().single();
    return { data };
  };

  const value = { 
    currentBaba, 
    myBabas, 
    loading, 
    selectBaba, 
    updateBaba, 
    loadMyBabas,
    createBaba: async () => {}, 
    deleteBaba: async () => {} 
  };

  return (
    <BabaContext.Provider value={value}>
      {children}
    </BabaContext.Provider>
  );
};
