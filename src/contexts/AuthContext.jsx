import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';

// Exportação robusta para evitar o ReferenceError que vimos antes
export const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. BUSCA DE PERFIL (RESTAURADA E MELHORADA)
  const fetchProfile = async (userId) => {
    if (!userId) return;
    try {
      console.log("AuthContext: Buscando dados do perfil...");
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) throw error;
      if (data) setProfile(data);
    } catch (error) {
      console.error('Erro ao buscar perfil:', error.message);
    }
  };

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        
        const currentUser = session?.user || null;
        setUser(currentUser);
        if (currentUser) await fetchProfile(currentUser.id);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        console.log("AuthContext: Evento de Auth ->", event);
        
        const currentUser = session?.user || null;
        setUser(currentUser);
        
        if (currentUser) {
          await fetchProfile(currentUser.id);
          // A correção para o erro 404 da Vercel:
          if (event === 'SIGNED_IN' && window.location.pathname.includes('/login')) {
            window.location.replace('/dashboard');
          }
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

  // 2. UPLOAD DE AVATAR (RESTAURADO)
  const uploadAvatar = async (file) => {
    try {
      if (!user) throw new Error('Usuário não identificado');
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return { url: publicUrl, error: null };
    } catch (error) {
      toast.error('Erro no upload: ' + error.message);
      return { url: null, error };
    }
  };

  // 3. ATUALIZAÇÃO DE PERFIL (RESTAURADO)
  const updateProfile = async (updates) => {
    try {
      if (!user) throw new Error('Sessão expirada');

      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      setProfile(data);
      toast.success('Perfil atualizado com sucesso!');
      return { data, error: null };
    } catch (error) {
      toast.error(error.message);
      return { data: null, error };
    }
  };

  // 4. LOGIN E CADASTRO (RESTAURADOS)
  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      const msg = error.message === 'Invalid login credentials' 
        ? 'Email ou senha incorretos' 
        : error.message;
      toast.error(msg);
      return { data: null, error };
    }
  };

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

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.assign('/');
  };

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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
