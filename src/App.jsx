import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// --- CONTEXTOS ---
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { BabaProvider } from './contexts/BabaContext';

// --- COMPONENTES DE SEGURANÇA ---
import ProtectedRoute from './components/ProtectedRoute';

// --- PÁGINAS ---
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import RankingsPage from './pages/RankingsPage';
import MatchPage from './pages/MatchPage';          
import TeamsPage from './pages/TeamsPage';          
import DashboardPage from './pages/DashboardPage'; 
import FinancialPage from './pages/FinancialPage'; 

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return null; // Evita redirecionamento errado enquanto carrega sessão

  return (
    <Routes>
      {/* Landing Page: Só acessível se não estiver logado */}
      <Route path="/" element={
        user ? <Navigate to="/dashboard" replace /> : <LandingPage />
      } />

      {/* Login: Se já estiver logado, vai direto para o dashboard */}
      <Route path="/login" element={
        !user ? <LoginPage /> : <Navigate to="/dashboard" replace />
      } />

      {/* Rota Protegida Principal */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <HomePage />
        </ProtectedRoute>
      } />

      <Route path="/edit-baba/:id" element={
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      } />

      <Route path="/profile" element={
        <ProtectedRoute>
          <ProfilePage />
        </ProtectedRoute>
      } />

      <Route path="/financial" element={
        <ProtectedRoute>
          <FinancialPage />
        </ProtectedRoute>
      } />

      <Route path="/rankings" element={
        <ProtectedRoute>
          <RankingsPage />
        </ProtectedRoute>
      } />

      <Route path="/teams" element={
        <ProtectedRoute>
          <TeamsPage />
        </ProtectedRoute>
      } />

      <Route path="/match" element={
        <ProtectedRoute>
          <MatchPage />
        </ProtectedRoute>
      } />

      {/* Fallback inteligente */}
      <Route path="*" element={<Navigate to={user ? "/dashboard" : "/"} replace />} />
    </Routes>
  );
}

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
