import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../components/Logo';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const navigate = useNavigate();
  const { signIn, signUp, user, loading: authLoading } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });

  // Redirecionamento seguro
  useEffect(() => {
    if (user && !authLoading) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleAction = async () => {
    if (loading) return;

    if (!formData.email || !formData.password || (!isLogin && !formData.name)) {
      toast.error('Preencha todos os campos');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(formData.email, formData.password);
        if (error) {
          setLoading(false);
        }
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
    } catch (err) {
      setLoading(false);
      toast.error("Erro na comunicação");
    }
  };

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  return (
    <div className="min-h-screen flex items-center justify-center p-5 bg-black font-tactical">
      <div className="w-full max-w-md">
        <div className="mb-16 flex justify-center">
          <Logo size="large" />
        </div>

        <div className="space-y-4">
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

          <input
            type="email"
            name="email"
            placeholder="EMAIL"
            value={formData.email}
            onChange={handleChange}
            className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-cyan-electric transition-all uppercase text-xs font-black"
          />

          <input
            type="password"
            name="password"
            placeholder="SENHA"
            value={formData.password}
            onChange={handleChange}
            className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-cyan-electric transition-all uppercase text-xs font-black"
          />

          <button
            onClick={handleAction}
            disabled={loading}
            className="w-full py-4 bg-cyan-electric text-black font-black rounded-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 uppercase tracking-widest text-xs"
          >
            {loading ? 'PROCESSANDO...' : isLogin ? 'ENTRAR NO BABA' : 'CRIAR MINHA CONTA'}
          </button>

          <button
            onClick={() => setIsLogin(!isLogin)}
            className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-cyan-electric/60 hover:text-cyan-electric transition-colors"
          >
            {isLogin ? 'NÃO TENHO CONTA (CRIAR AGORA)' : 'JÁ TENHO CONTA (FAZER LOGIN)'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
