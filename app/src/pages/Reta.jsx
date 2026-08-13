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
// TODOS los nombres de jugador van en MAYUSCULAS (German, 13-ago). Se hace en JS y no con
// la clase `uppercase` de CSS: asi el texto ya viaja en mayusculas y sale igual en el
// screenshot, en el ticket o donde sea que se reuse este componente.
const MAY = (n) => String(n || '').toUpperCase();
// Identifica una pareja por sus jugadores, sin importar el orden.
const clave = (p) => (Array.isArray(p) ? p : []).map(x => x && x.cliente_id).filter(Boolean).sort().join('|');
// Dos repartos son el MISMO aunque vengan con los lados o el orden cambiados.
const mismoCombo = (x, y) => {
  const k = (c) => [[...(c.a || [])].sort().join(), [...(c.b || [])].sort().join()].sort().join('|');
  return k(x) === k(y);
};

// El numero de ranking del club, pegado al nombre como en el circuito profesional
// (German, 13-ago: "en las stats podemos dejar solo el numero de ranking y ponerlo cerca
// del nombre como si fuera un jugador profesional"). Nada mas: el nivel y el record eran
// ruido al lado de esto.
const rankDe = (j) => (j && j.record && j.record.pos) || null;

// ── La decoracion del ganador: esto es lo que se va a screenshotear ──────────────
// Sin botones ni nada tocable dentro: lo que se ve es lo que sale en la foto.
//
// EXPORTADA a proposito: es la pieza que botanero y ligas van a reusar tal cual. No sabe
// de retas — recibe fecha, cancha, parejas y sets, y con eso corona a quien sea.
export function Ganador({ d }) {
  const r = d.resultado;
  const tabla = r.tabla || [];
  const campeon = r.campeon;
  const fija = !!(r.parejas_fijas && r.pareja);   // jugaron con la misma pareja toda la reta
  const p = r.pareja;
  return (
    // 📱 PANTALLA COMPLETA, FORMATO HISTORIA (German, 13-ago: "deberia ser mas grande; la
    // pantalla completa como para subirlo a historias de IG"). Ocupa todo el alto de la
    // pantalla para que el screenshot ya venga en proporcion de story, sin recortar.
    // `100svh` y no `100vh`: en el celular, vh cuenta la barra del navegador y la tarjeta
    // se desbordaba justo por lo que mide esa barra.
    <div
      className="w-full flex flex-col justify-center"
      style={{
        minHeight: '100svh',
        background: 'linear-gradient(160deg,#1b2b00 0%,#3f6300 55%,#96C800 100%)',
      }}
    >
      <div className="px-6 py-8 text-center">
        {/* EL LOGO Y EL NOMBRE DEL CLUB, en grande (German: "podemos aprovechar para poner
            mas grande el nombre del club"). Esta pantalla es la que acaba en redes: es
            donde la marca trabaja. Isotipo BLANCO sobre transparente, el que se ve en
            fondo oscuro. */}
        <div className="flex items-center justify-center gap-3">
          <img src="/icons/isotipo-mask.png" alt="" width="42" height="42" style={{ opacity: 0.95 }} />
          <p className="text-white text-[22px] font-black tracking-[.16em] uppercase leading-none">
            Sierra Padel
          </p>
        </div>
        <p className="text-white/70 text-[14px] font-semibold mt-3">
          {fmtFechaLarga(d.fecha)} · Cancha {d.cancha}
        </p>

        {/* LAS DOS FORMAS DE JUGAR UNA RETA, y no se leen igual:
              · pareja fija → ganan DOS juntos. Partido de toda la vida.
              · rotando     → gana UNO. Liguilla. */}
        {fija ? (
          <>
            <p className="text-[72px] leading-none mt-8">{p.ganador ? '🏆' : '🤝'}</p>
            {/* UN NOMBRE POR RENGLON (German, 13-ago: "1 nombre por renglon, mas limpio
                mejor presentacion"). Dos nombres largos en una linea se partian donde caia
                y se veia descuidado en la foto. */}
            <div className="mt-4 px-1">
              {p.ganador
                ? (p.ganador === 'a' ? p.a : p.b).map(x => (
                    <p key={x.cliente_id || x.nombre} className="text-white font-black text-[34px] leading-[1.15]">
                      {MAY(x.nombre)}
                    </p>
                  ))
                : <p className="text-white font-black text-[34px] leading-[1.15]">EMPATE</p>}
            </div>
            <p className="text-white/60 text-[15px] font-bold mt-2 tracking-[.2em]">
              {p.ganador ? 'GANADORES' : 'EMPATADOS'}
            </p>

            {/* Tablero de dos renglones: pareja, sus games por set, y sets ganados */}
            <div className="mt-9 rounded-3xl bg-black/25 px-5 py-4 text-left">
              {[{ lado: 'a', jug: p.a, sets: p.sets_a }, { lado: 'b', jug: p.b, sets: p.sets_b }].map(({ lado, jug, sets }) => (
                <div key={lado} className={`flex items-center gap-3 py-3 ${p.ganador === lado || !p.ganador ? '' : 'opacity-70'}`}>
                  <span className="flex-1 min-w-0">
                    {(jug || []).map(x => (
                      <span key={x.cliente_id || x.nombre} className="block text-white font-bold text-[19px] leading-[1.25]">
                        {MAY(pila(x.nombre))}
                      </span>
                    ))}
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    {(r.juegos || []).map(j => {
                      // El lado puede venir volteado entre sets: se toma el games que le
                      // toca a ESTA pareja, no el de la columna.
                      const esA = clave(j.pareja_a) === clave(p.a);
                      const g = (lado === 'a') === esA ? j.games_a : j.games_b;
                      return <span key={j.set} className="text-white/55 text-[18px] font-bold tabular-nums w-6 text-center">{g}</span>;
                    })}
                  </span>
                  <span className={`font-black tabular-nums w-10 text-center shrink-0 ${p.ganador === lado ? 'text-white text-[38px]' : 'text-white/55 text-[30px]'}`}>
                    {sets}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            {campeon ? (
              <>
                <p className="text-[72px] leading-none mt-8">🏆</p>
                <p className="text-white font-black text-[38px] leading-[1.15] mt-4 px-1">{MAY(campeon.nombre)}</p>
                <p className="text-white/60 text-[15px] font-bold mt-2 tracking-[.2em]">CAMPEÓN</p>
              </>
            ) : (
              <>
                <p className="text-[64px] leading-none mt-8">🤝</p>
                <div className="mt-4 px-1">
                  {(r.empatados || []).length
                    ? r.empatados.map(t => (
                        <p key={t.cliente_id} className="text-white font-black text-[30px] leading-[1.15]">
                          {MAY(pila(t.nombre))}
                        </p>
                      ))
                    : <p className="text-white font-black text-[30px] leading-[1.15]">EMPATE</p>}
                </div>
                <p className="text-white/60 text-[15px] font-bold mt-2 tracking-[.2em]">EMPATADOS</p>
              </>
            )}

            {/* La tabla individual: es lo que hace que se presuma */}
            <div className="mt-9 rounded-3xl bg-black/25 px-4 py-3 text-left">
              {tabla.map(t => {
                const esCampeon = campeon && t.cliente_id === campeon.cliente_id;
                return (
                  <div key={t.cliente_id} className={`flex items-center gap-3 py-2.5 ${esCampeon ? '' : 'opacity-75'}`}>
                    <span className="text-white/40 font-black tabular-nums w-6 text-[18px] shrink-0">{t.pos}</span>
                    <span className="text-white font-bold text-[20px] flex-1 min-w-0 truncate leading-tight">
                      {MAY(pila(t.nombre))}
                    </span>
                    <span className="text-white font-black tabular-nums text-[22px] shrink-0">
                      {t.ganados}<span className="text-white/40">-{t.perdidos}</span>
                    </span>
                    <span className="text-white/50 font-bold tabular-nums text-[16px] w-12 text-right shrink-0">
                      {t.dif_games > 0 ? '+' : ''}{t.dif_games}
                    </span>
                  </div>
                );
              })}
            </div>

          </>
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
  // ROTAR PAREJAS (German, 13-ago: "mejor debes poner un checkbox de rotar parejas para
  // esos casos"). Apagado por default porque el caso normal es jugar con el mismo compañero
  // toda la reta; con las tres combinaciones siempre a la vista la pantalla era puro ruido.
  const [rotar, setRotar] = useState(false);

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

  // UN NOMBRE POR RENGLON, en MAYUSCULAS, con su numero de ranking del club pegado al
  // estilo del circuito profesional (German, 13-ago). Antes iban los dos en una linea
  // separados por "+" y con nombres largos se partia donde caia.
  const nombresDe = (ids) => (ids || []).map((id) => {
    const j = porId[id] || {};
    const pos = rankDe(j);
    return (
      <span key={id} className="block leading-[1.3]">
        {MAY(j.nombre_corto || '?')}
        {pos && <span className="text-gray-400 font-bold"> #{pos}</span>}
      </span>
    );
  });

  // Al entrar ya hay un set listo con la primera combinacion: el caso normal es pareja fija,
  // y asi se teclea el marcador sin tocar nada mas.
  useEffect(() => {
    if (!puedeCapturar || !combinaciones || juegos.length) return;
    setJuegos([{ a: combinaciones[0].a, b: combinaciones[0].b, ga: '', gb: '' }]);
  }, [puedeCapturar, combinaciones, juegos.length]);

  function agregarJuego() {
    setConfirmar(false);
    let nuevoIdx = 0;
    setJuegos(v => {
      const ult = v[v.length - 1];
      // Sin rotar, el set nuevo hereda la pareja: es la misma gente todo el rato.
      const base = rotar && combinaciones
        ? combinaciones[(combinaciones.findIndex(c => mismoCombo(c, ult)) + 1) % combinaciones.length]
        : ult;
      nuevoIdx = v.length;
      return [...v, { a: base.a, b: base.b, ga: '', gb: '' }];
    });
    // El cursor cae solo en el cuadro nuevo: agregar set y teclear sin tocar la pantalla.
    setTimeout(() => {
      const el = document.getElementById(`g-${nuevoIdx}-ga`);
      if (el) el.focus();
    }, 0);
  }
  function quitarJuego(i) {
    setConfirmar(false);
    setJuegos(v => (v.length <= 1 ? v : v.filter((_, n) => n !== i)));
  }
  // Cambia el reparto. Sin rotar cambia el de TODOS (es una sola pareja para la reta);
  // rotando cambia solo el de ese juego. En los dos casos limpia los games afectados:
  // esos numeros ya no dicen lo mismo con otra pareja.
  function cambiarPareja(i) {
    if (!combinaciones) return;
    setConfirmar(false);
    setJuegos(v => {
      const actual = combinaciones.findIndex(c => mismoCombo(c, v[i]));
      const sig = combinaciones[(actual + 1 + combinaciones.length) % combinaciones.length];
      return v.map((j, n) => (rotar && n !== i)
        ? j
        : { a: sig.a, b: sig.b, ga: '', gb: '' });
    });
  }
  // SALTO AUTOMATICO AL SIGUIENTE CUADRO (German, 13-ago: "que el espacio para marcador
  // brinque al siguiente cuadro de manera horizontal despues de capturar el primero, para
  // mayor agilidad"). Se teclea con una mano, de pie en la cancha: cada toque de menos vale.
  //
  // Salta con UN digito y sólo cuando el cuadro estaba VACIO. Dos motivos:
  //   · los games de padel son 0-7; esperar un segundo digito haria que nunca saltara.
  //   · al CORREGIR un numero ya escrito no debe saltar, o no se puede arreglar nada.
  // Si alguien necesita un 10+, toca el cuadro y escribe: el limite de 2 digitos sigue ahi.
  function setGames(i, lado, val) {
    setConfirmar(false);
    const limpio = val.replace(/\D/g, '').slice(0, 2);
    const estabaVacio = (juegos[i] || {})[lado] === '';
    setJuegos(v => v.map((j, n) => n === i ? { ...j, [lado]: limpio } : j));
    if (estabaVacio && limpio.length === 1) {
      const sig = lado === 'ga' ? `g-${i}-gb` : `g-${i + 1}-ga`;
      // En el siguiente tick: el input destino puede no existir hasta que React repinte.
      setTimeout(() => {
        const el = document.getElementById(sig);
        if (el) { el.focus(); el.select(); }
      }, 0);
    }
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

  // 📱 RETA TERMINADA = LA PANTALLA ES LA FOTO. Sin encabezado verde de la app, sin
  // márgenes: el screenshot se sube tal cual a una historia. El unico control es una
  // flecha flotante para volver, chiquita y en una esquina — si sale en la foto, no
  // estorba, y sin ella la pantalla seria una trampa sin salida.
  if (hayResultado) {
    return (
      <div className="relative">
        <button
          onClick={() => navigate(-1)}
          aria-label="Atrás"
          className="absolute z-10 flex items-center justify-center rounded-full bg-black/25 text-white active:scale-90 transition-transform"
          style={{ top: 'calc(env(safe-area-inset-top) + 12px)', left: 12, width: 38, height: 38 }}
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
            <path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <Ganador d={d} />
        {/* Debajo del pliegue, fuera de la foto: es informacion de tramite. */}
        {d.resultado.estado === 'propuesto' && (
          <p className="text-[12px] text-gray-400 text-center py-4 px-6 leading-snug bg-sp-gray-light">
            Marcador recién capturado — los que jugaron pueden objetarlo si algo no cuadra.
          </p>
        )}
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

        {/* Ya NO hay lista de "Quiénes juegan" (German, 13-ago: "es redundante"): los cuatro
            nombres ya salen en el marcador, con su numero de ranking al lado. */}

        {puedeCapturar && (
          <div className="card">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Marcador</p>

            {!combinaciones ? (
              <p className="text-[13px] text-gray-400 text-center py-3">
                Se necesitan los 4 jugadores apuntados para capturar el marcador.
              </p>
            ) : (
              <>
                {/* SIN ROTAR: la pareja se enseña UNA vez arriba y los sets van debajo, pelados.
                    Antes cada set repetia los nombres y era puro ruido. */}
                {!rotar && juegos[0] && (
                  <button
                    onClick={() => cambiarPareja(0)}
                    className="w-full flex items-start gap-2 mb-3 text-left active:scale-[.99] transition-transform"
                  >
                    <span className="text-[14px] font-black flex-1 min-w-0 leading-tight" style={{ color: '#96C800' }}>
                      {nombresDe(juegos[0].a)}
                    </span>
                    <span className="text-gray-300 font-bold text-[13px] shrink-0">vs</span>
                    <span className="text-[14px] font-black flex-1 min-w-0 leading-tight text-right" style={{ color: '#3B6FD4' }}>
                      {nombresDe(juegos[0].b)}
                    </span>
                    <span className="text-gray-300 text-[16px] shrink-0">↻</span>
                  </button>
                )}

                {juegos.map((j, i) => (
                  <div key={i} className="mb-2">
                    {/* ROTANDO: cada set enseña SU pareja, porque cambia */}
                    {rotar && (
                      <button
                        onClick={() => cambiarPareja(i)}
                        className="w-full flex items-start gap-2 mb-1 text-left"
                      >
                        <span className="text-[12px] font-black flex-1 min-w-0 leading-tight" style={{ color: '#96C800' }}>
                          {nombresDe(j.a)}
                        </span>
                        <span className="text-gray-300 font-bold text-[11px] shrink-0">vs</span>
                        <span className="text-[12px] font-black flex-1 min-w-0 leading-tight text-right" style={{ color: '#3B6FD4' }}>
                          {nombresDe(j.b)}
                        </span>
                        <span className="text-gray-300 text-[14px] shrink-0">↻</span>
                      </button>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-bold text-gray-400 w-10 shrink-0">
                        {rotar ? `#${i + 1}` : `Set ${i + 1}`}
                      </span>
                      {[{ c: '#96C800', g: 'ga' }, { c: '#3B6FD4', g: 'gb' }].map(({ c, g }) => (
                        // min-w-0 + w-full: un <input> no se encoge bajo su ancho propio
                        <input
                          key={g}
                          id={`g-${i}-${g}`}
                          inputMode="numeric" value={j[g]} placeholder="0"
                          onChange={e => setGames(i, g, e.target.value)}
                          // Al entrar al cuadro se selecciona lo que haya: escribir encima
                          // corrige de un toque, sin tener que borrar antes.
                          onFocus={e => e.target.select()}
                          className="text-center font-black tabular-nums flex-1 w-full min-w-0 rounded-xl px-2 py-3 text-lg outline-none border-2"
                          style={{ borderColor: c, background: `${c}10`, color: c }}
                        />
                      ))}
                      {juegos.length > 1 && (
                        <button onClick={() => quitarJuego(i)} className="text-gray-200 text-[20px] font-bold w-6 shrink-0">×</button>
                      )}
                    </div>
                  </div>
                ))}

                <button
                  onClick={agregarJuego}
                  className="w-full border-2 border-dashed border-gray-200 text-gray-500 font-bold py-3.5 rounded-xl text-[15px] active:scale-95 transition-transform mt-1"
                >
                  + Otro set
                </button>

                {/* El checkbox: apagado por default, que es el caso normal */}
                <label className="flex items-center gap-2.5 mt-3 py-1 cursor-pointer">
                  <input
                    type="checkbox" checked={rotar}
                    onChange={e => { setConfirmar(false); setRotar(e.target.checked); }}
                    className="w-5 h-5 accent-sp-green shrink-0"
                  />
                  <span className="text-[14px] text-sp-gray font-semibold">
                    Rotamos parejas
                    <span className="text-gray-400 font-normal"> · cada set con distinto compañero</span>
                  </span>
                </label>
              </>
            )}

            {combinaciones && (
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
                      Se guardan {juegosLlenos.length} set(s) y ya no se puede cambiar aquí.
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
