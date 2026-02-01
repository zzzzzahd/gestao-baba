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

  // 1. Função de busca de Perfil com timeout (PRESERVADA E INTEGRAL)
  const fetchProfile = async (userId) => {
    if (!userId) return;
    
    try {
      // Timeout de 5 segundos para evitar travamento
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
        console.warn("Perfil não encontrado ou erro:", error.message);
      }
    } catch (error) {
      console.warn("Erro ao buscar perfil (ignorado):", error.message);
      // Não bloqueia o login se der erro no perfil
    }
  };

  useEffect(() => {
    // Se Supabase não está configurado, para o loading imediatamente (PRESERVADO)
    if (!supabase || !import.meta.env.VITE_SUPABASE_URL) {
      console.warn('Supabase não configurado - modo offline');
      setLoading(false);
      return;
    }

    let mounted = true;

    // Pega sessão inicial
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (error) {
          console.error("Erro ao obter sessão:", error);
          setLoading(false);
          return;
        }
        
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        
        if (currentUser) {
          await fetchProfile(currentUser.id);
        }
      } catch (error) {
        console.error("Erro na sessão inicial:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    // Listener de mudanças (PRESERVADO)
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

  // --- FUNÇÕES DE PERFIL (MELHORADAS COM NOVOS CAMPOS) ---

  const updateProfile = async (updates) => {
    if (!user) return { error: 'Usuário não logado' };
    try {
      // Upsert na tabela profiles (ADICIONADO: novos campos agora são salvos aqui)
      const { data, error } = await supabase
        .from('profiles')
        .upsert({ 
          id: user.id, 
          ...updates, 
          updated_at: new Date() 
        })
        .select()
        .single();

      if (!error) {
        setProfile(data);
        // NOVO: Sincroniza também com o metadata do Auth para garantir persistência global
        await supabase.auth.updateUser({
          data: {
            name: updates.name,
            avatar_url: updates.avatar_url,
            age: updates.age,
            position: updates.position,
            heart_team: updates.heart_team
          }
        });
        toast.success('Perfil atualizado!');
      }
      return { data, error };
    } catch (e) {
      console.error('Erro ao atualizar perfil:', e);
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

  // --- FUNÇÕES DE AUTENTICAÇÃO (PRESERVADAS INTEGRALMENTE) ---

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
      // Limpa o Baba selecionado ao sair para não dar conflito no próximo login
      localStorage.removeItem('selected_baba_id');
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

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
