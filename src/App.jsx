import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { BabaProvider } from './contexts/BabaContext';

// Páginas
import LandingPage       from './pages/LandingPage';
import LoginPage         from './pages/LoginPage';
import HomePage          from './pages/HomePage';
import ProfilePage       from './pages/ProfilePage';
import TeamsPage         from './pages/TeamsPage';
import MatchPage         from './pages/MatchPage';
import MatchPageVisitor  from './pages/MatchPageVisitor';
import RankingsPage      from './pages/RankingsPage';
import FinancialPage     from './pages/FinancialPage';
import VisitorMode       from './pages/VisitorMode';
import DashboardPage     from './pages/DashboardPage';
import CreatePage        from './pages/CreatePage';
import HistoryPage       from './pages/HistoryPage';

// Componentes globais
import BottomNav      from './components/BottomNav';
import OfflineBanner  from './components/OfflineBanner';
import OnboardingModal, { shouldShowOnboarding } from './components/OnboardingModal';

// ProtectedRoute inline
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-10 h-10 border-4 border-cyan-electric border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  return user ? children : <Navigate to="/login" />;
};

// Inner app — precisa estar dentro do AuthProvider para ler o user
const AppInner = () => {
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Exibir onboarding apenas para usuários recém-cadastrados (Tarefa 4.1)
  useEffect(() => {
    if (user && shouldShowOnboarding()) {
      // Pequeno delay para deixar a HomePage carregar primeiro
      const id = setTimeout(() => setShowOnboarding(true), 800);
      return () => clearTimeout(id);
    }
  }, [user]);

  return (
    <>
      {/* Tarefa 4.6 — Banner de status de conexão */}
      <OfflineBanner />

      <Routes>
        {/* Rotas Públicas */}
        <Route path="/"              element={<LandingPage />} />
        <Route path="/login"         element={<LoginPage />} />
        <Route path="/visitor"       element={<VisitorMode />} />
        <Route path="/visitor-match" element={<MatchPageVisitor />} />

        {/* Rotas Protegidas */}
        <Route path="/home"      element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/create"    element={<ProtectedRoute><CreatePage /></ProtectedRoute>} />
        <Route path="/profile"   element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/teams"     element={<ProtectedRoute><TeamsPage /></ProtectedRoute>} />
        <Route path="/match"     element={<ProtectedRoute><MatchPage /></ProtectedRoute>} />
        <Route path="/rankings"  element={<ProtectedRoute><RankingsPage /></ProtectedRoute>} />
        <Route path="/financial" element={<ProtectedRoute><FinancialPage /></ProtectedRoute>} />
        <Route path="/history"   element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
      </Routes>

      {/* Nav inferior global */}
      <BottomNav />

      {/* Tarefa 4.1 — Onboarding para novos usuários */}
      {showOnboarding && (
        <OnboardingModal onClose={() => setShowOnboarding(false)} />
      )}
    </>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BabaProvider>
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                background:   '#0d0d0d',
                color:        '#fff',
                border:       '1px solid rgba(0, 242, 255, 0.2)',
                borderRadius: '1rem',
                fontFamily:   'Rajdhani, sans-serif',
                fontWeight:   'bold',
              },
              success: { iconTheme: { primary: '#00f2ff', secondary: '#0d0d0d' } },
              error:   { iconTheme: { primary: '#ff003c', secondary: '#0d0d0d' } },
            }}
          />
          <AppInner />
        </BabaProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
