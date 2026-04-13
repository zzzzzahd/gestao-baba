import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // FIX 1: useCallback → referência estável para usar em useEffect de outros contextos
  const loadProfile = useCallback(async (userId) => {
    if (!userId) { setProfile(null); return; }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[AuthContext] loadProfile:', error);
      }
      setProfile(data || null);
    } catch (error) {
      console.error('[AuthContext] loadProfile (catch):', error);
      setProfile(null);
    }
  }, []); // sem deps — só usa supabase que é estável

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) loadProfile(currentUser.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) loadProfile(currentUser.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const signUp = async (email, password, metadata = {}) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: metadata },
      });
      if (error) throw error;

      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{
            id:         data.user.id,
            email:      email,
            name:       metadata.name || email.split('@')[0],
            created_at: new Date().toISOString(),
          }]);
        if (profileError) console.error('[AuthContext] criar perfil:', profileError);
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
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
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
      setUser(null);
      setProfile(null);
      localStorage.removeItem('selected_baba_id');
      toast.success('Logout realizado!');
    } catch (error) {
      toast.error(error.message);
    }
  };

  // FIX 2: updateProfile atualiza estado local sem precisar recarregar do banco
  // e chama o toast só quando chamado diretamente (não duplica com ProfileEdit)
  const updateProfile = async (updates, { silent = false } = {}) => {
    if (!user) return { error: 'Usuário não autenticado' };
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();
      if (error) throw error;
      setProfile(data);
      if (!silent) toast.success('Perfil atualizado!');
      return { data, error: null };
    } catch (error) {
      toast.error('Erro ao atualizar perfil');
      return { data: null, error };
    }
  };

  // FIX 3: refreshProfile é useCallback estável — não causa loop em useEffect externos
  const refreshProfile = useCallback(
    () => loadProfile(user?.id),
    [loadProfile, user?.id]
  );

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    refreshProfile,
    loadProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
