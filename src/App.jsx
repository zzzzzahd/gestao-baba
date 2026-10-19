// src/App.jsx
// Sprint 9 — BetaFeedback + useBetaAnalytics integrados.
// + Lazy loading por rota (code-splitting) para reduzir o bundle inicial.

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { BabaProvider } from './contexts/BabaContext';
import { getNewlyUnlocked, UNLOCK_MESSAGES } from './utils/progressiveFeaturesUnlock';
import { useBetaAnalytics } from './hooks/useBetaAnalytics';
import AdsenseScriptGate from './components/AdsenseScriptGate';
import CookieConsentBanner from './components/CookieConsentBanner';

// Rotas de entrada (primeira tela que o usuário vê) ficam eager —
// não faz sentido lazy-loadear o que já é carregado no primeiro paint.
import LandingPage        from './pages/LandingPage';

// Todo o resto entra sob demanda, um chunk por página.
const LoginPage            = lazy(() => import('./pages/LoginPage'));
const ResetPasswordPage    = lazy(() => import('./pages/ResetPasswordPage'));
const HomePage             = lazy(() => import('./pages/HomePage'));
const ProfilePage          = lazy(() => import('./pages/ProfilePage'));
const PublicProfilePage    = lazy(() => import('./pages/PublicProfilePage'));
const MatchPageVisitor     = lazy(() => import('./pages/MatchPageVisitor'));
const GuiasPage            = lazy(() => import('./pages/GuiasPage'));
const EstatisticasPage     = lazy(() => import('./pages/EstatisticasPage'));
const GuiaPage             = lazy(() => import('./pages/GuiaPage'));
const RankingsPage         = lazy(() => import('./pages/RankingsPage'));
const FinancialPage        = lazy(() => import('./pages/FinancialPage'));
const FerramentasPage      = lazy(() => import('./pages/FerramentasPage'));
const SorteadorTimes       = lazy(() => import('./pages/tools/SorteadorTimes'));
const TorneioCalculadora   = lazy(() => import('./pages/tools/TorneioCalculadora'));
const TabelaJogos          = lazy(() => import('./pages/tools/TabelaJogos'));
const DivisaoDespesas      = lazy(() => import('./pages/tools/DivisaoDespesas'));
const OrganizadorPresenca  = lazy(() => import('./pages/tools/OrganizadorPresenca'));
const GeradorRegulamento   = lazy(() => import('./pages/tools/GeradorRegulamento'));
const ControleFinanceiro   = lazy(() => import('./pages/tools/ControleFinanceiro'));
const ModelosTorneioPage   = lazy(() => import('./pages/ModelosTorneioPage'));
const RegulamentoModelo    = lazy(() => import('./pages/modelos/RegulamentoModelo'));
const CriteriosDesempate   = lazy(() => import('./pages/modelos/CriteriosDesempate'));
const TabelaMataMata       = lazy(() => import('./pages/modelos/TabelaMataMata'));
const GruposClassificacao  = lazy(() => import('./pages/modelos/GruposClassificacao'));
const PontosCorridos       = lazy(() => import('./pages/modelos/PontosCorridos'));
const CalendarioPartidas   = lazy(() => import('./pages/modelos/CalendarioPartidas'));
const ControleResultados   = lazy(() => import('./pages/modelos/ControleResultados'));
const PresencaEquipe       = lazy(() => import('./pages/modelos/PresencaEquipe'));
const ControleArtilharia   = lazy(() => import('./pages/modelos/ControleArtilharia'));
const OrcamentoTorneio     = lazy(() => import('./pages/modelos/OrcamentoTorneio'));
const DashboardPage        = lazy(() => import('./pages/DashboardPage'));
const CreatePage           = lazy(() => import('./pages/CreatePage'));
const HistoryPage          = lazy(() => import('./pages/HistoryPage'));
const DrawPage              = lazy(() => import('./pages/DrawPage'));
const WatchPage              = lazy(() => import('./pages/WatchPage'));
const PrivacyPage          = lazy(() => import('./pages/PrivacyPage'));
const TermsPage            = lazy(() => import('./pages/TermsPage'));
const AboutPage            = lazy(() => import('./pages/AboutPage'));
const FollowersPage        = lazy(() => import('./pages/FollowersPage'));
const JoinPage              = lazy(() => import('./pages/JoinPage'));
const ComparisonPage       = lazy(() => import('./pages/ComparisonPage'));
const TournamentPage       = lazy(() => import('./pages/TournamentPage'));
const TournamentMatchPage  = lazy(() => import('./pages/TournamentMatchPage'));
const DpStorePage          = lazy(() => import('./pages/DpStorePage'));
const NotFoundPage         = lazy(() => import('./pages/NotFoundPage'));

// Componentes que só aparecem em certas situações: fora do bundle de entrada.
const BottomNav        = lazy(() => import('./components/BottomNav'));
const PushPrompt       = lazy(() => import('./components/PushPrompt'));
const ConsentModal     = lazy(() => import('./components/ConsentModal'));
const OnboardingModal  = lazy(() => import('./components/OnboardingModal'));
const ChangelogModal   = lazy(() => import('./components/ChangelogModal'));
const BetaFeedback     = lazy(() => import('./components/BetaFeedback'));
const InstallPWA       = lazy(() => import('./components/InstallPWA'));
const FeedbackModal    = lazy(() => import('./components/FeedbackModal'));

import OfflineBanner from './components/OfflineBanner';
import UpdatePrompt  from './components/UpdatePrompt';
import PageWrapper   from './components/PageWrapper';
import { shouldShowOnboarding, shouldShowChangelog, shouldShowBetaFeedback } from './utils/firstVisitGates';

// Fallback padrão enquanto o chunk da rota carrega (mesmo spinner já usado no ProtectedRoute).
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-black">
    <div className="w-10 h-10 border-4 border-cyan-electric border-t-transparent rounded-full animate-spin" />
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
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
  const [feedbackMounted,  setFeedbackMounted]  = useState(false); // monta o modal só após a 1ª abertura
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

  if (needsConsent === null && user) return <PageLoader />;

  return (
    <>
      <AdsenseScriptGate />
      <CookieConsentBanner />
      <OfflineBanner />
      <UpdatePrompt />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/"              element={<LandingPage />} />
          <Route path="/login"         element={<LoginPage />} />
          <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
          <Route path="/visitor"       element={<Navigate to="/ferramentas/sorteador" replace />} />
          <Route path="/guias"                             element={<GuiasPage />} />
          <Route path="/guias/:slug"                       element={<GuiaPage />} />
          <Route path="/estatisticas"                      element={<EstatisticasPage />} />
          <Route path="/ferramentas"                       element={<FerramentasPage />} />
          <Route path="/ferramentas/sorteador"             element={<SorteadorTimes />} />
          <Route path="/ferramentas/calculadora-torneio"    element={<TorneioCalculadora />} />
          <Route path="/ferramentas/tabela-de-jogos"        element={<TabelaJogos />} />
          <Route path="/ferramentas/divisao-de-despesas"    element={<DivisaoDespesas />} />
          <Route path="/ferramentas/lista-de-presenca"      element={<OrganizadorPresenca />} />
          <Route path="/ferramentas/gerador-de-regulamento"  element={<GeradorRegulamento />} />
          <Route path="/ferramentas/controle-financeiro"     element={<ControleFinanceiro />} />
          <Route path="/modelos-de-torneio"                              element={<ModelosTorneioPage />} />
          <Route path="/modelos-de-torneio/regulamento-torneio-interno"  element={<RegulamentoModelo />} />
          <Route path="/modelos-de-torneio/criterios-de-desempate"       element={<CriteriosDesempate />} />
          <Route path="/modelos-de-torneio/tabela-mata-mata"             element={<TabelaMataMata />} />
          <Route path="/modelos-de-torneio/grupos-e-classificacao"       element={<GruposClassificacao />} />
          <Route path="/modelos-de-torneio/pontos-corridos"              element={<PontosCorridos />} />
          <Route path="/modelos-de-torneio/calendario-de-partidas"       element={<CalendarioPartidas />} />
          <Route path="/modelos-de-torneio/controle-de-resultados"       element={<ControleResultados />} />
          <Route path="/modelos-de-torneio/lista-presenca-por-equipe"    element={<PresencaEquipe />} />
          <Route path="/modelos-de-torneio/artilharia"                   element={<ControleArtilharia />} />
          <Route path="/modelos-de-torneio/orcamento-do-torneio"         element={<OrcamentoTorneio />} />
          <Route path="/visitor-match" element={<MatchPageVisitor />} />
          <Route path="/privacidade"   element={<PrivacyPage />} />
          <Route path="/termos"        element={<TermsPage />} />
          <Route path="/sobre"         element={<AboutPage />} />
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
          <Route path="/torneio/:id" element={<ProtectedRoute><PageWrapper><TournamentPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/torneio/:id/partida/:matchId" element={<ProtectedRoute><PageWrapper><TournamentMatchPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/dpstore" element={<ProtectedRoute><PageWrapper><DpStorePage /></PageWrapper></ProtectedRoute>} />
          <Route path="/tournament" element={<Navigate to="/home" replace />} />
          <Route path="/teams" element={<ProtectedRoute><PageWrapper><WatchPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/match" element={<Navigate to="/draw" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      <Suspense fallback={null}>
        {user && <BottomNav />}
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
          <InstallPWA hidden={showPushPrompt || showOnboarding || showChangelog || showBetaFeedback} />
        )}
      </Suspense>
      {user && needsConsent === false && (
        <button
          onClick={() => { setFeedbackMounted(true); setShowFeedback(true); }}
          aria-label="Enviar feedback"
          className="fixed bottom-28 right-4 z-50 w-10 h-10 rounded-full bg-surface-2 border border-border-mid text-text-low hover:text-cyan-electric hover:border-cyan-electric/30 transition-all shadow-glass flex items-center justify-center active:scale-90"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
      )}
      {feedbackMounted && (
        <Suspense fallback={null}>
          <FeedbackModal isOpen={showFeedback} onClose={() => setShowFeedback(false)} />
        </Suspense>
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