import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Contextos
import { AuthProvider } from './contexts/AuthContext';
import { BabaProvider } from './contexts/BabaContext';
import ProtectedRoute from './components/ProtectedRoute';

// Páginas
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import RankingsPage from './pages/RankingsPage';
import MatchPage from './pages/MatchPage'; // Versão ADM
import MatchPageVisitor from './pages/MatchPageVisitor'; // Versão Visitante
import PlayersPage from './pages/PlayersPage';
import TeamsPage from './pages/TeamsPage';

function App() {
  return (
    <AuthProvider>
      <BabaProvider>
        {/* Toaster gerencia os avisos flutuantes de erro/sucesso */}
        <Toaster position="top-center" reverseOrder={false} />
        
        <Routes>
          {/* Rotas Públicas */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/visitor-match" element={<MatchPageVisitor />} />

          {/* Rotas Protegidas (Só entra logado) */}
          <Route path="/home" element={
            <ProtectedRoute><HomePage /></ProtectedRoute>
          } />
          
          <Route path="/profile" element={
            <ProtectedRoute><ProfilePage /></ProtectedRoute>
          } />

          <Route path="/rankings" element={
            <ProtectedRoute><RankingsPage /></ProtectedRoute>
          } />

          <Route path="/players" element={
            <ProtectedRoute><PlayersPage /></ProtectedRoute>
          } />

          <Route path="/teams" element={
            <ProtectedRoute><TeamsPage /></ProtectedRoute>
          } />

          <Route path="/match" element={
            <ProtectedRoute><MatchPage /></ProtectedRoute>
          } />

          {/* Redirecionamento para 404 ou Home */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BabaProvider>
    </AuthProvider>
  );
}

export default App;
