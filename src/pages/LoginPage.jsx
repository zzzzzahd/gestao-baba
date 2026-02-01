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

  // SUBSTITUIÇÃO: Função de ação direta sem depender de evento de formulário
  const handleAction = async () => {
    if (loading) return;

    // Validação Manual
    if (!formData.email || !formData.password || (!isLogin && !formData.name)) {
      toast.error("Preencha todos os campos");
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
        
        // Se chegou aqui, o console já deve mostrar "SIGNED_IN"
        // Forçamos a navegação
        navigate('/dashboard');
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
        
        setIsLogin(true);
        toast.success("Conta criada! Pode entrar.");
      }
    } catch (err) {
      console.error('Erro na ação:', err);
    } finally {
      // Importante: Não setamos loading como false aqui se navegarmos, 
      // para o botão não "piscar" antes de mudar a página
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

        {/* MUDANÇA: Usamos uma div para agrupar os campos, eliminando o risco de 404 por reload */}
        <div className="space-y-4">
          {!isLogin && (
            <input
              type="text"
              name="name"
              autoComplete="name"
              placeholder="Nome completo"
              value={formData.name}
              onChange={handleChange}
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
            className="input-tactical"
          />

          <input
            type="password"
            name="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            placeholder="Senha"
            value={formData.password}
            onChange={handleChange}
            className="input-tactical"
          />

          <button
            type="button" // MUDANÇA: Proteção contra reload involuntário
            onClick={handleAction}
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
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
