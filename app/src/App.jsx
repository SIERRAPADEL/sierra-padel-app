import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import BottomNav from './components/BottomNav';
import InstallGuide from './components/InstallGuide';
import NotificationSetup from './components/NotificationSetup';
import Login from './pages/Login';
import Registro from './pages/Registro';
import Home from './pages/Home';
import Reservar from './pages/Reservar';
import Torneos from './pages/Torneos';
import Puntos from './pages/Puntos';
import Perfil from './pages/Perfil';
import Unirse from './pages/Unirse';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-sp-green border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/" element={<Navigate to={user ? '/home' : '/login'} replace />} />
      <Route path="/login" element={user ? <Navigate to="/home" replace /> : <Login />} />
      <Route path="/registro" element={user ? <Navigate to="/home" replace /> : <Registro />} />
      <Route path="/unirse/:token" element={<Unirse />} />
      <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/reservar" element={<ProtectedRoute><Reservar /></ProtectedRoute>} />
      <Route path="/torneos" element={<ProtectedRoute><Torneos /></ProtectedRoute>} />
      <Route path="/puntos" element={<ProtectedRoute><Puntos /></ProtectedRoute>} />
      <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function LayoutWrapper() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const noNavRoutes = ['/login', '/registro'];
  const showNav = user && !noNavRoutes.some(r => pathname.startsWith(r));

  return (
    <div className="max-w-md mx-auto relative min-h-screen">
      <AppRoutes />
      {showNav && <BottomNav />}
      <InstallGuide />
      <NotificationSetup />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LayoutWrapper />
      </AuthProvider>
    </BrowserRouter>
  );
}
