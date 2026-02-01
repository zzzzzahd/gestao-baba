import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';

// CRIAR O CONTEXTO PRIMEIRO (ISSO É CRÍTICO!)
const AuthContext = createContext(null);

// HOOK PARA USAR O CONTEXTO
export function useAuth() {
  const context = useContext(AuthContext);
  
  // Se o contexto for null ou undefined, significa que está sendo usado fora do Provider
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

// PROVIDER DO CONTEXTO
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Buscar perfil do usuário
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

  // Inicializar autenticação
  useEffect(() => {
    // Verificar se Supabase está configurado
    if (!supabase) {
      console.error('Supabase não configurado!');
      setLoading(false);
      return;
    }

    let mounted = true;

    // Função para inicializar auth
    async function initAuth() {
      try {
        // Pegar sessão atual
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

    // Inicializar
    initAuth();

    // Listener de mudanças de autenticação
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

    // Cleanup
    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Função de login
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

  // Função de cadastro
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

  // Função de logout
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      toast.success('Até logo!');
    } catch (error) {
      toast.error('Erro ao sair');
      console.error('Erro no logout:', error);
    }
  };

  // Função para atualizar perfil
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

  // Função para upload de avatar
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

  // Valor do contexto
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

  // Renderizar provider
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Exportação default (para compatibilidade)
export default AuthProvider;
