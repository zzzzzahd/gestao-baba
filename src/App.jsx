import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { BabaProvider } from './contexts/BabaContext';
import ProtectedRoute from './components/ProtectedRoute';

// Páginas
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import RankingsPage from './pages/RankingsPage';
import MatchPage from './pages/MatchPage';          
import MatchPageVisitor from './pages/MatchPageVisitor'; 
import TeamsPage from './pages/TeamsPage';          
import DashboardPage from './pages/DashboardPage'; 
import VisitorMode from './pages/VisitorMode';      
import FinancialPage from './pages/FinancialPage'; 

function App() {
  return (
    <AuthProvider>
      <BabaProvider>
        {/* Toaster para notificações */}
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
          {/* ROTAS PÚBLICAS */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<LoginPage />} />
          
          {/* MODO VISITANTE (100% PRESERVADO) */}
          <Route path="/visitor" element={<VisitorMode />} />
          <Route path="/visitor-match" element={<MatchPageVisitor />} />

          {/* ROTAS PROTEGIDAS */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } />

          <Route path="/home" element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          } />

          <Route path="/edit-baba/:id" element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } />

          <Route path="/profile" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />

          <Route path="/financial" element={
            <ProtectedRoute>
              <FinancialPage />
            </ProtectedRoute>
          } />

          <Route path="/rankings" element={
            <ProtectedRoute>
              <RankingsPage />
            </ProtectedRoute>
          } />

          <Route path="/teams" element={
            <ProtectedRoute>
              <TeamsPage />
            </ProtectedRoute>
          } />

          <Route path="/match" element={
            <ProtectedRoute>
              <MatchPage />
            </ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BabaProvider>
    </AuthProvider>
  );
}

export default App;
