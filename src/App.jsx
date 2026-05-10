// src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { BabaProvider } from './contexts/BabaContext';

// Páginas
import LandingPage        from './pages/LandingPage';
import LoginPage          from './pages/LoginPage';
import HomePage           from './pages/HomePage';
import ProfilePage        from './pages/ProfilePage';
import PublicProfilePage  from './pages/PublicProfilePage';
import MatchPageVisitor   from './pages/MatchPageVisitor';
import RankingsPage       from './pages/RankingsPage';
import FinancialPage      from './pages/FinancialPage';
import VisitorMode        from './pages/VisitorMode';
import DashboardPage      from './pages/DashboardPage';
import CreatePage         from './pages/CreatePage';
import HistoryPage        from './pages/HistoryPage';
import DrawPage           from './pages/DrawPage';
import PrivacyPage        from './pages/PrivacyPage';
import TermsPage          from './pages/TermsPage';
import JoinPage           from './pages/JoinPage';

// Componentes globais
import BottomNav     from './components/BottomNav';
import OfflineBanner from './components/OfflineBanner';
import PageWrapper   from './components/PageWrapper';
import PushPrompt    from './components/PushPrompt';
import ConsentModal  from './components/ConsentModal';
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

// ─── AppInner ─────────────────────────────────────────────────────────────────
const AppInner = () => {
  const { user, profile } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [needsConsent,   setNeedsConsent]   = useState(false);

  // Onboarding (apenas uma vez)
  useEffect(() => {
    if (user && shouldShowOnboarding()) {
      const id = setTimeout(() => setShowOnboarding(true), 800);
      return () => clearTimeout(id);
    }
  }, [user]);

  // Push prompt (3s após login)
  useEffect(() => {
    if (!user) { setShowPushPrompt(false); return; }
    const id = setTimeout(() => setShowPushPrompt(true), 3000);
    return () => clearTimeout(id);
  }, [user]);

  // Sprint 10.5 — verificar consentimento LGPD
  useEffect(() => {
    if (user && profile && !profile.consent_at) {
      setNeedsConsent(true);
    } else {
      setNeedsConsent(false);
    }
  }, [user, profile]);

  return (
    <>
      <OfflineBanner />

      <Routes>
        {/* Públicas */}
        <Route path="/"              element={<LandingPage />} />
        <Route path="/login"         element={<LoginPage />} />
        <Route path="/visitor"       element={<VisitorMode />} />
        <Route path="/visitor-match" element={<MatchPageVisitor />} />
        <Route path="/privacidade"   element={<PrivacyPage />} />
        <Route path="/termos"        element={<TermsPage />} />
        <Route path="/join/:code"    element={<JoinPage />} />
        <Route path="/player/:userId" element={<PublicProfilePage />} />

        {/* Protegidas */}
        <Route path="/home"      element={<ProtectedRoute><PageWrapper><HomePage /></PageWrapper></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><PageWrapper><DashboardPage /></PageWrapper></ProtectedRoute>} />
        <Route path="/create"    element={<ProtectedRoute><PageWrapper><CreatePage /></PageWrapper></ProtectedRoute>} />
        <Route path="/profile"   element={<ProtectedRoute><PageWrapper><ProfilePage /></PageWrapper></ProtectedRoute>} />
        <Route path="/rankings"  element={<ProtectedRoute><PageWrapper><RankingsPage /></PageWrapper></ProtectedRoute>} />
        <Route path="/financial" element={<ProtectedRoute><PageWrapper><FinancialPage /></PageWrapper></ProtectedRoute>} />
        <Route path="/history"   element={<ProtectedRoute><PageWrapper><HistoryPage /></PageWrapper></ProtectedRoute>} />
        <Route path="/draw"      element={<ProtectedRoute><PageWrapper><DrawPage /></PageWrapper></ProtectedRoute>} />

        {/* Redirects */}
        <Route path="/teams" element={<Navigate to="/draw" replace />} />
        <Route path="/match" element={<Navigate to="/draw" replace />} />
      </Routes>

      <BottomNav />

      {/* Sprint 10.5 — Consentimento LGPD (bloqueia tudo até aceitar) */}
      {needsConsent && (
        <ConsentModal onAccepted={() => setNeedsConsent(false)} />
      )}

      {/* Push prompt — só exibe se já deu consent */}
      {showPushPrompt && !needsConsent && <PushPrompt />}

      {/* Onboarding — só exibe se já deu consent */}
      {showOnboarding && !needsConsent && (
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
