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

  const handleAction = async () => {
    if (loading) return;

    if (!formData.email || !formData.password || (!isLogin && !formData.name)) {
      toast.error("Preencha todos os campos");
      return;
    }
    
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(formData.email, formData.password);
        
        if (error) {
          setLoading(false);
          return;
        }
        
        // CORREÇÃO: Forçamos o redirecionamento nativo para limpar o estado 
        // e garantir que a Vercel encontre a rota /dashboard
        window.location.href = '/dashboard';
      } else {
        const { error } = await signUp(
          formData.email, 
          formData.password, 
          { name: formData.name }
        );
        
        if (error) {
          setLoading(false);
          return;
        }
        
        setIsLogin(true);
        setLoading(false);
        toast.success("Conta criada! Pode entrar.");
      }
    } catch (err) {
      console.error('Erro na ação:', err);
      setLoading(false);
      toast.error("Falha na comunicação com o servidor");
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

        <div className="space-y-4">
          {!isLogin && (
            <input
              type="text"
              name="name"
              autoComplete="name"
              placeholder="Nome completo"
              value={formData.name}
              onChange={handleChange}
              className="input-tactical w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-cyan-electric transition-all"
            />
          )}

          <input
            type="email"
            name="email"
            autoComplete="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            className="input-tactical w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-cyan-electric transition-all"
          />

          <input
            type="password"
            name="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            placeholder="Senha"
            value={formData.password}
            onChange={handleChange}
            className="input-tactical w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-cyan-electric transition-all"
          />

          <button
            type="button"
            onClick={handleAction}
            disabled={loading}
            className="w-full py-4 bg-cyan-electric text-black font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                PROCESSANDO...
              </>
            ) : (
              isLogin ? 'ENTRAR NO BABA' : 'CRIAR MINHA CONTA'
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="w-full py-3 text-xs font-black uppercase tracking-widest text-cyan-electric/60 hover:text-cyan-electric transition-colors"
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
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
