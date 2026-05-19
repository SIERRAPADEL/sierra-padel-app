import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Isotipo from '../components/Isotipo';

export default function Perfil() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const inicial = user?.nombre?.charAt(0).toUpperCase() || 'U';

  return (
    <div className="page safe-bottom">
      <div className="bg-sp-gray px-5 pt-[env(safe-area-inset-top)] pb-6">
        <div className="pt-3 flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-sp-green flex items-center justify-center">
            <span className="text-white text-2xl font-black">{inicial}</span>
          </div>
          <div className="text-center">
            <p className="text-white font-black text-lg">{user?.nombre}</p>
            <p className="text-gray-400 text-sm">{user?.telefono}</p>
            {user?.categoria && <p className="text-sp-green text-xs font-semibold mt-1">{user.categoria}</p>}
          </div>
        </div>
      </div>

      <div className="px-4 py-4 flex flex-col gap-3">
        <div className="card flex flex-col divide-y divide-gray-50">
          {[
            { icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', label: 'Mi información' },
            { icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', label: 'Notificaciones' },
            { icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', label: 'Cambiar PIN' },
          ].map(item => (
            <button key={item.label} className="flex items-center gap-3 py-3 w-full text-left active:bg-gray-50">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#84C200" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d={item.icon} />
              </svg>
              <span className="text-sp-gray font-medium text-sm flex-1">{item.label}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CCC" strokeWidth="2" strokeLinecap="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          ))}
        </div>

        <div className="card flex items-center gap-3 justify-center">
          <Isotipo size={20} color="#84C200" />
          <span className="text-xs text-gray-400">Sierra Padel · v1.0</span>
        </div>

        <button onClick={handleLogout} className="btn-outline text-red-400 border-red-200 mt-2">
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
