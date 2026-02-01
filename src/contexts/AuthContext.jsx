import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';

// AJUSTE: Exportação direta para evitar "ReferenceError"
export const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId) => {
    if (!userId) {
      console.log("AuthProvider: Sem userId para buscar perfil");
      setProfile(null);
      return;
    }
    try {
      console.log("AuthProvider: Buscando perfil para", userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (data) {
        console.log("AuthProvider: Perfil carregado com sucesso", data.name);
        setProfile(data);
      }
    } catch (error) {
      console.error('AuthProvider: Erro ao buscar perfil:', error.message);
    }
  };

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        console.log("AuthProvider: Inicializando sessão...");
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;

        if (!mounted) return;

        const currentUser = session?.user || null;
        setUser(currentUser);

        if (currentUser) {
          await fetchProfile(currentUser.id);
        }
      } catch (error) {
        console.error('AuthProvider: Erro na inicialização da Auth:', error);
      } finally {
        if (mounted) {
          console.log("AuthProvider: Loading finalizado");
          setLoading(false);
        }
      }
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("AuthProvider: Mudança de estado detectada -", event);
        if (!mounted) return;
        
        const currentUser = session?.user || null;
        setUser(currentUser);
        
        if (currentUser) {
          await fetchProfile(currentUser.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success('Bem-vindo ao campo!');
      return { data, error: null };
    } catch (error) {
      toast.error(error.message === 'Invalid login credentials' ? 'Email ou senha incorretos' : error.message);
      return { data: null, error };
    }
  };

  const signUp = async (email, password, metadata = {}) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email, password, options: { data: metadata }
      });
      if (error) throw error;
      toast.success('Conta criada! Verifique seu email.');
      return { data, error: null };
    } catch (error) {
      toast.error(error.message);
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      localStorage.removeItem('selected_baba_id');
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      toast.success('Até a próxima!');
    } catch (error) {
      console.error('Erro ao sair:', error);
    }
  };

  const updateProfile = async (updates) => {
    if (!user) return { error: 'Não autenticado' };
    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, ...updates, updated_at: new Date().toISOString() })
        .select().single();
      if (error) throw error;
      setProfile(data);
      return { data, error: null };
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      return { data: null, error };
    }
  };

  const value = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshProfile: () => fetchProfile(user?.id)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
