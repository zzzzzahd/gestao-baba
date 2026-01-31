import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { BabaProvider } from './contexts/BabaContext';

// Components
import InstallPWA from './components/InstallPWA';

// Pages
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage'; // <--- NOVA PÁGINA ADICIONADA
import DashboardPage from './pages/DashboardPage';
import HomePage from './pages/HomePage';
import MatchPage from './pages/MatchPage';
import RankingsPage from './pages/RankingsPage';
import FinancialPage from './pages/FinancialPage';
import VisitorMode from './pages/VisitorMode';

// Protected Route Component
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
                borderRadius: '12px',
                backdropFilter: 'blur(10px)'
              }
            }}
          />
          
          <InstallPWA />
          
          <Routes>
            {/* Páginas Públicas */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/visitor" element={<VisitorMode />} />
            
            {/* Rota de Perfil: A primeira após o Login */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            
            {/* Dashboard: Lista de Babas e Criação */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            
            {/* Painel do Baba (Os 4 Pilares: Foto, Check-in, Regras, Lista/Sorteio) */}
            <Route path="/home" element={<HomePage />} />
            
            <Route path="/match" element={<MatchPage />} />
            <Route path="/rankings" element={<RankingsPage />} />
            <Route path="/financial" element={<FinancialPage />} />
            
            {/* Redirecionamento padrão - Alterado para cair no Profile após login */}
            <Route path="/" element={<Navigate to="/profile" />} />
          </Routes>
        </BabaProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
