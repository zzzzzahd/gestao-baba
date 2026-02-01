import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; 
import Logo from '../components/Logo';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const navigate = useNavigate();
  // SUBSTITUIÇÃO: Usamos o signIn/signUp do contexto para evitar que o formulário dê erro 404
  const { signIn, signUp } = useAuth(); 
  
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });

  const handleSubmit = async (e) => {
    // IMPORTANTE: preventDefault evita o erro 404 mostrado no seu print
    e.preventDefault();
    if (loading) return;
    
    setLoading(true);

    try {
      if (isLogin) {
        // SUBSTITUIÇÃO: Chamada direta ao contexto para validar a sessão globalmente
        const { error } = await signIn(formData.email, formData.password);
        
        if (error) {
          setLoading(false);
          return;
        }
        
        // Se logou, redirecionamos para a dashboard
        navigate('/dashboard');
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
        setFormData({ email: '', password: '', name: '' });
      }
    } catch (err) {
      console.error('Erro no Submit:', err);
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
