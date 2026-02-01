import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';

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

  const fetchProfile = async (userId) => {
    if (!userId) return;
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
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
        const currentUser = session?.user || null;
        setUser(currentUser);
        
        if (currentUser) {
          await fetchProfile(currentUser.id);
          // Redirecionamento forçado para vencer o erro 404 da Vercel
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

  // --- MANTENDO TODAS AS SUAS FUNÇÕES ORIGINAIS ---
  const uploadAvatar = async (file) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      return { url: publicUrl, error: null };
    } catch (error) { return { url: null, error }; }
  };

  const updateProfile = async (updates) => {
    try {
      const { data, error } = await supabase.from('profiles').upsert({ id: user.id, ...updates, updated_at: new Date().toISOString() }).select().single();
      if (error) throw error;
      setProfile(data);
      toast.success('Perfil atualizado!');
      return { data, error: null };
    } catch (error) { return { data: null, error }; }
  };

  const signIn = async (email, password) => {
    return await supabase.auth.signInWithPassword({ email, password });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.assign('/');
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut, updateProfile, uploadAvatar, refreshProfile: () => fetchProfile(user?.id) }}>
      {children}
    </AuthContext.Provider>
  );
}
