// src/App.jsx
// Sprint 9 — BetaFeedback + useBetaAnalytics integrados.

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { BabaProvider } from './contexts/BabaContext';
import { getNewlyUnlocked, UNLOCK_MESSAGES } from './utils/progressiveFeaturesUnlock';
import { useBetaAnalytics } from './hooks/useBetaAnalytics';

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
import TournamentPage     from './pages/TournamentPage';

import BottomNav     from './components/BottomNav';
import OfflineBanner from './components/OfflineBanner';
import PageWrapper   from './components/PageWrapper';
import PushPrompt    from './components/PushPrompt';
import ConsentModal  from './components/ConsentModal';
import OnboardingModal, { shouldShowOnboarding } from './components/OnboardingModal';
import ChangelogModal, { shouldShowChangelog }    from './components/ChangelogModal';
import FeedbackModal  from './components/FeedbackModal';
import BetaFeedback, { shouldShowBetaFeedback }   from './components/BetaFeedback';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-10 h-10 border-4 border-cyan-electric border-t-transparent rounded-full animate-spin" />
    </div>
  );
  return user ? children : <Navigate to="/login" />;
};

const PUSH_ELIGIBLE_KEY = 'push_eligible_after_confirm';

const AppInner = () => {
  const { user, profile }                 = useAuth();
  const { trackFunnelStep, FUNNEL_STEPS } = useBetaAnalytics();

  const [showOnboarding,   setShowOnboarding]   = useState(false);
  const [showPushPrompt,   setShowPushPrompt]   = useState(false);
  const [showChangelog,    setShowChangelog]    = useState(false);
  const [showFeedback,     setShowFeedback]     = useState(false);
  const [showBetaFeedback, setShowBetaFeedback] = useState(false);
  const [needsConsent,     setNeedsConsent]     = useState(null);

  useEffect(() => {
    if (!user) { setNeedsConsent(false); return; }
    if (profile === undefined) return;
    setNeedsConsent(profile ? !profile.consent_at : false);
  }, [user, profile]);

  useEffect(() => {
    if (!user || !profile || needsConsent !== false) return;
    const gamesPlayed = profile.games_played ?? 0;
    if (gamesPlayed === 0) return;
    const savedKey = `draft_play_games_played_${user.id}`;
    const saved    = parseInt(localStorage.getItem(savedKey) || '0', 10);
    if (gamesPlayed > saved) {
      const newlyUnlocked = getNewlyUnlocked(saved, gamesPlayed);
      newlyUnlocked.forEach((feat, i) => {
        if (UNLOCK_MESSAGES[feat]) {
          setTimeout(() => toast(UNLOCK_MESSAGES[feat], { icon: '🎉', duration: 5000 }), (i + 1) * 1500);
        }
      });
      localStorage.setItem(savedKey, String(gamesPlayed));
    }
    if (shouldShowBetaFeedback(gamesPlayed)) {
      setTimeout(() => setShowBetaFeedback(true), 3000);
    }
  }, [user?.id, profile?.games_played, needsConsent]);

  useEffect(() => {
    if (!user || !profile) return;
    if ((profile.games_played ?? 0) >= 1) {
      trackFunnelStep(FUNNEL_STEPS.FIRST_MATCH, { games: profile.games_played });
    }
  }, [user?.id, profile?.games_played]);

  useEffect(() => {
    if (!user || needsConsent !== false) return;
    if (shouldShowOnboarding()) {
      const id = setTimeout(() => setShowOnboarding(true), 1000);
      return () => clearTimeout(id);
    }
    if (shouldShowChangelog()) {
      const id = setTimeout(() => setShowChangelog(true), 1500);
      return () => clearTimeout(id);
    }
  }, [user, needsConsent]);

  useEffect(() => {
    if (!user || needsConsent !== false) { setShowPushPrompt(false); return; }
    const eligible =
      sessionStorage.getItem(PUSH_ELIGIBLE_KEY) === 'true' ||
      localStorage.getItem(PUSH_ELIGIBLE_KEY)   === 'true';
    if (eligible) {
      const id = setTimeout(() => setShowPushPrompt(true), 2000);
      return () => clearTimeout(id);
    }
  }, [user, needsConsent]);

  useEffect(() => {
    window.__markPushEligible = () => {
      localStorage.setItem(PUSH_ELIGIBLE_KEY, 'true');
      sessionStorage.setItem(PUSH_ELIGIBLE_KEY, 'true');
      setShowPushPrompt(true);
    };
    return () => { delete window.__markPushEligible; };
  }, []);

  if (needsConsent === null && user) return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-10 h-10 border-4 border-cyan-electric border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <>
      <OfflineBanner />
      <Routes>
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
        <Route path="/home"       element={<ProtectedRoute><PageWrapper><HomePage /></PageWrapper></ProtectedRoute>} />
        <Route path="/dashboard"  element={<ProtectedRoute><PageWrapper><DashboardPage /></PageWrapper></ProtectedRoute>} />
        <Route path="/create"     element={<ProtectedRoute><PageWrapper><CreatePage /></PageWrapper></ProtectedRoute>} />
        <Route path="/profile"    element={<ProtectedRoute><PageWrapper><ProfilePage /></PageWrapper></ProtectedRoute>} />
        <Route path="/rankings"   element={<ProtectedRoute><PageWrapper><RankingsPage /></PageWrapper></ProtectedRoute>} />
        <Route path="/financial"  element={<ProtectedRoute><PageWrapper><FinancialPage /></PageWrapper></ProtectedRoute>} />
        <Route path="/history"    element={<ProtectedRoute><PageWrapper><HistoryPage /></PageWrapper></ProtectedRoute>} />
        <Route path="/draw"       element={<ProtectedRoute><PageWrapper><DrawPage /></PageWrapper></ProtectedRoute>} />
        <Route path="/comparison" element={<ProtectedRoute><PageWrapper><ComparisonPage /></PageWrapper></ProtectedRoute>} />
        <Route path="/tournament" element={<ProtectedRoute><PageWrapper><TournamentPage /></PageWrapper></ProtectedRoute>} />
        <Route path="/teams" element={<Navigate to="/draw" replace />} />
        <Route path="/match" element={<Navigate to="/draw" replace />} />
      </Routes>
      <BottomNav />
      {needsConsent === true && <ConsentModal onAccepted={() => setNeedsConsent(false)} />}
      {showPushPrompt && needsConsent === false && <PushPrompt />}
      {showOnboarding && needsConsent === false && <OnboardingModal onClose={() => setShowOnboarding(false)} />}
      {showChangelog && needsConsent === false && !showOnboarding && (
        <ChangelogModal isOpen onClose={() => setShowChangelog(false)} />
      )}
      {showBetaFeedback && needsConsent === false && (
        <BetaFeedback onClose={() => setShowBetaFeedback(false)} />
      )}
      {user && needsConsent === false && (
        <button
          onClick={() => setShowFeedback(true)}
          aria-label="Enviar feedback"
          className="fixed bottom-28 right-4 z-50 w-10 h-10 rounded-full bg-surface-2 border border-border-mid text-text-low hover:text-cyan-electric hover:border-cyan-electric/30 transition-all shadow-glass flex items-center justify-center active:scale-90"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
      )}
      <FeedbackModal isOpen={showFeedback} onClose={() => setShowFeedback(false)} />
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
