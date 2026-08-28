// src/contexts/AuthContext.jsx
// Fase 1.5 — Sessão baseada no JWT do Supabase (claim exp) em vez de localStorage.
// A lógica de isSessionExpired por inatividade local é removida;
// o Supabase cuida do refresh automático via onAuthStateChange.

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';

const PROFILE_TABLE = 'profiles';
const AuthContext   = createContext({});

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

// Mapa de tradução para erros do Supabase Auth → português
const AUTH_ERROR_MAP = {
  'Invalid login credentials':    'Email ou senha incorretos',
  'Email not confirmed':          'Confirme seu email antes de entrar',
  'User already registered':      'Este email já está cadastrado',
  'Password should be at least 6 characters': 'A senha precisa ter pelo menos 6 caracteres',
  'Unable to validate email address: invalid format': 'Formato de email inválido',
  'Email rate limit exceeded':    'Muitas tentativas. Aguarde alguns minutos',
  'over_email_send_rate_limit':   'Muitas tentativas. Aguarde alguns minutos',
  'New password should be different from the old password.': 'A nova senha deve ser diferente da senha atual',
  'Password should be at least 6 characters.': 'A senha precisa ter pelo menos 6 caracteres',
  'Auth session missing!':        'Sessão expirada. Faça login novamente',
  'captcha verification process failed': 'Não foi possível confirmar que você não é um robô. Tente novamente',
};

const translateAuthError = (msg) => {
  if (AUTH_ERROR_MAP[msg]) return AUTH_ERROR_MAP[msg];

  // Erros de rede: o texto varia por navegador ("Load failed" no Safari/iOS,
  // "Failed to fetch" no Chrome, "NetworkError..." no Firefox) e às vezes vem
  // com o domínio do Supabase colado no final — tratamos tudo isso aqui.
  if (/load failed|failed to fetch|networkerror|network request failed/i.test(msg || '')) {
    return 'Sem conexão com a internet. Verifique sua rede e tente novamente';
  }

  return msg;
};

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(undefined); // undefined = carregando
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId) => {
    if (!userId) { setProfile(null); return; }
    try {
      const { data, error } = await supabase
        .from(PROFILE_TABLE)
        .select('*')
        .eq('id', userId)
        .single();
      if (error && error.code !== 'PGRST116') {
        console.error('[AuthContext] loadProfile:', error);
      }
      setProfile(data || null);
    } catch (err) {
      console.error('[AuthContext] loadProfile (catch):', err);
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    // Inicialização: busca sessão existente via Supabase (JWT)
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        loadProfile(currentUser.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    // Supabase lida com refresh do JWT automaticamente;
    // onAuthStateChange cobre token_refreshed, signed_out, etc.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        loadProfile(currentUser.id);
      } else {
        setProfile(null);
        // Limpar dados locais ao fazer signout
        localStorage.removeItem('selected_baba_id');
        localStorage.removeItem('push_eligible_after_confirm');
      }
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  // captchaToken vem do widget Cloudflare Turnstile exibido na LoginPage.jsx.
  // O Supabase Auth valida esse token no servidor contra a secret key
  // configurada em Authentication → Attack Protection — sem essa
  // configuração habilitada lá, passar o token aqui não tem efeito nenhum.
  // IMPORTANTE: se "CAPTCHA protection" estiver habilitado no projeto, ele é
  // exigido em TODOS os endpoints protegidos (/signup, /token, /recover),
  // não só no cadastro — por isso signIn e resetPasswordForEmail também
  // recebem captchaToken abaixo.
  const signUp = async (email, password, metadata = {}, captchaToken) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          ...(captchaToken ? { captchaToken } : {}),
        },
      });
      if (error) throw error;

      if (data.user) {
        const { error: profileError } = await supabase
          .from(PROFILE_TABLE)
          .insert([{
            id:              data.user.id,
            email,
            name:            metadata.name || email.split('@')[0],
            created_at:      new Date().toISOString(),
            consent_at:      metadata.consent_at || new Date().toISOString(),
            consent_version: metadata.consent_version || '1.0',
          }]);
        if (profileError) console.error('[AuthContext] criar perfil:', profileError);
      }

      toast.success('Conta criada! Verifique seu email.');
      return { data, error: null };
    } catch (err) {
      toast.error(translateAuthError(err.message));
      return { data: null, error: err };
    }
  };

  const signIn = async (email, password, captchaToken) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: {
          ...(captchaToken ? { captchaToken } : {}),
        },
      });
      if (error) throw error;
      toast.success('Login realizado com sucesso!');
      return { data, error: null };
    } catch (err) {
      toast.error(translateAuthError(err.message));
      return { data: null, error: err };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Envia o email com o link de recuperação de senha
  const resetPasswordForEmail = async (email, captchaToken) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
        ...(captchaToken ? { captchaToken } : {}),
      });
      if (error) throw error;
      toast.success('Enviamos um link de recuperação para o seu email!');
      return { error: null };
    } catch (err) {
      toast.error(translateAuthError(err.message));
      return { error: err };
    }
  };

  // Define uma nova senha (usado tanto no link de recuperação quanto na troca via perfil)
  const updatePassword = async (newPassword) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Senha atualizada com sucesso!');
      return { error: null };
    } catch (err) {
      toast.error(translateAuthError(err.message));
      return { error: err };
    }
  };

  const updateProfile = async (updates, { silent = false } = {}) => {
    if (!user) return { error: 'Usuário não autenticado' };
    try {
      const { data, error } = await supabase
        .from(PROFILE_TABLE)
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();
      if (error) throw error;
      setProfile(data);
      if (!silent) toast.success('Perfil atualizado!');
      return { data, error: null };
    } catch (err) {
      toast.error('Erro ao atualizar perfil');
      return { data: null, error: err };
    }
  };

  const refreshProfile = useCallback(
    () => loadProfile(user?.id),
    [loadProfile, user?.id]
  );

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      signUp, signIn, signOut,
      resetPasswordForEmail, updatePassword,
      updateProfile, refreshProfile, loadProfile,
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};