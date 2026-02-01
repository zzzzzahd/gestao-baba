import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { BabaProvider } from './contexts/BabaContext';
import ProtectedRoute from './components/ProtectedRoute';

// Páginas
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

  // Trava mestre: impede qualquer redirecionamento até o Supabase responder
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-cyan-electric border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Público: Landing Page */}
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
      
      {/* Login: Bloqueia se já estiver logado */}
      <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/dashboard" replace />} />

      {/* Modo Visitante (Totalmente Preservado) */}
      <Route path="/visitor" element={<VisitorMode />} />
      <Route path="/match-visitor" element={<MatchPageVisitor />} />

      {/* Privado (Sincronizado com ProtectedRoute) */}
      <Route path="/dashboard" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
      <Route path="/edit-baba/:id" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/financial" element={<ProtectedRoute><FinancialPage /></ProtectedRoute>} />
      <Route path="/rankings" element={<ProtectedRoute><RankingsPage /></ProtectedRoute>} />
      <Route path="/teams" element={<ProtectedRoute><TeamsPage /></ProtectedRoute>} />
      <Route path="/match" element={<ProtectedRoute><MatchPage /></ProtectedRoute>} />

      {/* Fallback de Segurança */}
      <Route path="*" element={<Navigate to={user ? "/dashboard" : "/"} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BabaProvider>
        <Toaster position="top-center" />
        <AppRoutes />
      </BabaProvider>
    </AuthProvider>
  );
}
