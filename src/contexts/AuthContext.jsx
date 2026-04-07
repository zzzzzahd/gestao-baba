import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null); // ✅ ADICIONADO
  const [loading, setLoading] = useState(true);

  // ✅ Função para carregar perfil do usuário
  const loadProfile = async (userId) => {
    if (!userId) {
      setProfile(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao carregar perfil:', error);
      }

      setProfile(data || null);
    } catch (error) {
      console.error('Erro ao carregar perfil (catch):', error);
      setProfile(null);
    }
  };

  useEffect(() => {
    // Verifica sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      // ✅ Carrega perfil quando tiver usuário
      if (currentUser) {
        loadProfile(currentUser.id);
      }
      
      setLoading(false);
    });

    // Escuta mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      // ✅ Carrega perfil quando usuário muda
      if (currentUser) {
        loadProfile(currentUser.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email, password, metadata = {}) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      });
      
      if (error) throw error;

      // ✅ Se cadastro bem-sucedido, cria perfil na tabela profiles
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{
            id: data.user.id,
            email: email,
            name: metadata.name || email.split('@')[0],
            created_at: new Date().toISOString()
          }]);

        if (profileError) {
          console.error('Erro ao criar perfil:', profileError);
        }
      }

      toast.success('Conta criada! Verifique seu email.');
      return { data, error: null };
    } catch (error) {
      toast.error(error.message);
      return { data: null, error };
    }
  };

  const signIn = async (email, password) => {
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
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // ✅ Limpa estados
      setUser(null);
      setProfile(null);
      
      // ✅ Limpa localStorage (remove possíveis dados antigos)
      localStorage.removeItem('selected_baba_id');
      
      toast.success('Logout realizado!');
    } catch (error) {
      toast.error(error.message);
    }
  };

  // ✅ Função para atualizar perfil
  const updateProfile = async (updates) => {
    if (!user) {
      return { error: 'Usuário não autenticado' };
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
      toast.success('Perfil atualizado!');
      return { data, error: null };
    } catch (error) {
      toast.error('Erro ao atualizar perfil');
      return { data: null, error };
    }
  };

  const value = {
    user,
    profile, // ✅ AGORA profile está incluído
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    refreshProfile: () => loadProfile(user?.id)
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
