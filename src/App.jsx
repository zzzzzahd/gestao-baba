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
import FollowersPage      from './pages/FollowersPage';
import JoinPage           from './pages/JoinPage';
import ComparisonPage     from './pages/ComparisonPage';

// Componentes globais
import BottomNav     from './components/BottomNav';
import OfflineBanner from './components/OfflineBanner';
import PageWrapper   from './components/PageWrapper';
import PushPrompt    from './components/PushPrompt';
import ConsentModal  from './components/ConsentModal';
import OnboardingModal, { shouldShowOnboarding } from './components/OnboardingModal';
import ChangelogModal, { shouldShowChangelog } from './components/ChangelogModal';
import FeedbackModal from './components/FeedbackModal';

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

// Chave para rastrear elegibilidade do push (após 1ª confirmação de presença)
const PUSH_ELIGIBLE_KEY = 'push_eligible_after_confirm';

// ─── AppInner ─────────────────────────────────────────────────────────────────
const AppInner = () => {
  const { user, profile } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [showChangelog,  setShowChangelog]  = useState(false);
  const [showFeedback,   setShowFeedback]   = useState(false);
  // null = ainda carregando (evita flash); false = sem consentimento necessário; true = precisa consentir
  const [needsConsent, setNeedsConsent] = useState(null);

  // Verificar consentimento LGPD — só decide depois do profile carregar
  useEffect(() => {
    if (!user) { setNeedsConsent(false); return; }
    if (profile === undefined) return; // ainda carregando — aguarda
    setNeedsConsent(profile ? !profile.consent_at : false);
  }, [user, profile]);

  // Onboarding (apenas uma vez, após consentimento resolvido)
  useEffect(() => {
    if (!user || needsConsent !== false) return;
    if (shouldShowOnboarding()) {
      const id = setTimeout(() => setShowOnboarding(true), 1000);
      return () => clearTimeout(id);
    }
    // Changelog: só exibe se não é onboarding (usuário já conhece o app)
    if (shouldShowChangelog()) {
      const id = setTimeout(() => setShowChangelog(true), 1500);
      return () => clearTimeout(id);
    }
  }, [user, needsConsent]);

  // Push prompt — só após confirmar presença (sinalizado via window.__markPushEligible)
  // OU na 2ª sessão se já confirmou antes.
  useEffect(() => {
    if (!user || needsConsent !== false) { setShowPushPrompt(false); return; }
    const eligible =
      sessionStorage.getItem(PUSH_ELIGIBLE_KEY) === 'true' ||
      localStorage.getItem(PUSH_ELIGIBLE_KEY) === 'true';
    if (eligible) {
      const id = setTimeout(() => setShowPushPrompt(true), 2000);
      return () => clearTimeout(id);
    }
  }, [user, needsConsent]);

  // Expor helper global para que PresenceConfirmation marque elegibilidade após 1ª confirmação
  useEffect(() => {
    window.__markPushEligible = () => {
      localStorage.setItem(PUSH_ELIGIBLE_KEY, 'true');
      sessionStorage.setItem(PUSH_ELIGIBLE_KEY, 'true');
      setShowPushPrompt(true);
    };
    return () => { delete window.__markPushEligible; };
  }, []);

  // Spinner enquanto aguarda profile carregar (evita flash do modal de consentimento)
  if (needsConsent === null && user) return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-10 h-10 border-4 border-cyan-electric border-t-transparent rounded-full animate-spin" />
    </div>
  );

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
        <Route path="/player/:userId"    element={<PublicProfilePage />} />
        <Route path="/followers/:userId" element={<FollowersPage />} />
        <Route path="/followers"         element={<FollowersPage />} />

        {/* Protegidas */}
        <Route path="/home"      element={<ProtectedRoute><PageWrapper><HomePage /></PageWrapper></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><PageWrapper><DashboardPage /></PageWrapper></ProtectedRoute>} />
        <Route path="/create"    element={<ProtectedRoute><PageWrapper><CreatePage /></PageWrapper></ProtectedRoute>} />
        <Route path="/profile"   element={<ProtectedRoute><PageWrapper><ProfilePage /></PageWrapper></ProtectedRoute>} />
        <Route path="/rankings"  element={<ProtectedRoute><PageWrapper><RankingsPage /></PageWrapper></ProtectedRoute>} />
        <Route path="/financial" element={<ProtectedRoute><PageWrapper><FinancialPage /></PageWrapper></ProtectedRoute>} />
        <Route path="/history"    element={<ProtectedRoute><PageWrapper><HistoryPage /></PageWrapper></ProtectedRoute>} />
        <Route path="/draw"       element={<ProtectedRoute><PageWrapper><DrawPage /></PageWrapper></ProtectedRoute>} />
        <Route path="/comparison" element={<ProtectedRoute><PageWrapper><ComparisonPage /></PageWrapper></ProtectedRoute>} />

        {/* Redirects */}
        <Route path="/teams" element={<Navigate to="/draw" replace />} />
        <Route path="/match" element={<Navigate to="/draw" replace />} />
      </Routes>

      <BottomNav />

      {/* Consentimento LGPD — bloqueia tudo até aceitar, sem flash */}
      {needsConsent === true && (
        <ConsentModal onAccepted={() => setNeedsConsent(false)} />
      )}

      {/* Push prompt — só exibe se já deu consent e é elegível */}
      {showPushPrompt && needsConsent === false && <PushPrompt />}

      {/* Onboarding — só exibe se já deu consent */}
      {showOnboarding && needsConsent === false && (
        <OnboardingModal onClose={() => setShowOnboarding(false)} />
      )}

      {/* Changelog — novidades da versão, após onboarding */}
      {showChangelog && needsConsent === false && !showOnboarding && (
        <ChangelogModal isOpen onClose={() => setShowChangelog(false)} />
      )}

      {/* Botão flutuante de feedback (visível apenas para usuários logados) */}
      {user && needsConsent === false && (
        <button
          onClick={() => setShowFeedback(true)}
          aria-label="Enviar feedback ou reportar bug"
          title="Feedback"
          className="fixed bottom-28 right-4 z-50 w-10 h-10 rounded-full bg-surface-2 border border-border-mid text-text-low hover:text-cyan-electric hover:border-cyan-electric/30 transition-all shadow-glass flex items-center justify-center active:scale-90"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
      )}

      {/* Feedback modal */}
      <FeedbackModal isOpen={showFeedback} onClose={() => setShowFeedback(false)} />
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
