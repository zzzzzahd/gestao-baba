import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Enquanto o Supabase verifica a sessão, mantemos o usuário nesta tela.
  // Sem o timer de 10 segundos, evitamos que o sistema "desista" da conexão.
  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-4 font-tactical">
        <Loader2 className="animate-spin text-cyan-electric" size={40} />
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-electric animate-pulse">
          VALIDANDO ACESSO TÁTICO...
        </span>
      </div>
    );
  }

  // Se o carregamento terminou e realmente não há usuário logado, vai para o login.
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Se estiver logado, libera o acesso aos componentes filhos (Dashboard, etc).
  return children;
};

export default ProtectedRoute;
