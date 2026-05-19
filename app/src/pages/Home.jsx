import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import Isotipo from '../components/Isotipo';

const acciones = [
  { icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', label: 'Reservar', sub: 'cancha', to: '/reservar' },
  { icon: 'M5 3l14 9-14 9V3z', label: 'Torneos', sub: 'inscribirme', to: '/torneos' },
  { icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z', label: 'Puntos', sub: 'mi saldo', to: '/puntos' },
  { icon: 'M16 11c0 2.761-1.343 5-3 5s-3-2.239-3-5 1.343-5 3-5 3 2.239 3 5zM2 21c0-4.418 3.582-8 8-8h4c4.418 0 8 3.582 8 8', label: 'Perfil', sub: 'mi cuenta', to: '/perfil' },
];

export default function Home() {
  const { user } = useAuth();
  const { apiFetch } = useApi();
  const navigate = useNavigate();
  const [puntos, setPuntos] = useState(null);
  const [hora] = useState(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  });

  useEffect(() => {
    apiFetch('/auth/me').then(d => { if (d.ok) setPuntos(d.data.total_puntos); });
  }, []);

  return (
    <div className="page safe-bottom">
      <div className="bg-sp-green px-5 pt-[env(safe-area-inset-top)] pb-5">
        <div className="flex items-center justify-between pt-3">
          <div>
            <p className="text-white/75 text-sm font-medium">{hora}</p>
            <p className="text-white text-xl font-black">{user?.nombre?.split(' ')[0]}</p>
          </div>
          <Isotipo size={32} color="white" />
        </div>
        <div className="mt-3 inline-flex items-center gap-2 bg-black/20 rounded-full px-3 py-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="none">
            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <span className="text-white text-sm font-bold">
            {puntos !== null ? `${puntos} puntos` : '— puntos'}
          </span>
        </div>
      </div>

      <div className="px-4 py-4 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          {acciones.map(a => (
            <button key={a.to} onClick={() => navigate(a.to)} className="card flex flex-col items-center py-4 gap-1 active:scale-95 transition-transform">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#84C200" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d={a.icon} />
              </svg>
              <span className="text-sp-gray font-bold text-sm mt-1">{a.label}</span>
              <span className="text-gray-400 text-xs">{a.sub}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => navigate('/puntos', { state: { tab: 'consumo' } })}
          className="bg-sp-gray rounded-2xl p-4 flex items-center justify-between active:scale-[0.98] transition-transform"
        >
          <div className="text-left">
            <p className="text-gray-400 text-xs">Restaurante · 1 pto por $50</p>
            <p className="text-white font-bold text-sm mt-0.5">Registrar consumo →</p>
          </div>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#84C200" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
