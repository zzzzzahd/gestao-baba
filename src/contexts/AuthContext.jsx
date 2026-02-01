import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';

// 1. DEFINIÇÃO E EXPORTAÇÃO DO CONTEXTO (ESSENCIAL PARA O PROTECTED ROUTE)
export const AuthContext = createContext(null);

// 2. HOOK PARA USAR O CONTEXTO (PRESERVADO)
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

// 3. PROVIDER DO CONTEXTO
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- BUSCAR PERFIL DO USUÁRIO (LÓGICA INTEGRAL) ---
  const fetchProfile = async (userId) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (data) {
        setProfile(data);
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.warn('Erro ao buscar perfil:', error.message);
      setProfile(null);
    }
  };

  // --- INICIALIZAR AUTENTICAÇÃO (LÓGICA INTEGRAL) ---
  useEffect(() => {
    if (!supabase) {
      console.error('Supabase não configurado!');
      setLoading(false);
      return;
    }

    let mounted = true;

    async function initAuth() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (error) {
          console.error('Erro ao obter sessão:', error);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        const currentUser = session?.user || null;
        setUser(currentUser);

        if (currentUser) {
          await fetchProfile(currentUser.id);
        }

        setLoading(false);
      } catch (error) {
        console.error('Erro na inicialização:', error);
        if (mounted) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
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

  // --- FUNÇÃO DE LOGIN (PRESERVADA) ---
  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      toast.success('Bem-vindo!');
      return { data, error: null };
    } catch (error) {
      const message = error.message === 'Invalid login credentials'
        ? 'Email ou senha incorretos'
        : error.message;
      
      toast.error(message);
      return { data: null, error };
    }
  };

  // --- FUNÇÃO DE CADASTRO (PRESERVADA) ---
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

  // --- FUNÇÃO DE LOGOUT (PRESERVADA COM MELHORIA) ---
  const signOut = async () => {
    try {
      localStorage.removeItem('selected_baba_id');
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      toast.success('Até logo!');
    } catch (error) {
      toast.error('Erro ao sair');
      console.error('Erro no logout:', error);
    }
  };

  // --- FUNÇÃO PARA ATUALIZAR PERFIL (LÓGICA INTEGRAL) ---
  const updateProfile = async (updates) => {
    if (!user) {
      return { error: 'Usuário não autenticado' };
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          ...updates,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
      toast.success('Perfil atualizado!');
      return { data, error: null };
    } catch (error) {
      toast.error('Erro ao atualizar perfil');
      console.error('Erro ao atualizar:', error);
      return { data: null, error };
    }
  };

  // --- FUNÇÃO PARA UPLOAD DE AVATAR (PRESERVADA) ---
  const uploadAvatar = async (userId, file) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      toast.error('Erro ao fazer upload da imagem');
      throw error;
    }
  };

  // VALOR DO CONTEXTO
  const value = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    uploadAvatar,
    refreshProfile: () => fetchProfile(user?.id)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Exportação default para compatibilidade
export default AuthProvider;
