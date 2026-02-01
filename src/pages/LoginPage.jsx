import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext'; 
import Logo from '../components/Logo';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const navigate = useNavigate();
  // Importamos o refreshProfile para garantir que o contexto "acorde" após o login
  const { refreshProfile } = useAuth(); 
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });

  // --- FUNÇÕES DE AUTENTICAÇÃO LOCAIS (PRESERVADAS INTEGRALMENTE) ---
  const handleSignIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // Removido o toast daqui para não duplicar, pois o handleSubmit já trata
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const handleSignUp = async (email, password, metadata = {}) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: metadata }
      });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const handleSubmit = async (e) => {
    // IMPORTANTE: O preventDefault evita que o navegador tente recarregar a página (o que causa o 404)
    e.preventDefault();
    if (loading) return;
    
    setLoading(true);

    try {
      if (isLogin) {
        // LOGIN
        const { data, error } = await handleSignIn(formData.email, formData.password);
        
        if (error) throw error;

        if (data?.user) {
          toast.success('Entrando no campo...');
          // Sincroniza o contexto global antes de mudar de página
          await refreshProfile(); 
          // Redirecionamento forçado via React Router
          navigate('/dashboard', { replace: true });
        }
      } else {
        // CRIAR CONTA
        const { error } = await handleSignUp(
          formData.email,
          formData.password,
          { name: formData.name }
        );
        if (error) throw error;
        
        toast.success('Conta criada! Faça seu login.');
        setIsLogin(true);
        setFormData({ ...formData, password: '' });
      }
    } catch (err) {
      const message = err?.message === 'Invalid login credentials'
          ? 'Email ou senha incorretos'
          : err?.message || 'Erro ao processar';
      toast.error(message);
      console.error('Auth Error:', err);
      setLoading(false); // Destrava o botão em caso de erro
    } finally {
      // O loading só deve ser false se NÃO navegarmos, 
      // para evitar o flicker do botão voltando antes da página mudar
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5 bg-black">
      <div className="w-full max-w-md">
        <div className="mb-16">
          <Logo size="large" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <input
              type="text"
              name="name"
              autoComplete="name"
              placeholder="Nome completo"
              value={formData.name}
              onChange={handleChange}
              required
              className="input-tactical"
            />
          )}

          <input
            type="email"
            name="email"
            autoComplete="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
            className="input-tactical"
          />

          <input
            type="password"
            name="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            placeholder="Senha"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={6}
            className="input-tactical"
          />

          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                PROCESSANDO...
              </>
            ) : (
              isLogin ? 'ENTRAR NO BABA' : 'CRIAR MINHA CONTA'
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="btn-secondary"
          >
            {isLogin ? 'NÃO TENHO CONTA (CRIAR AGORA)' : 'JÁ TENHO CONTA (FAZER LOGIN)'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full py-3 bg-white/5 border border-white/10 rounded-xl font-black text-xs uppercase tracking-widest text-white/50 hover:text-white hover:bg-white/10 transition-all"
          >
            ← Voltar para Início
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
