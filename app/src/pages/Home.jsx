import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import Isotipo from '../components/Isotipo';

// ââ Helpers âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function formatFecha(str) {
  if (!str) return '';
  const d = new Date(str);
  return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatHora(str) {
  if (!str) return '';
  return str.slice(0, 5); // "HH:MM"
}

// ââ Seccion: Mis proximas reservas ââââââââââââââââââââââââââââââââââââââââââââ
function MisReservas({ apiFetch, navigate }) {
  const [reservas, setReservas] = useState(null);
  const [loading, setLoading]  = useState(true);

  useEffect(() => {
    apiFetch('/reservas/mis-reservas')
      .then(d => {
        if (d.ok) {
          const proximas = [
            ...(d.data.pendientes || []),
            ...(d.data.confirmadas || []),
          ].sort((a, b) => {
            const da = a.fecha + 'T' + (a.hora_inicio || '00:00');
            const db = b.fecha + 'T' + (b.hora_inicio || '00:00');
            return da.localeCompare(db);
          }).slice(0, 3);
          setReservas(proximas);
        } else {
          setReservas([]);
        }
      })
      .catch(() => setReservas([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <p className="text-sp-gray font-black text-sm">Mis proximas reservas</p>
        <button onClick={() => navigate('/reservar')} className="text-xs font-semibold" style={{ color: '#96C800' }}>
          Ver todas
        </button>
      </div>

      {loading ? (
        <div className="card py-6 flex items-center justify-center">
          <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #96C800', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : reservas?.length > 0 ? (
        <div className="flex flex-col gap-2">
          {reservas.map((r, i) => (
            <div key={i} className="card flex items-center gap-3 py-3">
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0f9e8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#5a8a00', lineHeight: 1 }}>
                  {new Date(r.fecha).toLocaleDateString('es-MX', { day: 'numeric' })}
                </span>
                <span style={{ fontSize: 9, color: '#96C800', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {new Date(r.fecha).toLocaleDateString('es-MX', { month: 'short' })}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sp-gray font-bold text-sm truncate">
                  {r.cancha_nombre || r.cancha || `Cancha ${r.cancha_id || ''}`}
                </p>
                <p className="text-gray-400 text-xs">
                  {formatHora(r.hora_inicio)}  -  {formatHora(r.hora_fin)}
                </p>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                r.estado === 'confirmada'
                  ? 'bg-green-50 text-green-600'
                  : 'bg-yellow-50 text-yellow-600'
              }`}>
                {r.estado === 'confirmada' ? 'Confirmada' : 'Pendiente'}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="card py-5 text-center">
          <p className="text-gray-400 text-sm">No tienes reservas proximas</p>
          <button
            onClick={() => navigate('/reservar')}
            className="mt-2 text-sm font-bold"
            style={{ color: '#96C800' }}
          >
            Reservar ahora >
          </button>
        </div>
      )}
    </div>
  );
}

// ââ Seccion: Proximos torneos âââââââââââââââââââââââââââââââââââââââââââââââââ
function ProximosTorneos({ apiFetch, navigate }) {
  const [torneos, setTorneos] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/torneos')
      .then(d => {
        if (d.ok) {
          const lista = d.data?.torneos || d.data?.data || d.torneos || [];
          const proximos = lista
            .filter(t => t.estado !== 'finalizado')
            .slice(0, 3);
          setTorneos(proximos);
        } else {
          setTorneos([]);
        }
      })
      .catch(() => setTorneos([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <p className="text-sp-gray font-black text-sm">Proximos torneos</p>
        <button onClick={() => navigate('/torneos')} className="text-xs font-semibold" style={{ color: '#96C800' }}>
          Ver todos
        </button>
      </div>

      {loading ? (
        <div className="card py-6 flex items-center justify-center">
          <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #96C800', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : torneos?.length > 0 ? (
        <div className="flex flex-col gap-2">
          {torneos.map((t, i) => (
            <div
              key={i}
              className="card flex items-center gap-3 py-3 active:scale-[0.98] transition-transform cursor-pointer"
              onClick={() => navigate('/torneos')}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>
                🏆
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sp-gray font-bold text-sm truncate">{t.nombre}</p>
                <p className="text-gray-400 text-xs">
                  {t.fecha_inicio ? formatFecha(t.fecha_inicio) : 'Fecha por confirmar'}
                  {t.torneo_categorias?.length > 0 && ` · ${t.torneo_categorias.length} categorias`}
                </p>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                t.estado === 'activo' || t.estado === 'en_curso'
                  ? 'bg-green-50 text-green-600'
                  : 'bg-blue-50 text-blue-500'
              }`}>
                {t.estado === 'activo' || t.estado === 'en_curso' ? 'En curso' : 'Proximo'}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="card py-5 text-center">
          <p className="text-gray-400 text-sm">No hay torneos proximos por ahora</p>
        </div>
      )}
    </div>
  );
}

// ââ Seccion: Standings del Circuito ââââââââââââââââââââââââââââââââââââââââââ
function StandingsCircuito({ apiFetch, navigate }) {
  const [ligas, setLigas]   = useState(null);
  const [ranking, setRanking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/escalera/')
      .then(d => {
        const lista = d.data || d.ligas || [];
        const activa = lista.find(l => l.activa || l.estado === 'activa') || lista[0];
        if (!activa) { setLoading(false); return; }
        setLigas(activa);
        return apiFetch(`/escalera/${activa.id}/ranking`);
      })
      .then(r => {
        if (!r) return;
        const players = r.data?.ranking || r.ranking || [];
        setRanking(players.slice(0, 5));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <p className="text-sp-gray font-black text-sm">Standings del circuito</p>
        <button onClick={() => navigate('/torneos')} className="text-xs font-semibold" style={{ color: '#96C800' }}>
          Ver completo
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="py-6 flex items-center justify-center">
            <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #96C800', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : ranking?.length > 0 ? (
          <>
            {ligas && (
              <div className="px-4 py-2 border-b border-gray-50" style={{ background: '#f9fafb' }}>
                <p className="text-xs font-semibold text-gray-500">{ligas.nombre || 'Circuito Sierra Padel'}</p>
              </div>
            )}
            {ranking.map((p, i) => (
              <div key={i} className={`flex items-center gap-3 px-4 py-3 ${i < ranking.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <span style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800,
                  background: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#f3f4f6',
                  color: i < 3 ? '#111' : '#6B7280',
                }}>
                  {i + 1}
                </span>
                <p className="flex-1 text-sp-gray font-semibold text-sm truncate">
                  {p.nombre || p.cliente?.nombre || `Jugador ${i + 1}`}
                </p>
                <span className="text-xs font-black" style={{ color: '#96C800' }}>
                  {p.puntos ?? p.total_puntos ?? '-'} pts
                </span>
              </div>
            ))}
          </>
        ) : (
          <div className="py-5 text-center">
            <p className="text-gray-400 text-sm">No hay standings disponibles</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ââ Seccion: Promociones ââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function Promociones({ navigate }) {
  const promos = [
    {
      icon: '🍽️',
      title: 'Restaurante',
      desc: 'Gana 1 punto por cada $50 de consumo',
      color: '#1a1a2e',
      action: () => navigate('/puntos', { state: { tab: 'consumo' } }),
      cta: 'Registrar consumo',
    },
    {
      icon: '🎯',
      title: 'Programa de puntos',
      desc: 'Acumula puntos y canjealos por premios exclusivos',
      color: '#263238',
      action: () => navigate('/puntos'),
      cta: 'Ver mis puntos',
    },
  ];

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sp-gray font-black text-sm px-1">Promociones del club</p>
      <div className="flex flex-col gap-2">
        {promos.map((p, i) => (
          <button
            key={i}
            onClick={p.action}
            className="text-left active:scale-[0.98] transition-transform"
          >
            <div style={{ background: p.color, borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 28, flexShrink: 0 }}>{p.icon}</span>
              <div className="flex-1 min-w-0">
                <p style={{ color: 'white', fontWeight: 800, fontSize: 14 }}>{p.title}</p>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 }}>{p.desc}</p>
              </div>
              <span style={{ color: '#96C800', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{p.cta} ></span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ââ Pagina principal ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
export default function Home() {
  const { user }    = useAuth();
  const { apiFetch } = useApi();
  const navigate    = useNavigate();
  const [puntos, setPuntos] = useState(null);
  const [hora] = useState(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos dias';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  });

  useEffect(() => {
    apiFetch('/auth/me').then(d => { if (d.ok) setPuntos(d.data.total_puntos ?? d.data.puntos ?? null); });
  }, []);

  return (
    <div className="page safe-bottom">
      {/* ââ Header ââ */}
      <div className="bg-sp-green px-5 pt-[env(safe-area-inset-top)] pb-5">
        <div className="flex items-center justify-between pt-3">
          <div>
            <p className="text-white/75 text-sm font-medium">{hora},</p>
            <p className="text-white text-xl font-black">{user?.nombre?.split(' ')[0] || 'Jugador'}</p>
          </div>
          <Isotipo size={32} color="white" />
        </div>
        <div className="mt-3 inline-flex items-center gap-2 bg-black/20 rounded-full px-3 py-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="none">
            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <span className="text-white text-sm font-bold">
            {puntos !== null ? `${puntos} puntos` : '- puntos'}
          </span>
        </div>
      </div>

      {/* ââ Contenido ââ */}
      <div className="px-4 py-4 flex flex-col gap-5">
        {/* Hero CTA */}
        <button
          onClick={() => navigate('/reservar')}
          className="active:scale-[0.98] transition-transform"
          style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            borderRadius: 20,
            padding: '20px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          }}
        >
          <div>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 4 }}>Sierra Padel</p>
            <p style={{ color: 'white', fontWeight: 900, fontSize: 22, lineHeight: 1.1 }}>Reservar</p>
            <p style={{ color: 'white', fontWeight: 900, fontSize: 22, lineHeight: 1.1 }}>una cancha</p>
            <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, background: '#96C800', borderRadius: 100, padding: '6px 14px' }}>
              <span style={{ color: '#111', fontWeight: 800, fontSize: 13 }}>Reservar ahora</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </div>
          <div style={{ fontSize: 64, lineHeight: 1 }}>🎾</div>
        </button>

        {/* Mis reservas */}
        <MisReservas apiFetch={apiFetch} navigate={navigate} />

        {/* Torneos */}
        <ProximosTorneos apiFetch={apiFetch} navigate={navigate} />

        {/* Standings */}
        <StandingsCircuito apiFetch={apiFetch} navigate={navigate} />

        {/* Promociones */}
        <Promociones navigate={navigate} />
      </div>

      {/* Spin keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
