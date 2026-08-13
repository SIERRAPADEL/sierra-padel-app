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
// Dos repartos son el MISMO aunque vengan con los lados o el orden cambiados.
const mismoCombo = (x, y) => {
  const k = (c) => [[...(c.a || [])].sort().join(), [...(c.b || [])].sort().join()].sort().join('|');
  return k(x) === k(y);
};

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
// Ya NO se toca para armar parejas: las parejas viven en cada JUEGO, porque rotan. Aqui
// solo se presenta a la gente con sus numeros.
function Jugador({ j }) {
  return (
    <div className="w-full flex items-center gap-3 p-3 rounded-2xl border border-gray-100 bg-white text-left">
      <div
        className="flex items-center justify-center font-black text-white shrink-0"
        style={{ width: 40, height: 40, borderRadius: 12, background: '#D1D5DB', fontSize: 15 }}
      >
        {(j.nombre_corto || '?').slice(0, 1).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-black text-sp-gray text-[15px] leading-tight truncate">
          {j.nombre_corto}
          {j.soy_yo && <span className="ml-1.5 text-[11px] font-bold text-sp-green">tú</span>}
          {j.es_titular && <span className="ml-1.5 text-[11px] font-medium text-gray-400">organiza</span>}
        </p>
        <Stats j={j} />
      </div>
    </div>
  );
}

// ── La decoracion del ganador: esto es lo que se va a screenshotear ──────────────
// Sin botones ni nada tocable dentro: lo que se ve es lo que sale en la foto.
//
// EXPORTADA a proposito: es la pieza que botanero y ligas van a reusar tal cual. No sabe
// de retas — recibe fecha, cancha, parejas y sets, y con eso corona a quien sea.
export function Ganador({ d }) {
  const r = d.resultado;
  const tabla = r.tabla || [];
  const campeon = r.campeon;
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

        {/* Con las parejas rotando, el que gana es un JUGADOR, no una pareja. */}
        {campeon ? (
          <>
            <p className="text-[42px] leading-none mt-4">🏆</p>
            <p className="text-white font-black text-[24px] leading-tight mt-2 px-2">
              {campeon.nombre}
            </p>
            <p className="text-white/60 text-[12px] font-bold mt-1 tracking-[.15em]">CAMPEÓN</p>
          </>
        ) : (
          <>
            <p className="text-[38px] leading-none mt-4">🤝</p>
            <p className="text-white font-black text-[19px] leading-tight mt-2 px-2">
              {(r.empatados || []).map(t => pila(t.nombre)).join(' · ') || 'Empate'}
            </p>
            <p className="text-white/60 text-[12px] font-bold mt-1 tracking-[.15em]">EMPATADOS</p>
          </>
        )}

        {/* La tabla: es lo que hace que se presuma. Un renglon por jugador. */}
        <div className="mt-5 rounded-2xl bg-black/25 px-3 py-2 text-left">
          {tabla.map(t => {
            const esCampeon = campeon && t.cliente_id === campeon.cliente_id;
            return (
              <div key={t.cliente_id} className={`flex items-center gap-2 py-1.5 ${esCampeon ? '' : 'opacity-75'}`}>
                <span className="text-white/40 font-black tabular-nums w-4 text-[13px] shrink-0">{t.pos}</span>
                <span className="text-white font-bold text-[14px] flex-1 min-w-0 truncate leading-tight">
                  {pila(t.nombre)}
                </span>
                <span className="text-white font-black tabular-nums text-[15px] shrink-0">
                  {t.ganados}<span className="text-white/40">-{t.perdidos}</span>
                </span>
                <span className="text-white/50 font-bold tabular-nums text-[12px] w-9 text-right shrink-0">
                  {t.dif_games > 0 ? '+' : ''}{t.dif_games}
                </span>
              </div>
            );
          })}
        </div>

        {/* Los juegos, en chiquito: el detalle de como se llego ahi */}
        <div className="mt-3 flex flex-col gap-1">
          {(r.juegos || []).map(j => (
            <p key={j.set} className="text-white/45 text-[11px] leading-tight">
              {(j.pareja_a || []).map(p => pila(p.nombre)).join('+')}
              <span className="text-white/70 font-bold tabular-nums"> {j.games_a}-{j.games_b} </span>
              {(j.pareja_b || []).map(p => pila(p.nombre)).join('+')}
            </p>
          ))}
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
  // 🔑 UNA RETA SON VARIOS JUEGOS Y LAS PAREJAS ROTAN (German, 13-ago: "poder tener varias
  // parejas en una misma reta, como si fuera un tipo de liga"). Cada juego lleva SU pareja
  // y SU marcador — asi es como se juega de verdad: cuatro amigos rotan compañero.
  // juego = { a: [cliente_id], b: [cliente_id], ga: '', gb: '' }
  const [juegos, setJuegos] = useState([]);
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
      })
      .catch(() => setError('No se pudo abrir la reta.'))
      .finally(() => setCargando(false));
  }, [apiFetch, token]);

  useEffect(() => { cargar(); }, [cargar]);

  const hayResultado = !!(d && d.resultado);
  const puedeCapturar = !!(d && d.voy && !hayResultado);
  const jugadores = (d && d.jugadores) || [];
  const porId = Object.fromEntries(jugadores.map(j => [j.cliente_id, j]));

  // Con 4 jugadores hay EXACTAMENTE 3 formas de repartirlos en parejas. Se ofrecen de un
  // toque en vez de hacer que la gente arme parejas a mano cada ronda: es la rotacion
  // clasica de una cancha, y asi teclear el resultado es cuestion de segundos.
  const combinaciones = (() => {
    const ids = jugadores.map(j => j.cliente_id).filter(Boolean);
    if (ids.length !== 4) return null;
    const [p, q, r, s] = ids;
    return [
      { a: [p, q], b: [r, s] },
      { a: [p, r], b: [q, s] },
      { a: [p, s], b: [q, r] },
    ];
  })();

  const nombresDe = (ids) => (ids || []).map(id => (porId[id] || {}).nombre_corto || '?').join(' + ');

  function agregarJuego(combo) {
    setConfirmar(false);
    setJuegos(v => [...v, { a: combo.a, b: combo.b, ga: '', gb: '' }]);
  }
  function quitarJuego(i) {
    setConfirmar(false);
    setJuegos(v => v.filter((_, n) => n !== i));
  }
  // Cambiar la pareja de UN juego no toca los demas: cada uno es independiente. Pero sí
  // limpia SU marcador, porque esos games ya no dicen lo mismo con otra pareja.
  function rotarJuego(i) {
    setConfirmar(false);
    setJuegos(v => v.map((j, n) => {
      if (n !== i || !combinaciones) return j;
      const actual = combinaciones.findIndex(c => mismoCombo(c, j));
      const sig = combinaciones[(actual + 1 + combinaciones.length) % combinaciones.length];
      return { a: sig.a, b: sig.b, ga: '', gb: '' };
    }));
  }
  function setGames(i, lado, val) {
    setConfirmar(false);
    setJuegos(v => v.map((j, n) => n === i ? { ...j, [lado]: val.replace(/\D/g, '').slice(0, 2) } : j));
  }

  const juegosLlenos = juegos.filter(j => j.ga !== '' && j.gb !== '');
  const juegosOk = juegosLlenos.length > 0 && juegosLlenos.every(j => Number(j.ga) !== Number(j.gb));

  async function guardarMarcador() {
    setGuardando(true); setMsg(null);
    const comoPareja = (ids) => (ids || []).map(id => ({ cliente_id: id, nombre: (porId[id] || {}).nombre }));
    const body = { sets: juegosLlenos.map(j => ({
      pareja_a: comoPareja(j.a), pareja_b: comoPareja(j.b),
      games_a: Number(j.ga), games_b: Number(j.gb),
    })) };
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

        {/* Si ya termino, la tarjeta del campeon va ARRIBA: es lo que se viene a ver */}
        {hayResultado && <Ganador d={d} />}

        {/* Jugadores + stats */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide px-1 mb-2">Quiénes juegan</p>
          <div className="flex flex-col gap-2">
            {jugadores.map(j => <Jugador key={j.cliente_id || j.nombre} j={j} />)}
          </div>
        </div>

        {/* LOS JUEGOS DE LA RETA. Cada uno con SU pareja y SU marcador — las parejas rotan. */}
        {puedeCapturar && (
          <div className="card">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Juegos</p>
            <p className="text-[13px] text-sp-gray mt-1 mb-3 leading-snug">
              Agrega un juego por cada vez que cambiaron de pareja. Al terminar, sale la tabla
              con quién ganó más.
            </p>

            {juegos.map((j, i) => (
              <div key={i} className="rounded-2xl border border-gray-100 p-3 mb-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black text-gray-400 uppercase tracking-wide">
                    Juego {i + 1}
                  </span>
                  <div className="flex items-center gap-3">
                    {combinaciones && (
                      <button onClick={() => rotarJuego(i)} className="text-[12px] font-bold text-sp-green-dark">
                        ↻ Cambiar parejas
                      </button>
                    )}
                    <button onClick={() => quitarJuego(i)} className="text-[12px] font-bold text-gray-300">
                      Quitar
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {[{ lado: 'a', c: '#96C800', ids: j.a, g: 'ga' }, { lado: 'b', c: '#3B6FD4', ids: j.b, g: 'gb' }].map(
                    ({ lado, c, ids, g }, n) => (
                      <div key={lado} className="flex-1 min-w-0 flex items-center gap-2">
                        {n === 1 && <span className="text-gray-300 font-black shrink-0">–</span>}
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-black truncate mb-1" style={{ color: c }}>
                            {nombresDe(ids)}
                          </p>
                          {/* min-w-0 + w-full: un <input> no se encoge bajo su ancho propio */}
                          <input
                            inputMode="numeric" value={j[g]} placeholder="0"
                            onChange={e => setGames(i, g, e.target.value)}
                            className="text-center font-black tabular-nums w-full min-w-0 rounded-xl px-2 py-3 text-lg outline-none border-2"
                            style={{ borderColor: c, background: `${c}10`, color: c }}
                          />
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            ))}

            {/* Las 3 combinaciones posibles, de un toque. Con 4 jugadores no hay mas. */}
            {combinaciones ? (
              <div className="flex flex-col gap-2 mt-1">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">
                  {juegos.length ? 'Agregar otro juego' : 'Elige quién jugó contra quién'}
                </p>
                {combinaciones.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => agregarJuego(c)}
                    className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 px-3 active:scale-95 transition-transform"
                  >
                    <span className="text-[13px] font-black" style={{ color: '#96C800' }}>{nombresDe(c.a)}</span>
                    <span className="text-gray-300 font-bold mx-2">vs</span>
                    <span className="text-[13px] font-black" style={{ color: '#3B6FD4' }}>{nombresDe(c.b)}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-gray-400 text-center py-3">
                Se necesitan los 4 jugadores apuntados para capturar los juegos.
              </p>
            )}

            {juegos.length > 0 && (
              <>
                <button
                  onClick={() => { if (!confirmar) setConfirmar(true); else guardarMarcador(); }}
                  disabled={!juegosOk || guardando}
                  className={`btn-green mt-4 disabled:opacity-40 ${confirmar ? 'bg-red-500' : ''}`}
                >
                  {guardando ? 'Guardando…' : confirmar ? '⚠️ Sí, terminar la reta' : '🏁 Terminar reta'}
                </button>
                {confirmar ? (
                  <div className="mt-2">
                    <p className="text-[12px] text-red-500 text-center font-semibold">
                      Se guardan los {juegosLlenos.length} juego(s) y ya no se puede cambiar aquí.
                    </p>
                    <button onClick={() => setConfirmar(false)} className="w-full text-gray-400 text-[13px] font-bold py-2">
                      Mejor no, sigo editando
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-400 text-center mt-2">
                    Termínala cuando ya no vayan a jugar más. Después los rivales pueden objetarlo.
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
