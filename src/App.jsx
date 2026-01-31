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
// Se você tiver a página onde cria os babas, importe-a aqui. 
// Exemplo: import DashboardPage from './pages/DashboardPage';

function App() {
  return (
    <AuthProvider>
      <BabaProvider>
        <Toaster position="top-center" reverseOrder={false} />
        
        <Routes>
          {/* Rotas Públicas */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/visitor-match" element={<MatchPageVisitor />} />

          {/* Rotas Protegidas */}
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

          {/* NOVA ROTA DE EDIÇÃO: 
              Ela usa o mesmo componente que você usa para criar Babas, 
              mas passando o ID na URL */}
          <Route path="/edit-baba/:id" element={
            <ProtectedRoute>
               {/* Aqui você deve colocar a página que cria o Baba. 
                   Se ainda não criou uma página separada, pode apontar para o seu Dashboard */}
               <div className="bg-black min-h-screen text-white p-10">Página de Edição (Em construção)</div>
            </ProtectedRoute>
          } />

          <Route path="/dashboard" element={
            <ProtectedRoute>
              <div className="bg-black min-h-screen text-white p-10">Página de Criação/Dashboard</div>
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BabaProvider>
    </AuthProvider>
  );
}

export default App;
