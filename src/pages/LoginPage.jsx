import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleAction = async () => {
    if (loading) return;

    if (!formData.email || !formData.password || (!isLogin && !formData.name)) {
      toast.error('Preencha todos os campos');
      return;
    }

    setLoading(true);

    if (isLogin) {
      const { error } = await signIn(formData.email, formData.password);
      if (error) setLoading(false);
    } else {
      const { error } = await signUp(
        formData.email,
        formData.password,
        { name: formData.name }
      );

      if (!error) {
        toast.success('Conta criada! Pode entrar.');
        setIsLogin(true);
      }
      setLoading(false);
    }
  };

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  return (
    <div className="min-h-screen flex items-center justify-center p-5 bg-black">
      <div className="w-full max-w-md">
        <div className="mb-16">
          <Logo size="large" />
        </div>

        <div className="space-y-4">
          {!isLogin && (
            <input
              type="text"
              name="name"
              placeholder="Nome completo"
              value={formData.name}
              onChange={handleChange}
              className="input-tactical w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white"
            />
          )}

          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            className="input-tactical w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white"
          />

          <input
            type="password"
            name="password"
            placeholder="Senha"
            value={formData.password}
            onChange={handleChange}
            className="input-tactical w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white"
          />

          <button
            onClick={handleAction}
            disabled={loading}
            className="w-full py-4 bg-cyan-electric text-black font-black rounded-xl"
          >
            {loading ? 'PROCESSANDO...' : isLogin ? 'ENTRAR' : 'CRIAR CONTA'}
          </button>

          <button
            onClick={() => setIsLogin(!isLogin)}
            className="w-full py-3 text-xs text-cyan-electric"
          >
            {isLogin ? 'CRIAR CONTA' : 'JÁ TENHO CONTA'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
