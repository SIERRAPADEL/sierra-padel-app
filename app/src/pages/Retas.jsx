import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';

function fmtFecha(iso) {
  if (!iso) return '';
  const hoy = new Date().toLocaleDateString('sv-SE');
  if (String(iso).slice(0, 10) === hoy) return 'Hoy';
  return new Date(iso + 'T12:00').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
}

// Tarjeta de una reta del feed. Reutilizada por la página Retas y el teaser de Home.
export function RetaCard({ r, onJoin, joining }) {
  const esHoy = fmtFecha(r.fecha) === 'Hoy';
  return (
    <div className={`card ${r.compatible && !r.es_mia && !r.ya_apuntado ? 'border-sp-green/40' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div style={{ width: 44, height: 44, borderRadius: 10, background: esHoy ? '#96C800' : '#EDF7D6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 900, color: esHoy ? '#fff' : '#5a8a00', lineHeight: 1.1, textTransform: 'capitalize' }}>
              {esHoy ? 'HOY' : fmtFecha(r.fecha).split(' ')[0]}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: esHoy ? 'rgba(255,255,255,.85)' : '#7aaa00' }}>
              {r.hora_inicio}
            </span>
          </div>
          <div>
            <p className="font-black text-sp-gray text-[15px] leading-tight">
              {/* Una cancha que abre el CLUB no tiene organizador: "Reta de un jugador"
                  se lee como si alguien la hubiera armado. */}
              {r.es_club ? `Cancha ${r.cancha} abierta` : `Reta de ${r.organizador || 'un jugador'} · Cancha ${r.cancha}`}
            </p>
            <p className="text-[13px] text-gray-400 mt-0.5 capitalize">
              {fmtFecha(r.fecha)} · {r.hora_inicio}
              {r.nivel_objetivo ? ` · ${r.nivel_objetivo} (±1)` : ' · Abierta a todos'}
            </p>
            {/* EL PRECIO. Sin esto la app anunciaba una cancha en promoción sin decir
                cuánto cuesta — y en una promo el precio es el gancho entero. */}
            {r.precio_jugador != null && (
              <p className="text-[13px] font-black text-sp-green-dark mt-1">
                ${r.precio_jugador} por jugador
                <span className="text-gray-400 font-semibold"> · cancha ${r.precio} entre {r.cupo}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3">
        {/* Cupos como puntos */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: r.cupo }).map((_, i) => (
            <span key={i} style={{ width: 10, height: 10, borderRadius: 99, background: i < r.apuntados ? '#96C800' : '#e5e7eb' }} />
          ))}
          <span className="text-xs text-gray-400 font-semibold ml-1">
            {r.faltan === 0 ? 'Completa' : r.faltan === 1 ? 'falta 1' : `faltan ${r.faltan}`}
          </span>
        </div>

        {r.es_mia ? (
          <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-gray-100 text-gray-500">Tu reta</span>
        ) : r.ya_apuntado ? (
          <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-sp-green-light text-sp-green-dark">✓ Ya vas</span>
        ) : r.faltan > 0 ? (
          <button
            onClick={() => onJoin(r)}
            disabled={joining === r.token}
            className="text-[13px] font-black px-4 py-2 rounded-full bg-sp-green text-white active:scale-95 transition-transform disabled:opacity-50"
          >
            {joining === r.token ? 'Apuntando…' : '¡Me apunto!'}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function Retas() {
  const { apiFetch } = useApi();
  const navigate = useNavigate();
  const [retas, setRetas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState('');
  const [msg, setMsg] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch('/reta/feed')
      .then(d => setRetas(d.ok ? d.data : []))
      .catch(() => setRetas([]))
      .finally(() => setLoading(false));
  }, [apiFetch]);

  useEffect(() => { load(); }, [load]);

  async function join(r) {
    setJoining(r.token);
    setMsg(null);
    const d = await apiFetch(`/reta/${r.token}/unirme-app`, { method: 'POST' });
    setJoining('');
    if (d.ok) {
      setMsg({ ok: true, text: '¡Estas dentro! Te esperamos en la cancha 🎾' });
      load();
    } else {
      setMsg({ ok: false, text: d.error || 'No se pudo. Intenta de nuevo.' });
    }
  }

  const compatibles = (retas || []).filter(r => r.compatible);
  const otras       = (retas || []).filter(r => !r.compatible);

  return (
    <div className="page safe-bottom">
      <div className="bg-sp-green px-5 pt-[env(safe-area-inset-top)] pb-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-white/70 text-sm mb-1 -ml-1 pt-3">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Inicio
        </button>
        <p className="text-white font-black text-lg">Retas abiertas</p>
        <p className="text-white/60 text-[13px] mt-0.5">Apuntate con un toque · el club te espera</p>
      </div>

      <div className="px-4 py-4 flex flex-col gap-3">
        {msg && (
          <p className={`text-sm text-center font-medium ${msg.ok ? 'text-sp-green' : 'text-red-500'}`}>{msg.text}</p>
        )}

        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-sp-green border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && retas?.length === 0 && (
          <div className="card text-center py-12">
            <p className="text-3xl mb-3">🎾</p>
            <p className="text-gray-500 font-medium">No hay retas abiertas ahora</p>
            <p className="text-gray-400 text-sm mt-1.5 px-4">
              ¿Tienes cancha reservada y te falta gente? Abre tu reta desde "Mis reservas" y te ayudamos a completarla.
            </p>
            <button
              onClick={() => navigate('/reservar', { state: { tab: 'mis' } })}
              className="mt-4 text-[15px] font-bold text-sp-green-dark"
            >
              Ir a mis reservas →
            </button>
          </div>
        )}

        {!loading && compatibles.length > 0 && (
          <>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide px-1">De tu nivel</p>
            {compatibles.map(r => <RetaCard key={r.token} r={r} onJoin={join} joining={joining} />)}
          </>
        )}

        {!loading && otras.length > 0 && (
          <>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide px-1 mt-2">Otras retas</p>
            {otras.map(r => <RetaCard key={r.token} r={r} onJoin={join} joining={joining} />)}
          </>
        )}

        {!loading && (
          <button onClick={load} className="text-sp-green text-sm font-semibold text-center py-2">
            Actualizar
          </button>
        )}
      </div>
    </div>
  );
}
