import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { BabaProvider } from './contexts/BabaContext';

// Components
import InstallPWA from './components/InstallPWA';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import HomePage from './pages/HomePage';
import MatchPage from './pages/MatchPage';
import RankingsPage from './pages/RankingsPage';
import FinancialPage from './pages/FinancialPage';
import VisitorMode from './pages/VisitorMode';

// Protected Route Component (Mantemos para a Dashboard)
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
                borderRadius: '12px',
                backdropFilter: 'blur(10px)'
              }
            }}
          />
          
          <InstallPWA />
          
          <Routes>
            {/* Páginas Públicas (Qualquer um acessa) */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/visitor" element={<VisitorMode />} />
            
            {/* Dashboard Protegida (Apenas usuários logados criam novos Babas) */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            
            {/* Páginas Liberadas (Removi o ProtectedRoute para o Modo Visitante funcionar) */}
            <Route path="/home" element={<HomePage />} />
            <Route path="/match" element={<MatchPage />} />
            <Route path="/rankings" element={<RankingsPage />} />
            <Route path="/financial" element={<FinancialPage />} />
            
            {/* Redirecionamento padrão */}
            <Route path="/" element={<Navigate to="/login" />} />
          </Routes>
        </BabaProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
