import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { BabaProvider } from './contexts/BabaContext';

// Páginas
import LandingPage      from './pages/LandingPage';
import LoginPage        from './pages/LoginPage';
import HomePage         from './pages/HomePage';
import ProfilePage      from './pages/ProfilePage';
import MatchPageVisitor from './pages/MatchPageVisitor';
import RankingsPage     from './pages/RankingsPage';
import FinancialPage    from './pages/FinancialPage';
import VisitorMode      from './pages/VisitorMode';
import DashboardPage    from './pages/DashboardPage';
import CreatePage       from './pages/CreatePage';
import HistoryPage      from './pages/HistoryPage';
import DrawPage         from './pages/DrawPage';

// Componentes globais
import BottomNav     from './components/BottomNav';
import OfflineBanner from './components/OfflineBanner';
import PageWrapper   from './components/PageWrapper';
import OnboardingModal, { shouldShowOnboarding } from './components/OnboardingModal';

// ─── ProtectedRoute ───────────────────────────────────────────────────────────
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-10 h-10 border-4 border-cyan-electric border-t-transparent rounded-full animate-spin" />
    </div>
  );
  return user ? children : <Navigate to="/login" />;
};

// ─── AppInner (dentro dos providers) ─────────────────────────────────────────
const AppInner = () => {
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (user && shouldShowOnboarding()) {
      const id = setTimeout(() => setShowOnboarding(true), 800);
      return () => clearTimeout(id);
    }
  }, [user]);

  return (
    <>
      <OfflineBanner />

      <Routes>
        {/* Públicas */}
        <Route path="/"              element={<LandingPage />} />
        <Route path="/login"         element={<LoginPage />} />
        <Route path="/visitor"       element={<VisitorMode />} />
        <Route path="/visitor-match" element={<MatchPageVisitor />} />

        {/* Protegidas */}
        <Route path="/home"      element={<ProtectedRoute><PageWrapper><HomePage /></PageWrapper></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><PageWrapper><DashboardPage /></PageWrapper></ProtectedRoute>} />
        <Route path="/create"    element={<ProtectedRoute><PageWrapper><CreatePage /></PageWrapper></ProtectedRoute>} />
        <Route path="/profile"   element={<ProtectedRoute><PageWrapper><ProfilePage /></PageWrapper></ProtectedRoute>} />
        <Route path="/rankings"  element={<ProtectedRoute><PageWrapper><RankingsPage /></PageWrapper></ProtectedRoute>} />
        <Route path="/financial" element={<ProtectedRoute><PageWrapper><FinancialPage /></PageWrapper></ProtectedRoute>} />
        <Route path="/history"   element={<ProtectedRoute><PageWrapper><HistoryPage /></PageWrapper></ProtectedRoute>} />

        {/* Wizard de sorteio */}
        <Route path="/draw" element={<ProtectedRoute><PageWrapper><DrawPage /></PageWrapper></ProtectedRoute>} />

        {/* Redirects de rotas legadas */}
        <Route path="/teams" element={<Navigate to="/draw" replace />} />
        <Route path="/match" element={<Navigate to="/draw" replace />} />
      </Routes>

      <BottomNav />

      {showOnboarding && (
        <OnboardingModal onClose={() => setShowOnboarding(false)} />
      )}
    </>
  );
};

// ─── App root ─────────────────────────────────────────────────────────────────
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
                border:       '1px solid rgba(0,242,255,0.2)',
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
