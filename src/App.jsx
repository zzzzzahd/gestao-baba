import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// --- CONTEXTOS ---
// Provedores de estado global para Autenticação e Dados do Baba
import { AuthProvider } from './contexts/AuthContext';
import { BabaProvider } from './contexts/BabaContext';

// --- COMPONENTES DE SEGURANÇA ---
// Protege rotas que exigem login obrigatório
import ProtectedRoute from './components/ProtectedRoute';

// --- PÁGINAS ---
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import RankingsPage from './pages/RankingsPage';
import MatchPage from './pages/MatchPage';         // Painel de Jogo Oficial (ADM)
import MatchPageVisitor from './pages/MatchPageVisitor'; // Painel de Jogo Rápido (Visitante)
import TeamsPage from './pages/TeamsPage';         // Visualização de Times e Sorteio Oficial
import DashboardPage from './pages/DashboardPage'; // Criação e Edição de Babas
import VisitorMode from './pages/VisitorMode';     // Tela de boas-vindas ao Modo Visitante
import FinancialPage from './pages/FinancialPage'; // Gestão de Mensalidades e PIX

function App() {
  return (
    <AuthProvider>
      <BabaProvider>
        {/* Toaster: Gerencia notificações de sucesso/erro em todo o app */}
        <Toaster 
          position="top-center" 
          reverseOrder={false}
          toastOptions={{
            style: {
              background: '#1a1a1a',
              color: '#fff',
              border: '1px solid rgba(0, 242, 255, 0.2)',
              fontFamily: 'sans-serif',
              fontSize: '14px'
            }
          }}
        />
        
        <Routes>
          {/* -----------------------------------------------------------
              ROTAS PÚBLICAS 
              Acessíveis por qualquer pessoa (Visitantes ou não logados)
          ----------------------------------------------------------- */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          
          {/* Rota de registro aponta para LoginPage que gerencia o estado isLogin */}
          <Route path="/register" element={<LoginPage />} />
          
          {/* Fluxo do Visitante */}
          <Route path="/visitor" element={<VisitorMode />} />
          <Route path="/visitor-match" element={<MatchPageVisitor />} />

          {/* A HomePage é HÍBRIDA. 
            - Se logado: Mostra o Baba atual do usuário.
            - Se não logado: Mostra o Sorteador Manual.
            Por isso, ela NÃO fica dentro do ProtectedRoute.
          */}
          <Route path="/home" element={<HomePage />} />

          {/* -----------------------------------------------------------
              ROTAS PROTEGIDAS 
              Exigem que o usuário esteja logado (via ProtectedRoute)
          ----------------------------------------------------------- */}
          
          {/* Dashboard: Onde o usuário gerencia seus Babas ou cria um novo */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } />

          {/* Edição de Baba específico */}
          <Route path="/edit-baba/:id" element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } />

          {/* Perfil do Atleta e Configurações de Conta */}
          <Route path="/profile" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />

          {/* Gestão Financeira: PIX, mensalidades e confirmação de pagamentos */}
          <Route path="/financial" element={
            <ProtectedRoute>
              <FinancialPage />
            </ProtectedRoute>
          } />

          {/* Rankings: Estatísticas de Gols, Assistências e Vitórias */}
          <Route path="/rankings" element={
            <ProtectedRoute>
              <RankingsPage />
            </ProtectedRoute>
          } />

          {/* Times: Visualização da escalação oficial gerada pelo sistema */}
          <Route path="/teams" element={
            <ProtectedRoute>
              <TeamsPage />
            </ProtectedRoute>
          } />

          {/* Match: O painel de controle da partida em tempo real para o ADM */}
          <Route path="/match" element={
            <ProtectedRoute>
              <MatchPage />
            </ProtectedRoute>
          } />

          {/* -----------------------------------------------------------
              REDIRECIONAMENTO DE SEGURANÇA
              Caso o usuário digite uma URL que não existe
          ----------------------------------------------------------- */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BabaProvider>
    </AuthProvider>
  );
}

export default App;
