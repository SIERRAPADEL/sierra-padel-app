import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';

// Marcadores de las retas: capturarlos y objetarlos.
//
// German (2026-08-10): "que al generarse una reta se habilite un marcador donde puedan
// poner quién va vs quién y cómo quedaron", y sobre quién lo da por bueno: "lo captura uno
// y el rival puede objetar".
// El diseño de la captura sale de eso: el jugador NO teclea nombres — toca a la gente del
// roster para armar las dos parejas, y sólo escribe los games. Menos escritura es menos
// datos basura, y el ranking del club se alimenta de aquí.

function fmtFecha(iso) {
  if (!iso) return '';
  const hoy = new Date().toLocaleDateString('sv-SE');
  const ayer = new Date(Date.now() - 864e5).toLocaleDateString('sv-SE');
  if (String(iso).slice(0, 10) === hoy) return 'Hoy';
  if (String(iso).slice(0, 10) === ayer) return 'Ayer';
  return new Date(iso + 'T12:00').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
}
const nombreCorto = (n) => String(n || 'Jugador').trim().split(/\s+/)[0];

// ── Capturar el marcador de UNA reta ─────────────────────────────────────────────
function Capturar({ reta, onListo, onCancelar }) {
  const { apiFetch } = useApi();
  // equipo[cliente_id] = 'a' | 'b' | undefined
  const [equipo, setEquipo] = useState({});
  const [sets, setSets] = useState([{ a: '', b: '' }]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const enA = reta.jugadores.filter(j => equipo[j.cliente_id] === 'a');
  const enB = reta.jugadores.filter(j => equipo[j.cliente_id] === 'b');
  const parejasOk = enA.length >= 1 && enA.length <= 2 && enB.length >= 1 && enB.length <= 2;
  const setsLlenos = sets.filter(s => s.a !== '' && s.b !== '');
  const setsOk = setsLlenos.length > 0 && setsLlenos.every(s => Number(s.a) !== Number(s.b));
  const puede = parejasOk && setsOk && !guardando;

  function toca(id) {
    setEquipo(prev => {
      const actual = prev[id];
      const sig = actual === 'a' ? 'b' : actual === 'b' ? undefined : 'a';
      const n = { ...prev }; if (sig) n[id] = sig; else delete n[id];
      return n;
    });
  }

  async function guardar() {
    setError(''); setGuardando(true);
    const pa = enA.map(j => ({ cliente_id: j.cliente_id, nombre: j.nombre }));
    const pb = enB.map(j => ({ cliente_id: j.cliente_id, nombre: j.nombre }));
    const body = { sets: setsLlenos.map(s => ({ pareja_a: pa, pareja_b: pb, games_a: Number(s.a), games_b: Number(s.b) })) };
    const d = await apiFetch(`/historial/reta/${reta.reservacion_id}`, { method: 'POST', body: JSON.stringify(body) });
    setGuardando(false);
    if (d.ok) onListo(d.data);
    else setError(d.error || 'No se pudo guardar el marcador');
  }

  return (
    <div className="card">
      <p className="font-black text-sp-gray text-[15px]">{fmtFecha(reta.fecha)} · Cancha {reta.cancha}</p>
      <p className="text-gray-400 text-xs mt-0.5">Toca a cada quien para ponerlo en un equipo. Un toque = equipo 1, dos = equipo 2.</p>

      <div className="flex flex-wrap gap-2 mt-3">
        {reta.jugadores.map(j => {
          const e = equipo[j.cliente_id];
          const base = 'px-3 py-2 rounded-xl text-sm font-bold border transition-colors';
          const estilo = e === 'a' ? { background: '#96C800', borderColor: '#96C800', color: '#fff' }
                       : e === 'b' ? { background: '#2F6BFF', borderColor: '#2F6BFF', color: '#fff' }
                       : { background: '#fff', borderColor: '#E5E7EB', color: '#6B7280' };
          return (
            <button key={j.cliente_id} type="button" className={base} style={estilo} onClick={() => toca(j.cliente_id)}>
              {e === 'a' ? '1 · ' : e === 'b' ? '2 · ' : ''}{nombreCorto(j.nombre)}
            </button>
          );
        })}
      </div>

      {parejasOk && (
        <div className="mt-4">
          <p className="text-xs font-bold text-gray-500 mb-2">
            <span style={{ color: '#7aaa00' }}>{enA.map(j => nombreCorto(j.nombre)).join(' y ')}</span>
            {' '}vs{' '}
            <span style={{ color: '#2F6BFF' }}>{enB.map(j => nombreCorto(j.nombre)).join(' y ')}</span>
          </p>
          {sets.map((s, i) => (
            <div key={i} className="flex items-center gap-2 mb-2">
              <span className="text-xs text-gray-400 w-10">Set {i + 1}</span>
              <input type="number" inputMode="numeric" min="0" max="30" value={s.a} placeholder="0"
                onChange={e => setSets(v => v.map((x, k) => k === i ? { ...x, a: e.target.value } : x))}
                className="w-16 text-center rounded-lg border border-gray-200 py-2 font-black" />
              <span className="text-gray-300 font-black">–</span>
              <input type="number" inputMode="numeric" min="0" max="30" value={s.b} placeholder="0"
                onChange={e => setSets(v => v.map((x, k) => k === i ? { ...x, b: e.target.value } : x))}
                className="w-16 text-center rounded-lg border border-gray-200 py-2 font-black" />
              {sets.length > 1 && (
                <button type="button" className="text-gray-300 text-lg px-1"
                  onClick={() => setSets(v => v.filter((_, k) => k !== i))} aria-label="Quitar set">×</button>
              )}
            </div>
          ))}
          {sets.length < 5 && (
            <button type="button" className="text-xs font-bold" style={{ color: '#7aaa00' }}
              onClick={() => setSets(v => [...v, { a: '', b: '' }])}>+ Agregar set</button>
          )}
        </div>
      )}

      {error && <p className="text-xs mt-3" style={{ color: '#E11D48' }}>{error}</p>}

      <div className="flex gap-2 mt-4">
        <button type="button" onClick={onCancelar} className="flex-1 py-2.5 rounded-xl border border-gray-200 font-bold text-gray-500 text-sm">Ahora no</button>
        <button type="button" onClick={guardar} disabled={!puede}
          className="flex-[1.4] py-2.5 rounded-xl font-black text-sm disabled:opacity-40"
          style={{ background: '#96C800', color: '#fff' }}>
          {guardando ? 'Guardando…' : 'Guardar marcador'}
        </button>
      </div>
      {!parejasOk && <p className="text-[11px] text-gray-400 mt-2">Necesitas al menos un jugador en cada equipo.</p>}
    </div>
  );
}

export default function Marcadores() {
  const { apiFetch } = useApi();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [abierta, setAbierta] = useState(null);   // reservacion_id que se está capturando
  const [msg, setMsg] = useState(null);
  const [objetando, setObjetando] = useState('');

  const cargar = useCallback(() => {
    apiFetch('/historial/mis-pendientes').then(d => { if (d.ok) setData(d.data); });
  }, [apiFetch]);
  useEffect(() => { cargar(); }, [cargar]);

  async function objetar(id) {
    setObjetando(id);
    const d = await apiFetch(`/historial/${id}/objetar`, { method: 'POST', body: JSON.stringify({}) });
    setObjetando('');
    setMsg(d.ok ? { ok: true, t: 'Listo, lo marcamos para que el club lo revise.' } : { ok: false, t: d.error || 'No se pudo objetar' });
    if (d.ok) cargar();
  }

  const porCapturar = (data && data.por_capturar) || [];
  const porRevisar  = (data && data.por_revisar) || [];
  const nada = data && !porCapturar.length && !porRevisar.length;

  return (
    <div className="page safe-bottom">
      <div className="bg-sp-gray px-5 pt-[env(safe-area-inset-top)] pb-4">
        <p className="text-white font-black text-lg pt-3">Marcadores</p>
        <p className="text-gray-300 text-xs mt-0.5">Tus retas y cómo quedaron</p>
      </div>

      {msg && (
        <div className="mx-4 mt-3 p-3 rounded-xl text-sm font-bold"
          style={{ background: msg.ok ? '#EDF7D6' : '#FEE2E2', color: msg.ok ? '#4F7A2E' : '#B91C1C' }}>
          {msg.t}
        </div>
      )}

      {!data && <p className="text-center text-gray-400 text-sm mt-10">Cargando…</p>}

      {nada && (
        <div className="mx-4 mt-6 card text-center">
          <p className="text-4xl">🎾</p>
          <p className="font-black text-sp-gray mt-2">Nada pendiente</p>
          <p className="text-gray-400 text-sm mt-1">Cuando juegues una reta, aquí podrás poner cómo quedó.</p>
        </div>
      )}

      {porRevisar.length > 0 && (
        <div className="mx-4 mt-4">
          <p className="text-sm font-black text-sp-gray mb-1">Revisa estos marcadores</p>
          <p className="text-gray-400 text-xs mb-2">Los capturó otro jugador. Si algo no cuadra, dilo y el club lo revisa. Si no, en unas horas quedan firmes.</p>
          {porRevisar.map(j => (
            <div key={j.id} className="card mb-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-black text-sp-gray text-[15px]">
                    {j.gane ? '🏆 Ganaste' : 'Perdiste'} <span className="font-mono">{j.marcador}</span>
                  </p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    {fmtFecha(j.fecha)}{j.cancha ? ` · Cancha ${j.cancha}` : ''} · vs {j.contra.map(nombreCorto).join(' y ')}
                  </p>
                  <p className="text-gray-300 text-[11px] mt-0.5">Quedan {j.horas_restantes} h para objetar</p>
                </div>
                <button type="button" onClick={() => objetar(j.id)} disabled={objetando === j.id}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-500 disabled:opacity-40 whitespace-nowrap">
                  {objetando === j.id ? '…' : 'No quedó así'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {porCapturar.length > 0 && (
        <div className="mx-4 mt-5">
          <p className="text-sm font-black text-sp-gray mb-1">¿Cómo quedaron?</p>
          <p className="text-gray-400 text-xs mb-2">Pon el marcador de tus retas. Cuenta para tu récord y el ranking del club.</p>
          {porCapturar.map(r => (
            abierta === r.reservacion_id
              ? <Capturar key={r.reservacion_id} reta={r}
                  onCancelar={() => setAbierta(null)}
                  onListo={() => { setAbierta(null); setMsg({ ok: true, t: 'Marcador guardado. Tus rivales pueden revisarlo.' }); cargar(); }} />
              : (
                <div key={r.reservacion_id} className="card mb-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-black text-sp-gray text-[15px]">{fmtFecha(r.fecha)} · Cancha {r.cancha}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{r.jugadores.map(j => nombreCorto(j.nombre)).join(', ')}</p>
                  </div>
                  <button type="button" onClick={() => setAbierta(r.reservacion_id)}
                    className="px-3.5 py-2 rounded-xl font-black text-xs whitespace-nowrap"
                    style={{ background: '#96C800', color: '#fff' }}>Poner marcador</button>
                </div>
              )
          ))}
        </div>
      )}
    </div>
  );
}
