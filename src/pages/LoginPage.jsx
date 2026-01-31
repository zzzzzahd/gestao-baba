import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../components/Logo';

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
        const { error } = await signIn(formData.email, formData.password);
        if (!error) navigate('/dashboard');
      } else {
        const { error } = await signUp(formData.email, formData.password, {
          name: formData.name
        });
        if (!error) {
          setIsLogin(true);
          setFormData({ email: '', password: '', name: '' });
        }
      }
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
        <div className="mb-16">
          <Logo size="large" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 animate-slide-in">
          {!isLogin && (
            <div>
              <input
                type="text"
                name="name"
                placeholder="Nome completo"
                value={formData.name}
                onChange={handleChange}
                required
                className="input-tactical"
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
              className="input-tactical"
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
              className="input-tactical"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            {loading ? (
              <i className="fas fa-spinner fa-spin"></i>
            ) : (
              isLogin ? 'ENTRAR' : 'CRIAR CONTA'
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="btn-secondary"
          >
            {isLogin ? 'CRIAR NOVA CONTA' : 'JÁ TENHO CONTA'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/visitor')}
            className="btn-visitor"
          >
            MODO VISITANTE
          </button>
        </form>

        <div className="mt-8 text-center text-xs opacity-50 text-white">
          <p>Gestão profissional de peladas</p>
          <p className="mt-1">v1.0.0 - 2026</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
