import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';

// BUG-003 FIX: O schema original criava a tabela como "users",
// mas todo o código de aplicação usa "profiles".
// A solução adotada é padronizar tudo para "profiles"
// (ver supabase-migrations.sql para o ALTER TABLE correspondente).
const PROFILE_TABLE = 'profiles';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// Mapa de tradução para mensagens de erro do Supabase Auth
// UX-002 FIX: erros em português
const AUTH_ERROR_MAP = {
  'Invalid login credentials':    'Email ou senha incorretos',
  'Email not confirmed':          'Confirme seu email antes de entrar',
  'User already registered':      'Este email já está cadastrado',
  'Password should be at least 6 characters': 'A senha precisa ter pelo menos 6 caracteres',
  'Unable to validate email address: invalid format': 'Formato de email inválido',
  'Email rate limit exceeded':    'Muitas tentativas. Aguarde alguns minutos',
  'over_email_send_rate_limit':   'Muitas tentativas. Aguarde alguns minutos',
};

const translateAuthError = (message) => AUTH_ERROR_MAP[message] || message;

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId) => {
    if (!userId) { setProfile(null); return; }
    try {
      const { data, error } = await supabase
        .from(PROFILE_TABLE)  // BUG-003 FIX: constante centralizada
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
  }, []);

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
          .from(PROFILE_TABLE)  // BUG-003 FIX
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
      toast.error(translateAuthError(error.message));  // UX-002 FIX
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
      toast.error(translateAuthError(error.message));  // UX-002 FIX
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

  const updateProfile = async (updates, { silent = false } = {}) => {
    if (!user) return { error: 'Usuário não autenticado' };
    try {
      const { data, error } = await supabase
        .from(PROFILE_TABLE)  // BUG-003 FIX
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
