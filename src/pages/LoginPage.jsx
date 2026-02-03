import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../components/Logo';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const navigate = useNavigate();
  const { signIn, signUp, user } = useAuth();
  
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });

  // Redirecionar se já estiver logado
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast.error('Preencha email e senha!');
      return;
    }

    if (!isLogin && !formData.name) {
      toast.error('Preencha seu nome!');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        // LOGIN
        const { error } = await signIn(formData.email, formData.password);
        
        if (error) {
          setLoading(false);
          return;
        }

        // Sucesso - useEffect vai redirecionar
      } else {
        // CADASTRO
        const { error } = await signUp(
          formData.email,
          formData.password,
          { name: formData.name }
        );

        if (error) {
          setLoading(false);
          return;
        }

        // Sucesso no cadastro
        toast.success('Conta criada! Faça login agora.');
        setIsLogin(true);
        setFormData({ email: '', password: '', name: '' });
        setLoading(false);
      }
    } catch (err) {
      console.error('Erro:', err);
      toast.error('Erro ao processar');
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
        <div className="mb-16 flex justify-center">
          <Logo size="large" />
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Nome (só no cadastro) */}
          {!isLogin && (
            <input
              type="text"
              name="name"
              placeholder="NOME COMPLETO"
              value={formData.name}
              onChange={handleChange}
              className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-cyan-electric transition-all uppercase text-xs font-black"
            />
          )}

          {/* Email */}
          <input
            type="email"
            name="email"
            placeholder="EMAIL"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-cyan-electric transition-all uppercase text-xs font-black"
          />

          {/* Senha */}
          <input
            type="password"
            name="password"
            placeholder="SENHA"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={6}
            className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-cyan-electric transition-all uppercase text-xs font-black"
          />

          {/* Botão Principal */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-cyan-electric text-black font-black rounded-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-xs"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <i className="fas fa-spinner fa-spin"></i>
                PROCESSANDO...
              </span>
            ) : (
              isLogin ? 'ENTRAR NO BABA' : 'CRIAR MINHA CONTA'
            )}
          </button>

          {/* Toggle Login/Cadastro */}
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-cyan-electric/60 hover:text-cyan-electric transition-colors"
          >
            {isLogin ? 'NÃO TENHO CONTA (CRIAR AGORA)' : 'JÁ TENHO CONTA (FAZER LOGIN)'}
          </button>

          {/* Botão Voltar */}
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full py-3 bg-white/5 border border-white/10 rounded-xl font-black text-xs uppercase tracking-widest text-white/50 hover:text-white hover:bg-white/10 transition-all"
          >
            ← VOLTAR PARA INÍCIO
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
