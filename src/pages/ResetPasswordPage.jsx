// src/pages/ResetPasswordPage.jsx
// Página acessada pelo link de recuperação de senha enviado por email.
// O Supabase (detectSessionInUrl: true) já processa o token da URL e cria
// uma sessão temporária de recuperação antes deste componente montar.

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import Logo from '../components/Logo';
import toast from 'react-hot-toast';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();

  const [ready, setReady]         = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);

  useEffect(() => {
    // Se o link já foi processado, deve existir uma sessão ativa (evento PASSWORD_RECOVERY).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });

    // Fallback: alguns navegadores/PWAs já processam a URL antes do listener acima montar.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
      else setTimeout(() => {
        supabase.auth.getSession().then(({ data: { session: s2 } }) => {
          if (s2) setReady(true);
          else setInvalidLink(true);
        });
      }, 1500);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('A senha precisa ter no mínimo 8 caracteres');
      return;
    }
    if (password !== confirm) {
      toast.error('As senhas não coincidem');
      return;
    }
    setLoading(true);
    const { error } = await updatePassword(password);
    setLoading(false);
    if (!error) {
      setDone(true);
      setTimeout(() => navigate('/home'), 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5 bg-black">
      <div className="w-full max-w-md">
        <div className="mb-16">
          <Logo size="large" />
        </div>

        {invalidLink ? (
          <div className="text-center space-y-4">
            <p className="text-white font-black uppercase text-sm">
              Link inválido ou expirado
            </p>
            <p className="text-text-low text-xs leading-relaxed">
              Solicite um novo link de recuperação de senha na tela de login.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full p-4 bg-cyan-electric text-black font-bold rounded-xl hover:bg-cyan-400 transition-all"
            >
              Voltar ao login
            </button>
          </div>
        ) : !ready ? (
          <div className="flex justify-center">
            <div className="w-8 h-8 border-4 border-cyan-electric border-t-transparent rounded-full animate-spin" />
          </div>
        ) : done ? (
          <div className="text-center space-y-2">
            <p className="text-white font-black uppercase text-sm">Senha atualizada!</p>
            <p className="text-text-low text-xs">Redirecionando...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-white font-black uppercase text-sm text-center mb-2">
              Criar nova senha
            </p>
            <input
              type="password"
              placeholder="Nova senha (mínimo 8 caracteres)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoFocus
              className="w-full p-4 bg-surface-3 border border-border-strong rounded-xl text-white placeholder-text-low"
            />
            <input
              type="password"
              placeholder="Confirmar nova senha"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              className="w-full p-4 bg-surface-3 border border-border-strong rounded-xl text-white placeholder-text-low"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full p-4 bg-cyan-electric text-black font-bold rounded-xl hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Aguarde...' : 'SALVAR NOVA SENHA'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
