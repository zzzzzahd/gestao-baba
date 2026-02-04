import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { BabaProvider } from './contexts/BabaContext';

// Páginas
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import TeamsPage from './pages/TeamsPage';
import MatchPage from './pages/MatchPage';
import MatchPageVisitor from './pages/MatchPageVisitor';
import RankingsPage from './pages/RankingsPage';
import FinancialPage from './pages/FinancialPage';
import VisitorMode from './pages/VisitorMode';

// ProtectedRoute inline
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <i className="fas fa-spinner fa-spin text-4xl text-cyan-electric"></i>
      </div>
    );
  }
  
  return user ? children : <Navigate to="/login" />;
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
                background: 'rgba(13, 13, 13, 0.95)',
                color: '#fff',
                border: '1px solid rgba(0, 242, 255, 0.3)',
                borderRadius: '12px'
              }
            }}
          />
          
          <Routes>
            {/* Rotas Públicas */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/visitor" element={<VisitorMode />} />
            <Route path="/visitor-match" element={<MatchPageVisitor />} />
            
            {/* Rotas Protegidas - TODAS vão para HomePage agora */}
            <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/teams" element={<ProtectedRoute><TeamsPage /></ProtectedRoute>} />
            <Route path="/match" element={<ProtectedRoute><MatchPage /></ProtectedRoute>} />
            <Route path="/rankings" element={<ProtectedRoute><RankingsPage /></ProtectedRoute>} />
            <Route path="/financial" element={<ProtectedRoute><FinancialPage /></ProtectedRoute>} />
            
            {/* Redirect antigos */}
            <Route path="/dashboard" element={<Navigate to="/home" replace />} />
          </Routes>
        </BabaProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
