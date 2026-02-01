import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../components/Logo';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // LOGIN
        const { error } = await signIn(formData.email, formData.password);
        if (error) throw error;
        
        // Sempre vai pra dashboard depois do login
        navigate('/dashboard');
      } else {
        // CRIAR CONTA
        const { error } = await signUp(
          formData.email,
          formData.password,
          { name: formData.name }
        );
        if (error) throw error;
        
        toast.success('Conta criada! Agora você pode entrar.');
        setIsLogin(true);
        setFormData({ email: '', password: '', name: '' });
      }
    } catch (err) {
      const message =
        err?.message === 'Invalid login credentials'
          ? 'Email ou senha incorretos'
          : err?.message || 'Erro ao processar solicitação';
      toast.error(message);
      console.error('Auth Error:', err);
    } finally {
      setLoading(false);
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
        
        {/* Logo */}
        <div className="mb-16">
          <Logo size="large" />
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Campo Nome (só ao criar conta) */}
          {!isLogin && (
            <input
              type="text"
              name="name"
              placeholder="Nome completo"
              value={formData.name}
              onChange={handleChange}
              required
              className="input-tactical"
            />
          )}

          {/* Campo Email */}
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
            className="input-tactical"
          />

          {/* Campo Senha */}
          <input
            type="password"
            name="password"
            placeholder="Senha"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={6}
            className="input-tactical"
          />

          {/* Botão Principal */}
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

          {/* Toggle Login/Criar Conta */}
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="btn-secondary"
          >
            {isLogin
              ? 'NÃO TENHO CONTA (CRIAR AGORA)'
              : 'JÁ TENHO CONTA (FAZER LOGIN)'}
          </button>

          {/* Botão Voltar */}
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full py-3 bg-white/5 border border-white/10 rounded-xl font-black text-xs uppercase tracking-widest text-white/50 hover:text-white hover:bg-white/10 transition-all"
          >
            ← Voltar para Início
          </button>

          {/* Divisor */}
          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
              <span className="bg-black px-4 text-white/30">
                Draft Baba System
              </span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
