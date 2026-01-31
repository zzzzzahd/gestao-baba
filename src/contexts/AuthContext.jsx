import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 🔒 PROTEÇÃO CRÍTICA
    if (!supabase) {
      console.warn('Supabase não disponível. Auth desativado.');
      setLoading(false);
      return;
    }

    // Sessão atual
    supabase.auth.getSession().then(({ data }) => {
      setUser(data?.session?.user ?? null);
      setLoading(false);
    });

    // Listener de auth
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signUp = async (email, password, metadata = {}) => {
    if (!supabase) {
      toast.error('Serviço de autenticação indisponível');
      return { data: null, error: 'Supabase indisponível' };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: metadata }
      });

      if (error) throw error;
      toast.success('Conta criada! Verifique seu email.');
      return { data, error: null };
    } catch (error) {
      toast.error(error.message);
      return { data: null, error };
    }
  };

  const signIn = async (email, password) => {
    if (!supabase) {
      toast.error('Serviço de autenticação indisponível');
      return { data: null, error: 'Supabase indisponível' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      toast.success('Login realizado com sucesso!');
      return { data, error: null };
    } catch (error) {
      toast.error(error.message);
      return { data: null, error };
    }
  };

  const signOut = async () => {
    if (!supabase) return;

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Logout realizado!');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
