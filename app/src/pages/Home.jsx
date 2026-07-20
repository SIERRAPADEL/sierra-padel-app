import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import Isotipo from '../components/Isotipo';
import PromoExpressBanner from '../components/PromoExpressBanner';
import { BACKEND } from '../lib/constants';
import { formatFecha, formatHora, fmtRelativa, parseLocalDate } from '../lib/format';

// ── Encabezado de sección con acción "Ver todas" ─────────────────────────────
function SectionHeader({ title, actionLabel, onAction }) {
  return (
    <div className="flex items-center justify-between px-1">
      <p className="text-sp-gray font-black text-[15px]">{title}</p>
      {actionLabel && (
        <button onClick={onAction} className="text-[13px] font-bold text-sp-green-dark">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function CardSpinner() {
  return (
    <div className="card py-6 flex items-center justify-center">
      <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #96C800', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );
}

// ── Seccion: Mis proximas reservas ────────────────────────────────────────────
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
      <SectionHeader title="Mis proximas reservas" actionLabel="Ver todas" onAction={() => navigate('/reservar', { state: { tab: 'mis' } })} />

      {loading ? (
        <CardSpinner />
      ) : reservas?.length > 0 ? (
        <div className="flex flex-col gap-2">
          {reservas.map((r, i) => (
            <div key={i} className="card flex items-center gap-3 py-3">
              <div style={{ width: 44, height: 44, borderRadius: 10, background: '#EDF7D6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#5a8a00', lineHeight: 1 }}>
                  {parseLocalDate(r.fecha).toLocaleDateString('es-MX', { day: 'numeric' })}
                </span>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#7aaa00', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {parseLocalDate(r.fecha).toLocaleDateString('es-MX', { month: 'short' })}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sp-gray font-bold text-[15px] truncate">
                  {r.cancha_nombre || r.cancha || `Cancha ${r.cancha_id || ''}`}
                </p>
                <p className="text-gray-400 text-[13px]">
                  {formatHora(r.hora_inicio)} – {formatHora(r.hora_fin)}
                </p>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
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
            className="mt-2 text-[15px] font-bold text-sp-green-dark"
          >
            Reservar ahora →
          </button>
        </div>
      )}
    </div>
  );
}

// ── Seccion: Proximos torneos ─────────────────────────────────────────────────
function ProximosTorneos({ apiFetch, navigate }) {
  const [torneos, setTorneos] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/torneos')
      .then(d => {
        if (d.ok) {
          const lista = d.data?.torneos || d.data?.data || d.torneos || [];
          // Solo eventos vigentes: el backend no marca 'finalizado' de forma confiable
          // (estado_global se queda en 'borrador'), así que la señal real son las fechas.
          const hoy = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD local
          const proximos = lista
            .filter(t => {
              const fin = (t.fecha_fin || t.fecha_inicio || '').slice(0, 10);
              return fin && fin >= hoy;
            })
            .sort((a, b) => (a.fecha_inicio || '').localeCompare(b.fecha_inicio || ''))
            .slice(0, 3);
          setTorneos(proximos);
        } else {
          setTorneos([]);
        }
      })
      .catch(() => setTorneos([]))
      .finally(() => setLoading(false));
  }, []);

  // Sin torneos próximos no ocupamos espacio: la página Torneos siempre está en la barra
  if (!loading && !torneos?.length) return null;

  return (
    <div className="flex flex-col gap-2">
      <SectionHeader title="Proximos torneos" actionLabel="Ver todos" onAction={() => navigate('/torneos')} />

      {loading ? (
        <CardSpinner />
      ) : (
        <div className="flex flex-col gap-2">
          {torneos.map((t, i) => {
            // "En curso" si hoy ya está dentro de las fechas del torneo (el filtro
            // de arriba garantiza que aún no termina)
            const hoy = new Date().toLocaleDateString('sv-SE');
            const enCurso = (t.fecha_inicio || '').slice(0, 10) <= hoy;
            return (
              <div
                key={i}
                className="card flex items-center gap-3 py-3 active:scale-[0.98] transition-transform cursor-pointer"
                onClick={() => navigate('/torneos')}
              >
                <div style={{ width: 44, height: 44, borderRadius: 10, background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 20 }}>
                  🏆
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sp-gray font-bold text-[15px] truncate">{t.nombre}</p>
                  <p className="text-gray-400 text-[13px]">
                    {t.fecha_inicio ? formatFecha(t.fecha_inicio) : 'Fecha por confirmar'}
                    {t.torneo_categorias?.length > 0 && ` · ${t.torneo_categorias.length} categorias`}
                  </p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  enCurso ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-500'
                }`}>
                  {enCurso ? 'En curso' : 'Proximo'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Seccion: Novedades del club (teaser de Noticias) ──────────────────────────
function Novedades({ navigate }) {
  const [items, setItems] = useState(null);

  useEffect(() => {
    fetch(`${BACKEND}/api/media/activas`)
      .then(r => r.json())
      .then(d => setItems(d.ok ? (d.data || []).slice(0, 2) : []))
      .catch(() => setItems([]));
  }, []);

  // Sin novedades no renderizamos nada (ni título): espacio limpio
  if (!items?.length) return null;

  return (
    <div className="flex flex-col gap-2">
      <SectionHeader title="Novedades del club" actionLabel="Ver todas" onAction={() => navigate('/noticias')} />
      <div className="flex flex-col gap-2">
        {items.map(p => (
          <div
            key={p.id}
            className="card flex items-center gap-3 py-3 active:scale-[0.98] transition-transform cursor-pointer"
            onClick={() => navigate('/noticias')}
          >
            {p.media_url && (p.tipo === 'imagen' || p.tipo === 'gif') ? (
              <img src={p.media_url} alt="" loading="lazy" style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div style={{ width: 52, height: 52, borderRadius: 10, background: '#EDF7D6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 22 }}>
                {p.tipo === 'video' ? '🎬' : '📣'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sp-gray font-bold text-[15px] leading-snug line-clamp-2">{p.titulo}</p>
              <p className="text-gray-400 text-[13px] mt-0.5">{fmtRelativa(p.fecha_inicio)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Pagina principal ──────────────────────────────────────────────────────────
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
      {/* ── Header ── */}
      <div className="bg-sp-green px-5 pt-[env(safe-area-inset-top)] pb-4">
        <div className="flex items-center justify-between pt-3">
          <div>
            <p className="text-white/75 text-sm font-medium">{hora},</p>
            <p className="text-white text-xl font-black">{user?.nombre?.split(' ')[0] || 'Jugador'}</p>
          </div>
          <Isotipo size={32} color="white" />
        </div>
        <button
          onClick={() => navigate('/puntos')}
          className="mt-3 inline-flex items-center gap-2 bg-black/20 rounded-full px-3.5 py-1.5 active:scale-95 transition-transform"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="none">
            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <span className="text-white text-sm font-bold">
            {puntos !== null ? `${puntos} puntos` : 'Mis puntos'}
          </span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* ── Contenido ── */}
      <div className="px-4 py-4 flex flex-col gap-4">
        {/* Promo Express: sensible al tiempo, siempre hasta arriba */}
        <PromoExpressBanner />

        {/* Accesos rápidos */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/reservar')}
            className="active:scale-[0.98] transition-transform text-left"
            style={{
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              borderRadius: 18,
              padding: '16px 14px',
              boxShadow: '0 3px 14px rgba(0,0,0,0.12)',
            }}
          >
            <span style={{ fontSize: 30, lineHeight: 1, display: 'block' }}>🎾</span>
            <p style={{ color: 'white', fontWeight: 900, fontSize: 17, lineHeight: 1.15, marginTop: 10 }}>Reservar cancha</p>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, marginTop: 3, fontWeight: 600 }}>Canchas y clases</p>
          </button>

          <button
            onClick={() => navigate('/pedir')}
            className="active:scale-[0.98] transition-transform text-left"
            style={{
              background: 'linear-gradient(135deg, #96C800 0%, #7BA600 100%)',
              borderRadius: 18,
              padding: '16px 14px',
              boxShadow: '0 3px 14px rgba(150,200,0,0.3)',
            }}
          >
            <span style={{ fontSize: 30, lineHeight: 1, display: 'block' }}>🍺</span>
            <p style={{ color: '#0a1a00', fontWeight: 900, fontSize: 17, lineHeight: 1.15, marginTop: 10 }}>Pedir al bar</p>
            <p style={{ color: 'rgba(10,26,0,0.65)', fontSize: 13, marginTop: 3, fontWeight: 600 }}>Directo a tu cancha</p>
          </button>
        </div>

        {/* Mis reservas */}
        <MisReservas apiFetch={apiFetch} navigate={navigate} />

        {/* Torneos */}
        <ProximosTorneos apiFetch={apiFetch} navigate={navigate} />

        {/* Novedades (teaser de Noticias) */}
        <Novedades navigate={navigate} />

        {/* Promos reclamables */}
        <button
          onClick={() => navigate('/puntos', { state: { tab: 'promos' } })}
          className="text-left active:scale-[0.98] transition-transform"
        >
          <div className="card flex items-center gap-3 py-3">
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#1b2e1b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 20 }}>
              🎁
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sp-gray font-bold text-[15px]">Promos para ti</p>
              <p className="text-gray-400 text-[13px]">Reclamalas y usalas en la caja</p>
            </div>
            <span className="text-[13px] font-bold text-sp-green-dark flex-shrink-0">Ver →</span>
          </div>
        </button>
      </div>

      {/* Spin keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
