import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';

// 🎾 CLASE ABIERTA en la app (German 14-oct-2026, prueba piloto con Fran, martes 9 am):
// «se comparte en redes y se hace un push en la app. Necesitamos avisar que no separa por
// niveles, que es clase abierta a todo público y que para abrirse son mínimo 3 alumnos y
// máximo 6. Costo de 3-4 $150 p/p, costo de 5-6 $125».
// El objetivo es ADQUISICIÓN (22-sep): gente que por precio, pena o falta de motivación no
// toma una clase. Por eso la pantalla dice primero que es para TODOS, y luego el precio.
// Un toque: la app ya sabe tu nombre y tu WhatsApp (/clase-abierta/unirme-app).

function fechaLarga(iso) {
  return new Date(String(iso).slice(0, 10) + 'T12:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' });
}
// Mayúscula sólo a la primera letra: «Martes 20 de oct», no «Martes 20 De Oct».
const cap = (t) => String(t).charAt(0).toUpperCase() + String(t).slice(1);
function hora12(h) {
  const [a, b] = String(h || '').split(':').map(Number);
  return `${(a % 12) || 12}:${String(b || 0).padStart(2, '0')} ${a < 12 ? 'am' : 'pm'}`;
}

function ClaseCard({ c, onJoin, joining }) {
  const faltan = Math.max(0, c.cupo_min - c.inscritos);
  const voy = c.mi_estado === 'inscrito', espero = c.mi_estado === 'espera';
  const llena = c.lugares === 0;
  return (
    <div className={`card ${voy ? 'border-sp-green/40' : ''}`}>
      <div className="flex items-start gap-3">
        <div style={{ width: 52, height: 52, borderRadius: 12, background: 'var(--sp-green-light)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 900, color: 'var(--sp-green-deep)', textTransform: 'capitalize', lineHeight: 1.1 }}>
            {fechaLarga(c.fecha).split(' ')[0].replace(',', '')}
          </span>
          <span style={{ fontSize: 15, fontWeight: 900, color: 'var(--sp-green-dark)', lineHeight: 1.1 }}>
            {String(c.fecha).slice(8, 10)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-sp-gray text-[15px] leading-tight">{cap(fechaLarga(c.fecha))} · {hora12(c.hora)}</p>
          <p className="text-[13px] text-gray-400 mt-0.5">Con {c.coach} · 1 hora</p>
          <p className="text-[13px] font-black text-sp-green-dark mt-1">
            {voy || espero ? `Pagas en recepción: $${c.precio_actual} por persona` : `Si te unes: $${c.precio_si_te_unes} por persona`}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {Array.from({ length: c.cupo_max }).map((_, i) => (
            <span key={i} style={{ width: 10, height: 10, borderRadius: 99, background: i < c.inscritos ? 'var(--sp-green)' : '#e5e7eb' }} />
          ))}
          <span className="text-xs text-gray-400 font-semibold ml-1">
            {c.confirmada ? '✅ Confirmada' : faltan === 1 ? 'falta 1 para abrir' : `faltan ${faltan} para abrir`}
          </span>
        </div>
        {voy ? (
          <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-sp-green-light text-sp-green-dark">✓ Ya vas</span>
        ) : espero ? (
          <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-gray-100 text-gray-500">En espera</span>
        ) : (
          <button
            onClick={() => onJoin(c)}
            disabled={joining === c.fecha + c.horario_id}
            className="text-[13px] font-black px-4 py-2 rounded-full bg-sp-green text-white active:scale-95 transition-transform disabled:opacity-50"
          >
            {joining === c.fecha + c.horario_id ? 'Apartando…' : llena ? 'Lista de espera' : '¡Me apunto!'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ClaseAbierta() {
  const { apiFetch } = useApi();
  const navigate = useNavigate();
  const [clases, setClases] = useState(null);
  const [joining, setJoining] = useState('');
  const [msg, setMsg] = useState(null);

  const load = useCallback(() => {
    apiFetch('/clase-abierta/proximas-app')
      .then(d => setClases(d.ok ? d.data : []))
      .catch(() => setClases([]));
  }, [apiFetch]);
  useEffect(() => { load(); }, [load]);

  async function join(c) {
    setJoining(c.fecha + c.horario_id);
    setMsg(null);
    const d = await apiFetch('/clase-abierta/unirme-app', { method: 'POST', body: JSON.stringify({ horario_id: c.horario_id, fecha: c.fecha }) });
    setJoining('');
    if (!d.ok) { setMsg({ ok: false, text: d.error || 'No se pudo. Intenta de nuevo.' }); return; }
    const x = d.data || {};
    // La clase no siempre está abierta todavía: se abre al juntarse el mínimo.
    setMsg({ ok: true, text:
      x.estado === 'espera' ? 'La clase está llena: quedaste en lista de espera. Si alguien se baja, entras tú.'
      : x.confirmada ? '¡Lugar apartado! La clase ya está confirmada. Llega 10 min antes 🎾'
      : `¡Lugar apartado! Van ${x.inscritos}; se abre al juntarse ${x.cupo_min}. Te avisamos.` });
    load();
  }

  const c0 = (clases || [])[0];

  return (
    <div className="page safe-bottom">
      <div className="bg-sp-green px-5 pt-[env(safe-area-inset-top)] pb-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-white/70 text-sm mb-1 -ml-1 pt-3">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Inicio
        </button>
        <p className="text-white font-black text-lg">Clase abierta</p>
        <p className="text-white/70 text-[13px] mt-0.5">Para todo público · todos los niveles</p>
      </div>

      <div className="px-4 py-4 flex flex-col gap-3">
        {c0 && (
          <div className="card">
            <p className="font-black text-sp-gray text-[15px]">Ven como estés 🎾</p>
            <ul className="text-[14px] text-gray-500 mt-2 flex flex-col gap-1.5">
              <li>• <b className="text-sp-gray">No se separa por niveles:</b> es una clase abierta a todo público, nunca hayas jugado o ya juegues.</li>
              <li>• Se abre con <b className="text-sp-gray">mínimo {c0.cupo_min}</b> y máximo {c0.cupo_max} alumnos.</li>
              {c0.precio_grupo && c0.grupo_desde ? (
                <li>• <b className="text-sp-gray">${c0.precio} por persona</b> si son {c0.cupo_min} o {c0.grupo_desde - 1} · <b className="text-sp-gray">${c0.precio_grupo} por persona</b> si son {c0.grupo_desde} o {c0.cupo_max}.</li>
              ) : (
                <li>• <b className="text-sp-gray">${c0.precio} por persona</b>.</li>
              )}
              <li>• Se paga en recepción el día de la clase.</li>
            </ul>
          </div>
        )}

        {msg && <p className={`text-sm text-center font-medium ${msg.ok ? 'text-sp-green' : 'text-red-500'}`}>{msg.text}</p>}

        {clases === null && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-sp-green border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {clases?.length === 0 && (
          <div className="card text-center py-12">
            <p className="text-3xl mb-3">🎾</p>
            <p className="text-gray-500 font-medium">Por ahora no hay clases abiertas programadas</p>
            <p className="text-gray-400 text-sm mt-1.5">Pregunta en recepción.</p>
          </div>
        )}
        {(clases || []).map(c => <ClaseCard key={c.fecha + c.horario_id} c={c} onJoin={join} joining={joining} />)}
      </div>
    </div>
  );
}
