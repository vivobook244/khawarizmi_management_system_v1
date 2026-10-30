import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/Toast';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ServicePage from './pages/ServicePage';
import SoftwarePage from './pages/SoftwarePage';
import SparepartPage from './pages/SparepartPage';
import ProposalPage from './pages/ProposalPage';
import FinancePage from './pages/FinancePage';
import { LoadingState } from './components/States';

function ProtectedRoute({ children }) {
  const { session, loading } = useAuth();
  if (loading) return <LoadingState />;
  if (!session) return <Navigate to="/login" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function PublicRoute({ children }) {
  const { session, loading } = useAuth();
  if (loading) return <LoadingState />;
  if (session) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
              <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/service" element={<ProtectedRoute><ServicePage /></ProtectedRoute>} />
              <Route path="/software" element={<ProtectedRoute><SoftwarePage /></ProtectedRoute>} />
              <Route path="/sparepart" element={<ProtectedRoute><SparepartPage /></ProtectedRoute>} />
              <Route path="/proposal" element={<ProtectedRoute><ProposalPage /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
