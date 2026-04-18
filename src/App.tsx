import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Standard layout and pages
import Layout from './components/Layout';
// Pages
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CalendarioPage from './pages/CalendarioPage';
import ClientiPage from './pages/ClientiPage';
import ArticoliPage from './pages/ArticoliPage';
import UtentiPage from './pages/UtentiPage';

// Protected route wrapper
const ProtectedRoute = () => {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-brand-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
    </div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/calendario" element={<CalendarioPage />} />
              <Route path="/clienti" element={<ClientiPage />} />
              <Route path="/articoli" element={<ArticoliPage />} />
              <Route path="/utenti" element={<UtentiPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
