import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../components/Logo';

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

  // ✅ SOLUÇÃO: useEffect controla navegação
  useEffect(() => {
    if (user) {
      navigate('/home');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(formData.email, formData.password);
        // ✅ NÃO navega aqui! useEffect vai navegar
        if (error) {
          setLoading(false);
        }
      } else {
        const { error } = await signUp(formData.email, formData.password, {
          name: formData.name
        });
        if (!error) {
          setIsLogin(true);
          setFormData({ email: '', password: '', name: '' });
        }
        setLoading(false);
      }
    } catch (err) {
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
        <div className="mb-16">
          <Logo size="large" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <input
                type="text"
                name="name"
                placeholder="Nome completo"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full p-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50"
              />
            </div>
          )}

          <div>
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full p-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50"
            />
          </div>

          <div>
            <input
              type="password"
              name="password"
              placeholder="Senha"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
              className="w-full p-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full p-4 bg-cyan-electric text-black font-bold rounded-xl hover:bg-cyan-400 disabled:opacity-50 transition-all"
          >
            {loading ? (
              <span>Aguarde...</span>
            ) : (
              isLogin ? 'ENTRAR' : 'CRIAR CONTA'
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="w-full p-2 text-cyan-electric text-sm hover:text-cyan-300 transition-colors"
          >
            {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça login'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full p-2 text-white/50 text-sm hover:text-white transition-colors"
          >
            ← Voltar
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
