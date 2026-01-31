import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../components/Logo';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth(); // Funções injetadas via Contexto
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
        // O Contexto AuthContext gerencia a chamada ao Supabase internamente
        const { error } = await signIn(formData.email, formData.password);
        if (error) throw error;
        
        toast.success("Login realizado com sucesso!");
        navigate('/dashboard');
      } else {
        // O Contexto gerencia a criação de conta e o metadata (nome)
        const { error } = await signUp(formData.email, formData.password, {
          name: formData.name
        });
        
        if (error) throw error;

        toast.success("Conta criada! Agora você pode entrar.");
        setIsLogin(true); // Muda para aba de login
        setFormData({ email: '', password: '', name: '' });
      }
    } catch (err) {
      // Evita tela branca capturando qualquer erro de conexão ou credenciais
      const message = err.message || "Erro ao processar solicitação";
      toast.error(message === "Invalid login credentials" ? "Email ou senha incorretos" : message);
      console.error("Auth Error:", err);
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
            <div className="animate-fade-in">
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
            className="btn-primary flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <i className="fas fa-spinner fa-spin"></i> PROCESSANDO...
              </span>
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

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10"></span></div>
            <div className="relative flex justify-center text-[10px] uppercase font-black tracking
