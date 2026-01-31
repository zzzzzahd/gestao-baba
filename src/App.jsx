import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// --- CONTEXTOS ---
import { AuthProvider } from './contexts/AuthContext';
import { BabaProvider } from './contexts/BabaContext';

// --- COMPONENTES DE SEGURANÇA ---
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
        {/* Toaster: Estilizado para o tema Dark/Cyan do Draft Baba */}
        <Toaster 
          position="top-center" 
          reverseOrder={false}
          toastOptions={{
            duration: 3000,
            style: {
              background: '#0a0a0a',
              color: '#fff',
              border: '1px solid rgba(0, 242, 255, 0.3)',
              borderRadius: '1rem',
              fontSize: '12px',
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              padding: '16px'
            },
            success: {
              iconTheme: {
                primary: '#00f2ff',
                secondary: '#000',
              },
            },
            error: {
              iconTheme: {
                primary: '#ff4b4b',
                secondary: '#fff',
              },
              style: {
                border: '1px solid rgba(255, 75, 75, 0.3)',
              }
            }
          }}
        />
        
        <Routes>
          {/* --- ROTAS PÚBLICAS --- */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<LoginPage />} />
          
          {/* Fluxo do Visitante (Ferramentas Rápidas) */}
          <Route path="/visitor" element={<VisitorMode />} />
          <Route path="/visitor-match" element={<MatchPageVisitor />} />

          {/* HomePage: Híbrida (Lógica tratada internamente pelo BabaContext) */}
          <Route path="/home" element={<HomePage />} />

          {/* --- ROTAS PROTEGIDAS (Necessitam Login) --- */}
          
          {/* Dashboard: Gestão de Grupos de Baba */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } />

          {/* Edição de Baba específico (Reutiliza Dashboard com ID) */}
          <Route path="/edit-baba/:id" element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } />

          {/* Perfil do Atleta e Estatísticas Pessoais */}
          <Route path="/profile" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />

          {/* Financeiro: PIX e Controle de Caixa */}
          <Route path="/financial" element={
            <ProtectedRoute>
              <FinancialPage />
            </ProtectedRoute>
          } />

          {/* Rankings: Artilharia e Assistências Oficiais */}
          <Route path="/rankings" element={
            <ProtectedRoute>
              <RankingsPage />
            </ProtectedRoute>
          } />

          {/* Teams: Painel de Sorteio e Lista de Jogadores para o Jogo de Hoje */}
          <Route path="/teams" element={
            <ProtectedRoute>
              <TeamsPage />
            </ProtectedRoute>
          } />

          {/* Match: Controle de Tempo, Gols e Fila de Espera (Painel ADM) */}
          <Route path="/match" element={
            <ProtectedRoute>
              <MatchPage />
            </ProtectedRoute>
          } />

          {/* Fallback de Segurança: Qualquer rota não mapeada volta para a Landing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BabaProvider>
    </AuthProvider>
  );
}

export default App;
