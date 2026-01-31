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
import DashboardPage from './pages/DashboardPage'; // Página para criar e editar babas

function App() {
  return (
    <AuthProvider>
      <BabaProvider>
        {/* Toaster gerencia os avisos flutuantes de erro/sucesso */}
        <Toaster position="top-center" reverseOrder={false} />
        
        <Routes>
          {/* -----------------------------------------------------------
              ROTAS PÚBLICAS 
              (Qualquer pessoa acessa)
          ----------------------------------------------------------- */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/visitor-match" element={<MatchPageVisitor />} />

          {/* -----------------------------------------------------------
              ROTAS PROTEGIDAS 
              (Só entram usuários logados via ProtectedRoute)
          ----------------------------------------------------------- */}
          
          {/* Página Principal após o Login */}
          <Route path="/home" element={
            <ProtectedRoute><HomePage /></ProtectedRoute>
          } />
          
          {/* Perfil e Gestão de Babas do Usuário */}
          <Route path="/profile" element={
            <ProtectedRoute><ProfilePage /></ProtectedRoute>
          } />

          {/* Ranking Geral de Atletas */}
          <Route path="/rankings" element={
            <ProtectedRoute><RankingsPage /></ProtectedRoute>
          } />

          {/* Gestão de Jogadores (Mensalistas/Diaristas) */}
          <Route path="/players" element={
            <ProtectedRoute><PlayersPage /></ProtectedRoute>
          } />

          {/* Visualização dos Times Sorteados */}
          <Route path="/teams" element={
            <ProtectedRoute><TeamsPage /></ProtectedRoute>
          } />

          {/* Painel de Controle da Partida (Cronômetro/Gols/Faltas) */}
          <Route path="/match" element={
            <ProtectedRoute><MatchPage /></ProtectedRoute>
          } />

          {/* Criação de um Novo Baba */}
          <Route path="/dashboard" element={
            <ProtectedRoute><DashboardPage /></ProtectedRoute>
          } />

          {/* Edição de um Baba já existente (ID passado na URL) */}
          <Route path="/edit-baba/:id" element={
            <ProtectedRoute><DashboardPage /></ProtectedRoute>
          } />

          {/* -----------------------------------------------------------
              REDIRECIONAMENTO 
              (Se a rota não existir, volta para a Landing Page)
          ----------------------------------------------------------- */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BabaProvider>
    </AuthProvider>
  );
}

export default App;
