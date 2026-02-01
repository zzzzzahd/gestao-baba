import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  // enquanto o Supabase restaura a sessão
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="loader" />
          <p className="text-cyan-electric text-xs tracking-widest">
            VALIDANDO ACESSO TÁTICO...
          </p>
        </div>
      </div>
    );
  }

  // sessão inexistente → login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // sessão OK → libera dashboard
  return children;
}
