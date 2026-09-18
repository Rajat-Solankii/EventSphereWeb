import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Admin from './pages/Admin';
import Registration from './pages/Registration';
import AnimatedLanding from './pages/AnimatedLanding';
import LoginPage from './pages/LoginPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import './App.css';
import './index.css';

// Protected route – redirects to /login if not authenticated
function ProtectedRoute({ children }) {
  const location = useLocation();
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <img src="/logo.png" alt="EventSphere Logo" className="w-16 h-16 animate-pulse" />
          <p className="text-slate-500 text-sm font-serif">Loading...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" state={{ from: location }} replace />;
}

// Auth route – redirects to /admin if already logged in
function AuthRoute({ children }) {
  const location = useLocation();
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  const from = location.state?.from?.pathname || "/admin";
  return isAuthenticated ? <Navigate to={from} replace /> : children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<AnimatedLanding />} />
      <Route path="/event/:eventId" element={<Registration />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Auth routes (redirect to admin if logged in) */}
      <Route path="/login" element={<AuthRoute><LoginPage /></AuthRoute>} />

      {/* Protected routes */}
      <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
