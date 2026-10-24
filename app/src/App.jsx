import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useIdioma } from './i18n/useIdioma';
import { destinoTrasEntrar } from './lib/destino';
import BottomNav from './components/BottomNav';
import InstallGuide from './components/InstallGuide';
import NotificationSetup from './components/NotificationSetup';
import NuevaVersion from './components/NuevaVersion';
import Login from './pages/Login';
import Registro from './pages/Registro';
import Home from './pages/Home';
import Reservar from './pages/Reservar';
import Torneos from './pages/Torneos';
import Puntos from './pages/Puntos';
import Perfil from './pages/Perfil';
import Unirse from './pages/Unirse';
import Noticias from './pages/Noticias';
import Pedir from './pages/Pedir';
import Terminos from './pages/Terminos';
import Retas from './pages/Retas';
import ClaseAbierta from './pages/ClaseAbierta';
import RifaTorneo from './pages/RifaTorneo';
import Reta from './pages/Reta';
import Botanero from './pages/Botanero';
import Ligas from './pages/Ligas';
import LigaEscalera from './pages/LigaEscalera';
import LigaJornada from './pages/LigaJornada';
import Marcadores from './pages/Marcadores';
import Jugadas from './pages/Jugadas';
import Avisos from './pages/Avisos';
import AutorizarPuntos from './pages/AutorizarPuntos';
import CuentaVencida from './pages/CuentaVencida';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="flex items-center justify-center min-h-full"><div className="w-8 h-8 border-4 border-sp-green border-t-transparent rounded-full animate-spin" /></div>;
  // Guarda A DÓNDE iba para volver ahí tras entrar. Sin esto, una liga compartida
  // (la convocatoria de un torneo, una invitación de pareja) se perdía: el socio
  // entraba y aparecía en Inicio, sin la pantalla que le habían mandado.
  if (!user) {
    const destino = location.pathname + (location.search || '');
    return <Navigate to={`/login?next=${encodeURIComponent(destino)}`} replace />;
  }
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  const location = useLocation();
  // Si ya hay sesión y aun así se abre /login o /registro con un ?next=, se respeta el
  // destino en vez de mandar a Inicio (pasa al reabrir una liga ya estando dentro).
  const yaDentro = <Navigate to={destinoTrasEntrar(location.search)} replace />;
  return (
    <Routes>
      <Route path="/" element={<Navigate to={user ? '/home' : '/login'} replace />} />
      <Route path="/login" element={user ? yaDentro : <Login />} />
      <Route path="/registro" element={user ? yaDentro : <Registro />} />
      <Route path="/unirse/:token" element={<Unirse />} />
      <Route path="/terminos" element={<Terminos />} />
      <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/reservar" element={<ProtectedRoute><Reservar /></ProtectedRoute>} />
      <Route path="/retas" element={<ProtectedRoute><Retas /></ProtectedRoute>} />
      {/* 🎾 Clase abierta (14-oct-2026): el push y el link de redes llevan aquí. */}
      <Route path="/clase-abierta" element={<ProtectedRoute><ClaseAbierta /></ProtectedRoute>} />
      {/* 🎟️ Rifa del torneo (15-oct-2026): el QR de la pantalla del club lleva aquí. NO va en
          ProtectedRoute: primero cambia el código que caduca por un pase, luego pide la sesión. */}
      <Route path="/rifa/:torneoId" element={<RifaTorneo />} />
      {/* La pantalla de UNA reta. Va despues de /retas: el orden importa para que
          "/retas" no se coma la lista. */}
      <Route path="/reta/:token" element={<ProtectedRoute><Reta /></ProtectedRoute>} />
      <Route path="/marcadores" element={<ProtectedRoute><Marcadores /></ProtectedRoute>} />
      <Route path="/jugadas" element={<ProtectedRoute><Jugadas /></ProtectedRoute>} />
      <Route path="/ligas" element={<ProtectedRoute><Ligas /></ProtectedRoute>} />
      <Route path="/liga/:id" element={<ProtectedRoute><LigaEscalera /></ProtectedRoute>} />
      {/* Lo que pasó en una jornada. Cada una con su dirección, para poder volver
          (German, 16-sep: "¿dónde vive? quiero que se pueda revisitar"). La más
          específica va primero: Express toma la primera que empate. */}
      <Route path="/liga/:id/j/:num/b/:blq" element={<ProtectedRoute><LigaJornada /></ProtectedRoute>} />
      <Route path="/liga/:id/j/:num/escalera" element={<ProtectedRoute><LigaJornada vista="escalera" /></ProtectedRoute>} />
      <Route path="/liga/:id/j/:num" element={<ProtectedRoute><LigaJornada /></ProtectedRoute>} />
      <Route path="/botanero" element={<ProtectedRoute><Botanero /></ProtectedRoute>} />
      {/* 👑 Ladies Night (jueves, sólo mujeres): la misma página con la noche de los jueves. */}
      <Route path="/ladies" element={<ProtectedRoute><Botanero liga="ladies" /></ProtectedRoute>} />
      <Route path="/torneos" element={<ProtectedRoute><Torneos /></ProtectedRoute>} />
      {/* Link directo de la invitación a UN torneo (30-sep-2026) */}
      <Route path="/torneo/:id" element={<ProtectedRoute><Torneos /></ProtectedRoute>} />
      <Route path="/puntos" element={<ProtectedRoute><Puntos /></ProtectedRoute>} />
      <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
      <Route path="/noticias" element={<ProtectedRoute><Noticias /></ProtectedRoute>} />
      {/* 🔔 Buzón de avisos (21-oct-2026): la campanita de Inicio lleva aquí. */}
      <Route path="/avisos" element={<ProtectedRoute><Avisos /></ProtectedRoute>} />
      {/* 🔐 La caja pide usar tus puntos (22-oct-2026): el push y la tarjeta de Inicio llevan aquí. */}
      <Route path="/autorizar-puntos/:id" element={<ProtectedRoute><AutorizarPuntos /></ProtectedRoute>} />
      {/* 🔒 Una cuenta tuya quedó sin pagar: detalle + «No es mía / ya la pagué». */}
      <Route path="/cuenta-vencida/:id" element={<ProtectedRoute><CuentaVencida /></ProtectedRoute>} />
      <Route path="/pedir" element={<ProtectedRoute><Pedir /></ProtectedRoute>} />
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
    // Columna de alto fijo: arriba lo que scrollea, abajo la barra. La barra queda FUERA
    // del contenedor que se mueve, así que no puede desplazarse con el scroll — que es
    // justo lo que pasaba en la app instalada. Ver el comentario de index.css.
    // `min-h-0` es imprescindible: sin él un hijo flex no se deja encoger y el scroll se
    // le escapa al documento otra vez.
    <div className="max-w-md mx-auto relative h-full flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <AppRoutes />
      </div>
      {showNav && <BottomNav />}
      <InstallGuide />
      <NotificationSetup />
      {/* Avisa cuando hay version nueva: una app abierta no vuelve a pedir el index.html
          y se queda corriendo el codigo viejo sin que nadie se entere (paso el 13-ago). */}
      <NuevaVersion />
    </div>
  );
}

export default function App() {
  // 🌐 Al cambiar de idioma se vuelve a montar todo: cada pantalla se pinta otra vez con
  // los textos nuevos y ninguna se queda a medias (ver i18n/index.js).
  const idioma = useIdioma();
  return (
    <BrowserRouter>
      <AuthProvider>
        <LayoutWrapper key={idioma} />
      </AuthProvider>
    </BrowserRouter>
  );
}
