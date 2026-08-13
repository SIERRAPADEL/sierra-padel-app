import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';

// La pantalla de LA reta (German, 13-ago): horario, cancha, participantes con sus stats al
// lado del nombre, armar parejas, capturar los sets, y si ya hay ganador una decoracion
// pensada para que con un SCREENSHOT lo compartan en redes.
//
// Por que existe teniendo ya /marcadores: el motor de captura estaba ahi desde el 10-ago y
// en un mes NADIE capturo una sola reta (12 resultados en la BD, los 12 del botanero). No
// faltaba motor, faltaba que la reta fuera algo que se abre y se ve.
//
// Pensada para que botanero y ligas la reusen: lo unico especifico de "reta" es de donde
// salen los datos; el bloque de parejas, sets y ganador no sabe de que torneo viene.

// Se capitaliza SOLO la primera letra, a mano. La clase `capitalize` de CSS toca cada
// palabra y deja "Jueves, 13 De Agosto" — feo en algo que va a acabar en redes.
const capitaliza = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const fmtFechaLarga = (iso) => {
  if (!iso) return '';
  const hoy = new Date().toLocaleDateString('sv-SE');
  const d = new Date(iso + 'T12:00');
  const txt = capitaliza(d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }));
  return String(iso).slice(0, 10) === hoy ? `Hoy · ${txt}` : txt;
};
// Para el marcador se usan nombres de pila: dos nombres completos por lado no caben en un
// telefono y se cortaban con "...", que en una foto para redes se ve descuidado.
const pila = (n) => String(n || '').trim().split(/\s+/)[0];

// ── Stats de un jugador, al lado de su nombre ────────────────────────────────────
function Stats({ j }) {
  const r = j.record;
  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-1">
      {j.nivel && (
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sp-green-light text-sp-green-dark">
          {j.nivel}
        </span>
      )}
      {r ? (
        <>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
            {r.sets_g}-{r.sets_p} <span className="font-medium text-gray-400">sets</span>
          </span>
          {r.pos <= 10 && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
              #{r.pos} del club
            </span>
          )}
        </>
      ) : (
        // Sin juegos NO es 0-0: un 0-0 se lee como "jugo y perdio todo".
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-50 text-gray-400">
          sin juegos aun
        </span>
      )}
    </div>
  );
}

// ── Un jugador en la lista ───────────────────────────────────────────────────────
function Jugador({ j, equipo, onTocar, editable }) {
  const color = equipo === 'a' ? '#96C800' : equipo === 'b' ? '#3B6FD4' : null;
  return (
    <button
      type="button"
      disabled={!editable}
      onClick={() => onTocar(j.cliente_id)}
      className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-colors ${
        editable ? 'active:scale-[.99]' : ''
      }`}
      style={{
        background: color ? `${color}12` : '#fff',
        borderColor: color || '#f3f4f6',
      }}
    >
      <div
        className="flex items-center justify-center font-black text-white shrink-0"
        style={{ width: 40, height: 40, borderRadius: 12, background: color || '#D1D5DB', fontSize: 15 }}
      >
        {equipo ? equipo.toUpperCase() : (j.nombre_corto || '?').slice(0, 1).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-black text-sp-gray text-[15px] leading-tight truncate">
          {j.nombre_corto}
          {j.soy_yo && <span className="ml-1.5 text-[11px] font-bold text-sp-green">tú</span>}
          {j.es_titular && <span className="ml-1.5 text-[11px] font-medium text-gray-400">organiza</span>}
        </p>
        <Stats j={j} />
      </div>
    </button>
  );
}

// ── La decoracion del ganador: esto es lo que se va a screenshotear ──────────────
// Sin botones ni nada tocable dentro: lo que se ve es lo que sale en la foto.
//
// EXPORTADA a proposito: es la pieza que botanero y ligas van a reusar tal cual. No sabe
// de retas — recibe fecha, cancha, parejas y sets, y con eso corona a quien sea.
export function Ganador({ d }) {
  const r = d.resultado;
  const nombres = (lado) =>
    (lado === 'a' ? r.pareja_a : r.pareja_b).map(p => p.nombre).join('  ·  ');
  const gana = r.ganador;
  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{ background: 'linear-gradient(160deg,#1b2b00 0%,#3f6300 55%,#96C800 100%)' }}
    >
      <div className="px-5 pt-6 pb-5 text-center">
        {/* EL LOGO (German: "hay que poner el logo de Sierra Padel en algun lugar porque es
            importante"). Va aqui y no en otro lado: esta tarjeta es la que acaba en redes,
            asi que es donde la marca trabaja. Se usa el isotipo BLANCO sobre transparente,
            que es el que se ve en fondo oscuro. */}
        <div className="flex items-center justify-center gap-2">
          <img src="/icons/isotipo-mask.png" alt="" width="26" height="26" style={{ opacity: 0.9 }} />
          <p className="text-white/70 text-[12px] font-black tracking-[.22em] uppercase">Sierra Padel</p>
        </div>
        <p className="text-white/80 text-[12px] font-semibold mt-1.5">
          {fmtFechaLarga(d.fecha)} · Cancha {d.cancha}
        </p>

        <p className="text-[42px] leading-none mt-4">🏆</p>
        <p className="text-white font-black text-[20px] leading-tight mt-2 px-2">
          {nombres(gana)}
        </p>
        <p className="text-white/60 text-[12px] font-bold mt-1">GANADORES</p>

        {/* Marcador tipo tablero: un renglon por pareja. Antes iban lado a lado y los
            nombres se cortaban con "..."; asi caben y se lee de un vistazo en la foto. */}
        <div className="mt-5 rounded-2xl bg-black/25 px-4 py-3 text-left">
          {[
            { lado: 'a', sets: r.sets_a, games: r.sets.map(s => s.games_a) },
            { lado: 'b', sets: r.sets_b, games: r.sets.map(s => s.games_b) },
          ].map(({ lado, sets, games }) => {
            const esGanador = gana === lado;
            return (
              <div key={lado} className={`flex items-center gap-3 py-1.5 ${esGanador ? '' : 'opacity-70'}`}>
                <span className="text-white font-bold text-[14px] flex-1 leading-tight">
                  {(lado === 'a' ? r.pareja_a : r.pareja_b).map(p => pila(p.nombre)).join(' · ')}
                </span>
                <span className="flex items-center gap-1.5 shrink-0">
                  {games.map((g, i) => (
                    <span key={i} className="text-white/60 text-[13px] font-bold tabular-nums w-5 text-center">{g}</span>
                  ))}
                </span>
                <span className={`font-black tabular-nums w-7 text-center shrink-0 ${esGanador ? 'text-white text-[24px]' : 'text-white/60 text-[20px]'}`}>
                  {sets}
                </span>
              </div>
            );
          })}
        </div>

        {r.estado === 'propuesto' && (
          <p className="text-white/45 text-[11px] mt-3">
            Marcador recién capturado — los rivales pueden objetarlo
          </p>
        )}
      </div>
    </div>
  );
}

export default function Reta() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { apiFetch } = useApi();

  const [d, setD] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [equipo, setEquipo] = useState({});      // cliente_id -> 'a' | 'b'
  const [sets, setSets] = useState([{ a: '', b: '' }]);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState(null);
  // Terminar la reta es irreversible: el primer toque avisa, el segundo lo hace.
  const [confirmar, setConfirmar] = useState(false);

  const cargar = useCallback(() => {
    setCargando(true);
    apiFetch(`/reta/${token}/detalle`)
      .then(r => {
        if (!r.ok) { setError(r.error || 'No se pudo abrir la reta.'); return; }
        setD(r.data);
        // Las parejas guardadas se pintan solas al entrar.
        const e = {};
        const p = r.data.parejas;
        if (p) { (p.a || []).forEach(id => { e[id] = 'a'; }); (p.b || []).forEach(id => { e[id] = 'b'; }); }
        setEquipo(e);
      })
      .catch(() => setError('No se pudo abrir la reta.'))
      .finally(() => setCargando(false));
  }, [apiFetch, token]);

  useEffect(() => { cargar(); }, [cargar]);

  const hayResultado = !!(d && d.resultado);
  const puedeEditarParejas = !!(d && d.voy && !hayResultado);

  function tocar(id) {
    if (!id || !puedeEditarParejas) return;
    setConfirmar(false);   // cambiar las parejas desarma el "sí, terminar"
    setEquipo(prev => {
      const sig = prev[id] === 'a' ? 'b' : prev[id] === 'b' ? undefined : 'a';
      const n = { ...prev };
      if (sig) n[id] = sig; else delete n[id];
      return n;
    });
  }

  const enA = (d?.jugadores || []).filter(j => equipo[j.cliente_id] === 'a');
  const enB = (d?.jugadores || []).filter(j => equipo[j.cliente_id] === 'b');
  const parejasOk = enA.length >= 1 && enA.length <= 2 && enB.length >= 1 && enB.length <= 2;

  async function guardarParejas() {
    setGuardando(true); setMsg(null);
    const r = await apiFetch(`/reta/${token}/parejas`, {
      method: 'POST',
      body: JSON.stringify({ a: enA.map(j => j.cliente_id), b: enB.map(j => j.cliente_id) }),
    });
    setGuardando(false);
    if (r.ok) { setMsg({ ok: true, text: 'Parejas guardadas' }); cargar(); }
    else setMsg({ ok: false, text: r.error || 'No se pudieron guardar' });
  }

  const setsLlenos = sets.filter(s => s.a !== '' && s.b !== '');
  const setsOk = setsLlenos.length > 0 && setsLlenos.every(s => Number(s.a) !== Number(s.b));

  async function guardarMarcador() {
    setGuardando(true); setMsg(null);
    const pa = enA.map(j => ({ cliente_id: j.cliente_id, nombre: j.nombre }));
    const pb = enB.map(j => ({ cliente_id: j.cliente_id, nombre: j.nombre }));
    const body = { sets: setsLlenos.map(s => ({ pareja_a: pa, pareja_b: pb, games_a: Number(s.a), games_b: Number(s.b) })) };
    const r = await apiFetch(`/historial/reta/${d.reservacion_id}`, { method: 'POST', body: JSON.stringify(body) });
    setGuardando(false);
    if (r.ok) { setMsg({ ok: true, text: '¡Marcador guardado!' }); cargar(); }
    else setMsg({ ok: false, text: r.error || 'No se pudo guardar el marcador' });
  }

  if (cargando) {
    return (
      <div className="page items-center justify-center">
        <div className="w-8 h-8 border-4 border-sp-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (error || !d) {
    return (
      <div className="page safe-bottom px-5 pt-20 text-center">
        <p className="text-4xl mb-3">🎾</p>
        <p className="text-gray-500 font-medium">{error || 'Reta no encontrada'}</p>
        <button onClick={() => navigate('/retas')} className="mt-5 text-sp-green-dark font-bold">
          Ver retas abiertas →
        </button>
      </div>
    );
  }

  return (
    <div className="page safe-bottom">
      {/* Encabezado: el horario y la cancha, que es lo que se pregunta al abrir */}
      <div className="bg-sp-green px-5 pt-[env(safe-area-inset-top)] pb-5">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-white/70 text-sm mb-2 -ml-1 pt-3">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Atrás
        </button>
        <p className="text-white/70 text-[13px] font-semibold">{fmtFechaLarga(d.fecha)}</p>
        <p className="text-white font-black text-[26px] leading-tight tabular-nums">
          {d.hora_inicio}<span className="text-white/60 text-[18px]"> – {d.hora_fin}</span>
        </p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-[12px] font-black px-2.5 py-1 rounded-full bg-white/20 text-white">
            Cancha {d.cancha}
          </span>
          {d.nivel_objetivo && (
            <span className="text-[12px] font-bold px-2.5 py-1 rounded-full bg-white/15 text-white/90">
              {d.nivel_objetivo}
            </span>
          )}
          <span className="text-[12px] font-bold px-2.5 py-1 rounded-full bg-white/15 text-white/90">
            {d.jugadores.length}/{d.cupo} jugadores
          </span>
        </div>
      </div>

      <div className="px-4 py-4 flex flex-col gap-4">
        {msg && (
          <p className={`text-sm text-center font-medium ${msg.ok ? 'text-sp-green-dark' : 'text-red-500'}`}>
            {msg.text}
          </p>
        )}

        {/* Si ya hay ganador, va ARRIBA de todo: es lo que se viene a ver y a compartir */}
        {hayResultado && d.resultado.ganador && <Ganador d={d} />}

        {/* Jugadores + stats */}
        <div>
          <div className="flex items-baseline justify-between px-1 mb-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Quiénes juegan</p>
            {puedeEditarParejas && d.jugadores.length >= 2 && (
              <p className="text-[11px] text-gray-400">toca para armar parejas</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {d.jugadores.map(j => (
              <Jugador
                key={j.cliente_id || j.nombre}
                j={j}
                equipo={equipo[j.cliente_id]}
                onTocar={tocar}
                editable={puedeEditarParejas && !!j.cliente_id}
              />
            ))}
          </div>

          {puedeEditarParejas && parejasOk && (
            <button
              onClick={guardarParejas}
              disabled={guardando}
              className="btn-outline mt-3 disabled:opacity-50"
            >
              {guardando ? 'Guardando…' : d.parejas ? 'Actualizar parejas' : 'Guardar parejas'}
            </button>
          )}
          {puedeEditarParejas && d.parejas && (
            // German (13-ago): "tambien la opcion de cambiar de pareja disponible". Guardar
            // las parejas NO las congela — se siguen cambiando tocando a la gente hasta que
            // la reta se termina. Se dice con todas sus letras porque el boton "Guardar"
            // sugiere lo contrario.
            <p className="text-[12px] text-gray-400 text-center mt-2">
              Puedes cambiarlas: toca a los jugadores otra vez.
            </p>
          )}
        </div>

        {/* Marcador */}
        {hayResultado ? (
          !d.resultado.ganador && (
            <div className="card text-center">
              <p className="text-gray-500 font-medium">Marcador empatado en sets</p>
            </div>
          )
        ) : d.voy && parejasOk ? (
          <div className="card">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Marcador</p>
            {/* Cada columna con el COLOR de su pareja y su nombre encima: sin esto hay que
                acordarse de cual numero es de quien, y ahi es donde se equivoca uno. */}
            <div className="flex items-center gap-3 mb-2">
              <span className="w-12" />
              {[{ k: 'a', c: '#96C800', l: enA }, { k: 'b', c: '#3B6FD4', l: enB }].map(({ k, c, l }) => (
                <span key={k} className="flex-1 text-center text-[12px] font-black truncate" style={{ color: c }}>
                  {l.map(j => j.nombre_corto).join(' · ') || k.toUpperCase()}
                </span>
              ))}
            </div>
            {sets.map((s, i) => (
              <div key={i} className="flex items-center gap-3 mb-2">
                <span className="text-[13px] font-bold text-gray-400 w-12">Set {i + 1}</span>
                {[{ k: 'a', c: '#96C800' }, { k: 'b', c: '#3B6FD4' }].map(({ k, c }) => (
                  <input
                    key={k}
                    inputMode="numeric" value={s[k]} placeholder="0"
                    onChange={e => { setConfirmar(false); setSets(v => v.map((x, n) => n === i ? { ...x, [k]: e.target.value.replace(/\D/g, '').slice(0, 2) } : x)); }}
                    className="text-center font-black tabular-nums flex-1 rounded-xl px-4 py-3 text-lg outline-none border-2 transition-colors"
                    style={{ borderColor: c, background: `${c}10`, color: c }}
                  />
                ))}
              </div>
            ))}
            {sets.length < 5 && (
              // German: "poner mas grande el boton de proximo set". Se teclea con el pulgar
              // sudado al terminar de jugar.
              <button
                onClick={() => setSets(v => [...v, { a: '', b: '' }])}
                className="w-full border-2 border-dashed border-gray-200 text-gray-500 font-bold py-3.5 rounded-xl text-[15px] active:scale-95 transition-transform mt-1"
              >
                + Otro set
              </button>
            )}

            {/* German: "si le das guardar se cierra y ya no puedes modificar nada, se puede
                prestar a muchos errores; en lugar de guardar debe decir terminar reta".
                Lo vivio el mismo: cerro la reta de prueba sin querer. Ahora el boton dice lo
                que hace, y el primer toque solo AVISA — el mismo patron del arqueo de caja. */}
            <button
              onClick={() => { if (!confirmar) setConfirmar(true); else guardarMarcador(); }}
              disabled={!setsOk || guardando}
              className={`btn-green mt-3 disabled:opacity-40 ${confirmar ? 'bg-red-500' : ''}`}
            >
              {guardando ? 'Guardando…' : confirmar ? '⚠️ Sí, terminar la reta' : '🏁 Terminar reta'}
            </button>
            {confirmar ? (
              <div className="mt-2">
                <p className="text-[12px] text-red-500 text-center font-semibold">
                  Se guarda el resultado y ya no se puede cambiar aquí.
                </p>
                <button onClick={() => setConfirmar(false)} className="w-full text-gray-400 text-[13px] font-bold py-2">
                  Mejor no, sigo editando
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-gray-400 text-center mt-2">
                Termínala sólo cuando el marcador esté completo. Después los rivales pueden objetarlo.
              </p>
            )}
          </div>
        ) : d.voy ? (
          <div className="card text-center py-6">
            <p className="text-gray-500 font-medium">Arma las dos parejas para poder capturar el marcador</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
