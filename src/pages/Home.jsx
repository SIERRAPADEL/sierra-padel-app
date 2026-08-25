import { useEffect, useState } from 'react';
import PrenderAvisos from '../components/PrenderAvisos';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import Isotipo from '../components/Isotipo';
import PromoExpressBanner from '../components/PromoExpressBanner';
import AvisosApagados from '../components/AvisosApagados';
import NivelSelector from '../components/NivelSelector';
import { BACKEND } from '../lib/constants';
import { formatFecha, formatHora, fmtRelativa, parseLocalDate } from '../lib/format';

// ── Modal: completa tu perfil (cuentas creadas antes de que el nivel fuera requisito) ──
function NivelModal({ apiFetch, updateUser, onClose }) {
  const [nivel, setNivel]     = useState(null);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  async function guardar() {
    if (!nivel || saving) return;
    setSaving(true);
    setError('');
    const d = await apiFetch('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify({ categoria: nivel }),
    });
    setSaving(false);
    if (d.ok) {
      updateUser({ categoria: d.data?.cliente?.categoria || nivel });
      onClose();
    } else {
      setError(d.error || 'No se pudo guardar. Intenta de nuevo.');
    }
  }

  return (
    // 🔴 85vh NO es 85% de lo que se ve en un celular: vh no descuenta la barra del
    // navegador, así que la caja queda más alta que la pantalla y el último botón ("Lo hago
    // después") se corta. Visto en pantalla el 24-ago-2026. dvh sí la descuenta.
    <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-[60] px-4"
         style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}>
      <div className="bg-white rounded-3xl p-5 w-full max-w-sm flex flex-col gap-4 overflow-y-auto overscroll-contain"
           style={{ maxHeight: "min(85dvh, calc(100vh - 48px))" }}>
        <div className="text-center">
          <p className="text-xl font-black text-sp-gray">🎾 ¿Cual es tu nivel de juego?</p>
          <p className="text-sm text-gray-400 mt-1">Con esto te avisamos de retas y torneos de tu nivel</p>
        </div>
        <NivelSelector value={nivel} onChange={setNivel} compact />
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        <button onClick={guardar} disabled={!nivel || saving} className="btn-green disabled:opacity-50">
          {saving ? 'Guardando…' : 'Guardar mi nivel'}
        </button>
        <button onClick={onClose} className="text-gray-400 text-sm text-center">Lo hago despues</button>
      </div>
    </div>
  );
}

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
                  {r.tipo === 'clase' ? (r.instructor ? `Clase con ${r.instructor}` : 'Clase') : `Cancha ${r.cancha}`}
                </p>
                <p className="text-gray-400 text-[13px]">
                  {formatHora(r.hora_inicio)}{r.duracion_minutos ? ` · ${r.duracion_minutos} min` : ''}
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

// ── La reta de HOY en la que voy: a todo el ancho, arriba de todo ─────────────
// Pedido de German (13-ago): "si hay una reta activa, quiero que esa tarjeta pase a plano
// principal tomando el ancho del display completo, al darle click entras a la pantalla de
// la reta". Es la puerta a /reta/:token — por eso TODA la tarjeta es el boton, no un
// enlace chiquito: se abre con el pulgar, de pie en la cancha.
function RetaActiva({ r, onAbrir }) {
  const completa = r.faltan === 0;
  return (
    <button
      onClick={onAbrir}
      className="w-full text-left rounded-3xl overflow-hidden active:scale-[.99] transition-transform"
      style={{ background: 'linear-gradient(135deg,#7aaa00 0%,#96C800 100%)' }}
    >
      <div className="px-5 py-4">
        <div className="flex items-center justify-between">
          <span className="text-white/70 text-[11px] font-black tracking-[.18em] uppercase">
            Tu reta de hoy
          </span>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/20 text-white">
            {completa ? 'Completa' : r.faltan === 1 ? 'falta 1' : `faltan ${r.faltan}`}
          </span>
        </div>

        <div className="flex items-end gap-3 mt-2">
          <p className="text-white font-black leading-none tabular-nums" style={{ fontSize: 40 }}>
            {r.hora_inicio}
          </p>
          <p className="text-white/85 font-bold text-[15px] pb-1">Cancha {r.cancha}</p>
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: r.cupo }).map((_, i) => (
              <span key={i} style={{ width: 9, height: 9, borderRadius: 99, background: i < r.apuntados ? '#fff' : 'rgba(255,255,255,.35)' }} />
            ))}
            <span className="text-white/80 text-[12px] font-bold ml-1.5">
              {r.apuntados} de {r.cupo}
            </span>
          </div>
          <span className="text-white font-black text-[14px] flex items-center gap-1">
            Abrir
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </div>
    </button>
  );
}

// ── Seccion: Retas abiertas (matchmaking) ─────────────────────────────────────
function RetasAbiertas({ apiFetch, navigate }) {
  const [retas, setRetas] = useState(null);
  const [joining, setJoining] = useState('');
  const [msg, setMsg] = useState(null);

  const load = () => {
    apiFetch('/reta/feed')
      .then(d => setRetas(d.ok ? d.data : []))
      .catch(() => setRetas([]));
  };
  useEffect(() => { load(); }, []);

  async function join(r) {
    setJoining(r.token);
    setMsg(null);
    const d = await apiFetch(`/reta/${r.token}/unirme-app`, { method: 'POST' });
    setJoining('');
    if (d.ok) { setMsg({ ok: true, text: '¡Estas dentro! 🎾' }); load(); }
    else setMsg({ ok: false, text: d.error || 'No se pudo. Intenta de nuevo.' });
  }

  // Sin retas no ocupamos espacio (la página completa vive en /retas)
  if (!retas?.length) return null;

  // LA RETA DE HOY EN LA QUE VOY sube a primer plano, a todo el ancho (German, 13-ago).
  // Es la unica que tiene algo que hacer ahora mismo: armar parejas, ver con quien juegas
  // y capturar el marcador al terminar. Las demas siguen en la lista de abajo.
  const hoyISO = new Date().toLocaleDateString('sv-SE');
  const activa = retas.find(r => (r.ya_apuntado || r.es_mia) && String(r.fecha).slice(0, 10) === hoyISO);
  const top = retas.filter(r => r !== activa).slice(0, 3);

  return (
    <div className="flex flex-col gap-2">
      {activa && <RetaActiva r={activa} onAbrir={() => navigate(`/reta/${activa.token}`)} />}

      {top.length > 0 && (
        <SectionHeader title="🎾 Retas abiertas" actionLabel="Ver todas" onAction={() => navigate('/retas')} />
      )}
      {msg && (
        <p className={`text-[13px] text-center font-medium ${msg.ok ? 'text-sp-green' : 'text-red-500'}`}>{msg.text}</p>
      )}
      <div className="flex flex-col gap-2">
        {top.map(r => (
          <div key={r.token} className="card flex items-center gap-3 py-3">
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#EDF7D6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 900, color: '#5a8a00', textTransform: 'capitalize' }}>
                {formatFecha(r.fecha).split(' ')[0]}
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#7aaa00' }}>{r.hora_inicio}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sp-gray font-bold text-[15px] truncate">
                {r.organizador || 'Reta'} · Cancha {r.cancha}
              </p>
              <p className="text-gray-400 text-[13px]">
                {r.nivel_objetivo || 'Abierta a todos'} · {r.faltan === 1 ? 'falta 1' : `faltan ${r.faltan}`}
              </p>
            </div>
            {r.es_mia ? (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 flex-shrink-0">Tu reta</span>
            ) : r.ya_apuntado ? (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-sp-green-light text-sp-green-dark flex-shrink-0">✓ Ya vas</span>
            ) : (
              <button
                onClick={() => join(r)}
                disabled={joining === r.token}
                className="text-[13px] font-black px-3.5 py-2 rounded-full bg-sp-green text-white active:scale-95 transition-transform flex-shrink-0 disabled:opacity-50"
              >
                {joining === r.token ? '…' : 'Me apunto'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Avatar del torneo en el Home: su thumbnail si está cargado, y si no el trofeo de
// siempre (German 17-ago: "cuando esté vacía que se sigan mostrando los emojis de
// trofeo"). Si la imagen falla al cargar también cae al trofeo — un hueco gris se ve
// peor que el emoji. La relación torneo_media llega como objeto O arreglo según el
// caso, por eso se lee tolerando las dos formas.
function TorneoAvatar({ torneo }) {
  const m = torneo?.torneo_media;
  const url = ((Array.isArray(m) ? m[0] : m) || {}).logo_torneo_url;
  const [falló, setFalló] = useState(false);
  const caja = {
    width: 44, height: 44, borderRadius: 10, background: '#1a1a2e',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, fontSize: 20, overflow: 'hidden',
  };
  if (!url || falló) return <div style={caja}>🏆</div>;
  return (
    <div style={caja}>
      <img
        src={url}
        alt=""
        loading="lazy"
        onError={() => setFalló(true)}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
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
                <TorneoAvatar torneo={t} />
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

// ── Promo de bienvenida: primera renta $200 (solo si el cliente aún la tiene) ──
function PromoBienvenida({ apiFetch, navigate }) {
  const [promo, setPromo] = useState(null);
  useEffect(() => {
    apiFetch('/reservas/primera-renta')
      .then(d => { if (d?.ok && d.elegible) setPromo(d); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!promo) return null;
  return (
    <button onClick={() => navigate('/reservar')} className="text-left active:scale-[0.98] transition-transform">
      <div className="card flex items-center gap-3 py-3" style={{ border: '1.5px solid #96C800' }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: '#1a2a00', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 20 }}>
          🎉
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sp-gray font-bold text-[15px]">Tu primera renta a ${promo.precio || 200}</p>
          <p className="text-gray-400 text-[13px]">
            Comprando 1 bote de pelotas SP{promo.bote?.precio ? ` ($${promo.bote.precio})` : ''} · cancha completa 90 min
          </p>
        </div>
        <span className="text-[13px] font-bold text-sp-green-dark flex-shrink-0">Reservar →</span>
      </div>
    </button>
  );
}

// ── Pagina principal ──────────────────────────────────────────────────────────
// ── Aviso de marcadores pendientes ──────────────────────────────────────────────
// Sólo aparece si hay algo que hacer. Un acceso permanente a una pantalla vacía se
// vuelve ruido y la gente deja de verlo; así, cuando sale, significa algo.
function AvisoMarcadores() {
  const { apiFetch } = useApi();
  const navigate = useNavigate();
  const [p, setP] = useState(null);
  useEffect(() => {
    apiFetch('/historial/mis-pendientes').then(d => { if (d.ok) setP(d.data); }).catch(() => {});
  }, []);
  const cap = (p && p.por_capturar.length) || 0;
  const rev = (p && p.por_revisar.length) || 0;
  const res = (p && p.por_resolver && p.por_resolver.length) || 0;
  if (!cap && !rev && !res) return null;
  // Primero lo que trae a alguien esperando respuesta: si no contestas, ese juego se
  // invalida para los dos. Luego lo tuyo por capturar, y al final lo que sólo hay que ojear.
  const texto = res
    ? (res === 1 ? 'Un rival no está de acuerdo con tu marcador' : `${res} rivales no están de acuerdo con tus marcadores`)
    : cap
    ? (cap === 1 ? 'Tienes una reta sin marcador' : `Tienes ${cap} retas sin marcador`)
    : (rev === 1 ? 'Revisa el marcador de tu reta' : `Revisa ${rev} marcadores de tus retas`);
  return (
    <button type="button" onClick={() => navigate('/marcadores')}
      className="w-full text-left px-5 py-3 flex items-center justify-between gap-3 active:opacity-80"
      style={{ background: '#EDF7D6' }}>
      <span className="text-sm font-black" style={{ color: '#4F7A2E' }}>🎾 {texto}</span>
      <span className="text-xs font-bold" style={{ color: '#7aaa00' }}>Abrir ›</span>
    </button>
  );
}

export default function Home() {
  const { user, updateUser } = useAuth();
  const { apiFetch } = useApi();
  const navigate    = useNavigate();
  const [puntos, setPuntos] = useState(null);
  // Pedir el nivel UNA vez por sesión a cuentas que aún no lo tienen
  const [pedirNivel, setPedirNivel] = useState(() =>
    !sessionStorage.getItem('nivelPromptVisto')
  );
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
      {/* Completa tu perfil: nivel de juego (cuentas previas al requisito) */}
      {pedirNivel && user && !user.categoria && (
        <NivelModal
          apiFetch={apiFetch}
          updateUser={updateUser}
          onClose={() => { sessionStorage.setItem('nivelPromptVisto', '1'); setPedirNivel(false); }}
        />
      )}
      {/* ── Header ── */}
      <AvisoMarcadores />
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
      <PrenderAvisos motivo="Te avisamos tu cancha, tus retas y cuando se libere un lugar." />
      <div className="px-4 py-4 flex flex-col gap-4">
        {/* Promo Express: sensible al tiempo, siempre hasta arriba */}
        <PromoExpressBanner />

        {/* Bienvenida: primera renta $200 (solo clientes que aún la tienen) */}
        <PromoBienvenida apiFetch={apiFetch} navigate={navigate} />

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

        {/* Retas abiertas (matchmaking) */}
        <RetasAbiertas apiFetch={apiFetch} navigate={navigate} />

        {/* Sin avisos el jugador no se entera de que lo invitaron a una reta. Va aquí abajo,
            pegado a las retas, porque es justo lo que se está perdiendo. */}
        <AvisosApagados />

        {/* Mis reservas */}
        <MisReservas apiFetch={apiFetch} navigate={navigate} />

        {/* Torneos */}
        <ProximosTorneos apiFetch={apiFetch} navigate={navigate} />

        {/* Novedades (teaser de Noticias) */}
        <Novedades navigate={navigate} />

        {/* Liga Viernes Botanero */}
        <button
          onClick={() => navigate('/botanero')}
          className="text-left active:scale-[0.98] transition-transform"
        >
          <div className="card flex items-center gap-3 py-3">
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#2e1b06', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 20 }}>
              🍻
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sp-gray font-bold text-[15px]">Viernes Botanero</p>
              <p className="text-gray-400 text-[13px]">Liga individual · 6:30 $100 · 8:00 $50</p>
            </div>
            <span className="text-[13px] font-bold text-sp-green-dark flex-shrink-0">Ver →</span>
          </div>
        </button>

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
