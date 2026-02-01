import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';

// 1. EXPORTAÇÃO NOMINAL DO CONTEXTO (Para evitar o ReferenceError)
export const AuthContext = createContext(null);

// 2. HOOK DE ACESSO
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined || context === null) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- FUNÇÃO DE BUSCA DE PERFIL COM TIMEOUT (PRESERVADA INTEGRALMENTE) ---
  const fetchProfile = async (userId) => {
    if (!userId) return;
    
    try {
      // Timeout de 5 segundos para evitar travamento da UI
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 5000)
      );
      
      const fetchPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);
      
      if (data) {
        setProfile(data);
      } else if (error && error.code !== 'PGRST116') {
        console.warn("Perfil não encontrado ou erro controlado:", error.message);
      }
    } catch (error) {
      console.warn("Erro ao buscar perfil (ignorado para não travar login):", error.message);
    }
  };

  useEffect(() => {
    // Verificação de Supabase configurado (PRESERVADO)
    if (!supabase || !import.meta.env.VITE_SUPABASE_URL) {
      console.warn('Supabase não configurado - operando em modo offline/limitado');
      setLoading(false);
      return;
    }

    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (error) {
          console.error("Erro crítico ao obter sessão:", error);
          setLoading(false);
          return;
        }
        
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        
        if (currentUser) {
          await fetchProfile(currentUser.id);
        }
      } catch (error) {
        console.error("Erro na inicialização da sessão:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    // Listener de mudanças de estado (LOGIN/LOGOUT)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        await fetchProfile(currentUser.id);
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // --- FUNÇÕES DE PERFIL (MELHORADAS E PERSISTENTES) ---

  const updateProfile = async (updates) => {
    if (!user) return { error: 'Usuário não autenticado' };
    try {
      // Upsert na tabela profiles (Garante criação se não existir)
      const { data, error } = await supabase
        .from('profiles')
        .upsert({ 
          id: user.id, 
          ...updates, 
          updated_at: new Date().toISOString() 
        })
        .select()
        .single();

      if (!error) {
        setProfile(data);
        
        // Sincronização com Metadata do Auth (Persistência Global)
        await supabase.auth.updateUser({
          data: {
            name: updates.name,
            avatar_url: updates.avatar_url,
            age: updates.age,
            position: updates.position,
            heart_team: updates.heart_team
          }
        });
        toast.success('Perfil atualizado com sucesso!');
      }
      return { data, error };
    } catch (e) {
      console.error('Falha na atualização do perfil:', e);
      toast.error('Erro ao salvar dados');
      return { data: null, error: e };
    }
  };

  const uploadAvatar = async (userId, file) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

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

  // --- FUNÇÕES DE AUTENTICAÇÃO (PRESERVADAS) ---

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
      toast.success('Bem-vindo de volta!');
      return { data, error: null };
    } catch (error) {
      toast.error(error.message === 'Invalid login credentials' ? 'Email ou senha incorretos' : error.message);
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      localStorage.removeItem('selected_baba_id');
      await supabase.auth.signOut();
      setProfile(null);
      setUser(null);
      toast.success('Sessão encerrada');
    } catch (error) {
      toast.error('Erro ao sair');
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

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
