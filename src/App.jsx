import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// --- CONTEXTOS ---
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { BabaProvider } from './contexts/BabaContext';

// --- COMPONENTES DE SEGURANÇA ---
import ProtectedRoute from './components/ProtectedRoute';

// --- PÁGINAS (Verifique se os nomes dos arquivos na pasta /pages são EXATAMENTE estes) ---
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import RankingsPage from './pages/RankingsPage';
import MatchPage from './pages/MatchPage';          
import MatchPageVisitor from './pages/MatchPageVisitor'; 
import TeamsPage from './pages/TeamsPage';          
import DashboardPage from './pages/DashboardPage'; 
import VisitorMode from './pages/VisitorMode';      
import FinancialPage from './pages/FinancialPage'; 

function AppRoutes() {
  const { user, loading } = useAuth();

  // Se estiver carregando, mostra um fundo preto para não dar "flash" branco
  if (loading) {
    return <div className="min-h-screen bg-black" />;
  }

  return (
    <Routes>
      {/* Landing Page: Ponto de entrada */}
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
      
      {/* Login */}
      <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/dashboard" replace />} />

      {/* Modo Visitante (Preservado) */}
      <Route path="/visitor" element={<VisitorMode />} />
      <Route path="/match-visitor" element={<MatchPageVisitor />} />

      {/* Rotas Protegidas */}
      <Route path="/dashboard" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
      <Route path="/edit-baba/:id" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/financial" element={<ProtectedRoute><FinancialPage /></ProtectedRoute>} />
      <Route path="/rankings" element={<ProtectedRoute><RankingsPage /></ProtectedRoute>} />
      <Route path="/teams" element={<ProtectedRoute><TeamsPage /></ProtectedRoute>} />
      <Route path="/match" element={<ProtectedRoute><MatchPage /></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to={user ? "/dashboard" : "/"} replace />} />
    </Routes>
  );
}

// O componente App PRECISA estar assim para os provedores funcionarem
function App() {
  return (
    <AuthProvider>
      <BabaProvider>
        <Toaster position="top-center" />
        <AppRoutes />
      </BabaProvider>
    </AuthProvider>
  );
}

export default App;
