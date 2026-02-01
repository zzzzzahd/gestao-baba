import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const [timeoutReached, setTimeoutReached] = useState(false);

  // Timeout de segurança: se ficar carregando mais de 10 segundos, para
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        console.warn('Timeout atingido no ProtectedRoute');
        setTimeoutReached(true);
      }, 10000); // 10 segundos

      return () => clearTimeout(timeout);
    }
  }, [loading]);

  // Se atingiu timeout, trata como não autenticado
  if (timeoutReached && loading) {
    console.error('Loading travou - redirecionando para login');
    return <Navigate to="/login" replace />;
  }

  // Enquanto verifica a sessão no Supabase, mostra um carregamento discreto
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-cyan-electric" size={40} />
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">
          Autenticando Atleta...
        </span>
      </div>
    );
  }

  // Se não houver usuário logado, redireciona para a tela de login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Se estiver logado, libera o acesso aos componentes filhos
  return children;
};

export default ProtectedRoute;
