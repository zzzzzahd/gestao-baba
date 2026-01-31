import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Função de busca de Perfil (Melhorada com tratamento de erro)
  const fetchProfile = async (userId) => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle(); // maybeSingle evita erro se o perfil ainda não existir
      
      if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error("Erro ao buscar perfil:", error);
    }
  };

  useEffect(() => {
    if (!supabase) {
      console.warn('Supabase não disponível.');
      setLoading(false);
      return;
    }

    // Pega sessão inicial
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          await fetchProfile(currentUser.id);
        }
      } catch (error) {
        console.error("Erro na sessão inicial:", error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listener de mudanças
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        await fetchProfile(currentUser.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription?.unsubscribe();
  }, []);

  // --- FUNÇÕES DE PERFIL ---

  const updateProfile = async (updates) => {
    if (!user) return { error: 'Usuário não logado' };
    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, ...updates, updated_at: new Date() })
        .select()
        .single();

      if (!error) {
        setProfile(data);
        toast.success('Perfil atualizado!');
      }
      return { data, error };
    } catch (e) {
      return { data: null, error: e };
    }
  };

  const uploadAvatar = async (userId, file) => {
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}/${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      toast.error('Erro no upload da imagem');
      throw error;
    }
  };

  // --- FUNÇÕES DE AUTENTICAÇÃO ---

  const signUp = async (email, password, metadata = {}) => {
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
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success('Bem-vindo!');
      return { data, error: null };
    } catch (error) {
      toast.error(error.message);
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setProfile(null);
      setUser(null);
      toast.success('Até a próxima!');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    uploadAvatar,
    refreshProfile: () => fetchProfile(user?.id)
  };

  // MUDANÇA CRUCIAL: Sempre retornamos o Provider, mas passamos o loading dentro dele
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
