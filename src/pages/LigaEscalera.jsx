import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';

/**
 * Una LIGA ESCALERA vista por el jugador: de qué se trata, quién va, y el botón
 * para apuntarse.
 *
 * El formato en corto (German, 21-ago): te acomodan por nivel en bloques de 4; cada
 * jornada juegas 3 sets, uno con cada quien del bloque; los puntos deciden quién sube,
 * quién se queda y quién baja. Eso es lo que hay que explicar en dos líneas, porque es
 * justo lo que hace que la gente quiera seguir viniendo.
 *
 * Lo que NO se promete aquí: pagar desde la app. Apuntarse aparta el lugar y deja
 * anotado el adeudo; se cobra cuando la persona llega al club. Inscribirse no es estar
 * en el club ni haber pagado (German, 21-ago), así que no se abre ninguna cuenta en la
 * caja: eso trabaría el cierre del corte por alguien que ni está ahí.
 */
// Los mismos colores que la lista de ligas (Ligas.jsx). Verde institucional para la varonil,
// rosa para la femenil — la rama decide quién puede inscribirse, así que se ve antes de leer.
const RAMA = {
  Varonil: { fondo: '#1a7d1a', sub: 'rgba(217,249,157,.95)' },
  Femenil: { fondo: '#be185d', sub: 'rgba(252,231,243,.95)' },
  _:       { fondo: '#1a7d1a', sub: 'rgba(217,249,157,.95)' },
};

export default function LigaEscalera() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { apiFetch } = useApi();

  const [liga, setLiga] = useState(null);
  const [mi, setMi] = useState(null);
  const [tabla, setTabla] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [apuntando, setApuntando] = useState(false);
  const [aviso, setAviso] = useState(null);
  // La liga es de rama y no sabemos si juega varonil o femenil. Se pregunta UNA vez.
  const [preguntaRama, setPreguntaRama] = useState(false);

  const cargar = useCallback(async () => {
    const [abiertas, mia, rank] = await Promise.all([
      apiFetch('/escalera/abiertas'),
      apiFetch(`/escalera/${id}/mi-inscripcion`),
      apiFetch(`/escalera/${id}/ranking`),
    ]);
    if (abiertas?.ok) setLiga((abiertas.data || []).find((l) => l.id === id) || null);
    if (mia?.ok) setMi(mia.data);
    // El ranking del motor viene como arreglo pelón, no envuelto en {ok, data}.
    setTabla(Array.isArray(rank) ? rank : (rank?.data || []));
    setCargando(false);
  }, [apiFetch, id]);

  useEffect(() => { cargar(); }, [cargar]);

  // 🔴 `sexo` SE FILTRA A LA FUERZA. Este mismo botón estaba cableado como `onClick={apuntarme}`,
  // así que React le pasaba su evento como primer argumento: `sexo` llegaba siendo el evento,
  // `JSON.stringify` reventaba por referencia circular, el throw se comía el `setApuntando(false)`
  // y el botón se quedaba en «Apuntándote…» para siempre, SIN RESPUESTA. German lo vio en vivo
  // (22-ago): "se quedo trabado; nunca dio respuesta".
  //
  // 🔑 Se arregló el cableado, pero la lista blanca es la que cierra el hueco de verdad: llamen
  // a esta función como la llamen, aquí adentro sólo entra 'H' o 'M'. Un handler que acepta un
  // argumento es una trampa en React, y el cableado se puede volver a romper mañana.
  async function apuntarme(sexoCrudo) {
    const sexo = (sexoCrudo === 'H' || sexoCrudo === 'M') ? sexoCrudo : null;
    setApuntando(true);
    setAviso(null);
    // `sexo` sólo viaja cuando la liga es de rama y el sistema no lo tenía: es la persona
    // declarándolo. La versión anterior lo ADIVINABA por la liga que abriera — un hombre sin
    // dato entraba a la femenil y encima quedaba anotado como mujer. German lo cachó probando
    // (22-ago). Son 38 de los 130 clientes con app los que no tienen el dato; a los demás la
    // pregunta nunca les sale.
    // 🔑 try/finally: el boton VUELVE a habilitarse pase lo que pase. Sin esto, cualquier
    // tropiezo aqui adentro deja «Apuntandote…» congelado y la persona sin saber si quedo
    // inscrita — que es justo como se sintio el bug del evento. El apagador va en el finally,
    // no despues del await, porque despues del await no se llega si algo truena.
    try {
      const r = await apiFetch(`/escalera/${id}/inscribirme`, {
        method: 'POST',
        ...(sexo ? { body: JSON.stringify({ sexo }) } : {}),
      });
      if (r?.codigo === 'FALTA_SEXO') { setPreguntaRama(true); return; }
      setPreguntaRama(false);
      if (!r?.ok) { setAviso({ malo: true, txt: r?.error || 'No se pudo. Intenta de nuevo.' }); return; }
      if (r.data?.aviso_cobro) {
        setAviso({ txt: 'Ya estás dentro. Pasa a recepción para dejar registrada tu inscripción.' });
      } else {
        setAviso({ txt: r.ya_estaba ? 'Ya estabas inscrito.' : '¡Listo, ya estás dentro!' });
      }
      cargar();
    } catch (e) {
      setAviso({ malo: true, txt: 'No se pudo completar. Intenta de nuevo.' });
    } finally {
      setApuntando(false);
    }
  }

  const com = liga?.comercial;
  const precio = com?.precio_inscripcion;
  const inscritos = liga?.inscritos ?? 0;
  const bolsa = com ? Number(com.premio_efectivo || 0) + Number(com.premio_especie_valor || 0) : 0;
  const minPremios = com?.premios_min_participantes;

  const fechaBonita = com?.fecha_inicio
    ? new Date(com.fecha_inicio + 'T12:00:00').toLocaleDateString('es-MX',
        { weekday: 'long', day: 'numeric', month: 'long' })
    : null;

  if (cargando) {
    return <div className="page safe-bottom">
      <div className="card py-10 text-center text-gray-400 text-sm">Cargando…</div>
    </div>;
  }

  if (!liga) {
    return <div className="page safe-bottom p-4">
      <div className="card p-6 text-center">
        <p className="font-bold text-sp-gray">Esta liga ya no está abierta</p>
        <p className="text-gray-500 text-[13px] mt-1">Puede que las inscripciones hayan cerrado.</p>
        <button onClick={() => navigate('/ligas')} className="mt-4 text-sp-green-dark font-bold text-[14px]">
          Ver las demás ligas →
        </button>
      </div>
    </div>;
  }

  // El mismo color con el que se vio en la lista: si la tarjeta era rosa, la liga abre rosa.
  // Cambiar de color al entrar haría dudar de si se abrió la liga correcta.
  const rama = RAMA[liga.categoria] || RAMA._;

  return (
    <div className="page safe-bottom">
      <div className="px-5 pt-[env(safe-area-inset-top)] pb-4" style={{ background: rama.fondo }}>
        <button onClick={() => navigate('/ligas')} className="text-white/80 text-[13px] pt-3">← Ligas</button>
        <p className="text-white font-black text-xl mt-1">{liga.nombre}</p>
        <p className="text-[12px] font-bold mt-0.5" style={{ color: rama.sub }}>
          {liga.categoria === 'Femenil' ? 'Sólo para mujeres'
            : liga.categoria === 'Varonil' ? 'Sólo para hombres' : 'Abierta a todos'}
        </p>
        {fechaBonita && (
          <p className="text-white/85 text-[13px] mt-0.5 capitalize">
            Arranca el {fechaBonita} · {liga.n_jornadas} jornadas
          </p>
        )}
      </div>

      <div className="px-4 py-4 flex flex-col gap-3 overflow-y-auto">

        {aviso && (
          <div className={`card p-3 text-[14px] font-bold ${aviso.malo ? 'text-red-600' : 'text-green-700'}`}>
            {aviso.txt}
          </div>
        )}

        {/* Mi situación — lo primero que quiere ver quien ya entró */}
        {mi?.inscrito && (
          <div className="card p-4" style={{ background: '#F2F8E9' }}>
            <p className="text-[12px] font-bold uppercase tracking-wide text-sp-green-dark">Ya estás dentro</p>
            <div className="flex items-baseline gap-3 mt-1">
              <p className="text-3xl font-black text-sp-green-dark">#{mi.posicion}</p>
              <p className="text-[14px] text-sp-gray font-bold">Bloque {mi.bloque}</p>
            </div>
            {mi.jornadas_jugadas > 0 && (
              <p className="text-gray-500 text-[13px] mt-1">
                {mi.jornadas_jugadas} {mi.jornadas_jugadas === 1 ? 'jornada jugada' : 'jornadas jugadas'} ·
                {' '}{mi.sets_ganados} sets ganados
              </p>
            )}
            {mi.adeudo && (
              <p className={`text-[13px] mt-2 font-bold ${mi.adeudo.pagado ? 'text-green-700' : 'text-amber-700'}`}>
                {mi.adeudo.pagado
                  ? '✓ Inscripción pagada'
                  : `Falta pagar $${Number(mi.adeudo.saldo).toLocaleString('es-MX')} — te la cobran en el club`}
              </p>
            )}
          </div>
        )}

        {/* Cómo funciona — es el gancho, va antes que el precio */}
        <div className="card p-4">
          <p className="font-black text-sp-gray text-[15px]">Cómo funciona</p>
          <ol className="mt-2 flex flex-col gap-2">
            {[
              ['Te acomodan por nivel', `En bloques de ${liga.tam_bloque}. Empiezas donde va tu juego.`],
              ['Juegas 3 sets cada jornada', 'Uno con cada quien de tu bloque: te toca de compañero con todos.'],
              [`Subes o bajas hasta ${liga.sube_n}`, 'Los puntos deciden. Ganas, subes de bloque; te toca contra mejores.'],
            ].map(([t, d], i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-sp-green text-white text-[12px] font-black grid place-items-center">
                  {i + 1}
                </span>
                <span className="flex-1">
                  <span className="block text-sp-gray font-bold text-[14px]">{t}</span>
                  <span className="block text-gray-500 text-[13px] leading-snug">{d}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        {/* Premios */}
        {bolsa > 0 && (
          <div className="card p-4">
            <p className="text-[12px] font-bold uppercase tracking-wide text-gray-400">En premios</p>
            <p className="text-3xl font-black text-amber-600 mt-0.5">
              ${bolsa.toLocaleString('es-MX')}
            </p>
            {(com.premios_detalle || []).map((p, i) => (
              <p key={i} className="text-gray-600 text-[13px] mt-1">
                <b>{p.cantidad > 1 ? `${p.cantidad} × ` : ''}{p.concepto}</b>
                {p.nota ? ` — ${p.nota}` : ''}
              </p>
            ))}
            {minPremios > 0 && (
              <p className="text-gray-400 text-[12px] mt-2 leading-snug">
                Aplica a partir de {minPremios} participantes. Si somos menos se ajusta a
                proporción; si somos más, sube.
              </p>
            )}
          </div>
        )}

        {/* Quiénes van */}
        <div className="card p-4">
          <div className="flex items-baseline justify-between">
            <p className="font-black text-sp-gray text-[15px]">Quiénes van</p>
            <p className="text-gray-400 text-[13px]">{inscritos} inscritos</p>
          </div>
          {tabla.length === 0 ? (
            <p className="text-gray-400 text-[13px] mt-2">
              Todavía nadie. {mi?.inscrito ? '' : 'Puedes ser el primero.'}
            </p>
          ) : (
            <div className="mt-2 flex flex-col">
              {tabla.slice(0, 12).map((j, i) => (
                <div key={j.jugador_id || i}
                     className="flex items-center gap-3 py-1.5 border-b border-gray-100 last:border-0">
                  <span className="w-6 text-gray-400 text-[13px] font-mono tabular-nums">
                    {j.posicion_actual ?? i + 1}
                  </span>
                  <span className="flex-1 text-sp-gray text-[14px] truncate">
                    {j.jugadores?.nombre || j.nombre || 'Jugador'}
                  </span>
                  <span className="text-gray-400 text-[12px]">
                    Bloque {j.bloque_actual ?? Math.ceil((i + 1) / liga.tam_bloque)}
                  </span>
                </div>
              ))}
              {tabla.length > 12 && (
                <p className="text-gray-400 text-[12px] mt-2">y {tabla.length - 12} más</p>
              )}
            </div>
          )}
        </div>

        {/* El botón */}
        {!mi?.inscrito && (
          <div className="card p-4">
            {precio > 0 && (
              <>
                <p className="text-[12px] font-bold uppercase tracking-wide text-gray-400">Inscripción</p>
                <p className="text-3xl font-black text-sp-gray">
                  ${Number(precio).toLocaleString('es-MX')}
                </p>
                {com?.precio_inscripcion_tarde > Number(precio) && (
                  <p className="text-amber-700 text-[13px] font-bold mt-0.5">
                    Sube a ${Number(com.precio_inscripcion_tarde).toLocaleString('es-MX')} después
                    de la primera jornada
                  </p>
                )}
              </>
            )}
            <button
              onClick={() => apuntarme()}
              disabled={apuntando}
              className="mt-3 w-full text-white font-black py-3.5 rounded-xl
                         active:scale-[0.98] transition-transform disabled:opacity-60"
              style={{ background: rama.fondo }}
            >
              {apuntando ? 'Apuntándote…' : 'Apuntarme a la liga'}
            </button>

            {preguntaRama && (
              <div className="mt-3 rounded-xl border-2 p-4" style={{ borderColor: rama.fondo }}>
                <p className="font-black text-[15px] text-sp-gray">¿En qué rama juegas?</p>
                <p className="text-gray-500 text-[13px] mt-0.5 leading-snug">
                  Te lo preguntamos una sola vez. Esta liga es{' '}
                  {liga.categoria === 'Femenil' ? 'sólo para mujeres' : 'sólo para hombres'}.
                </p>
                <div className="flex gap-2 mt-3">
                  <button type="button" disabled={apuntando} onClick={() => apuntarme('H')}
                          className="flex-1 py-3 rounded-xl font-black text-white
                                     active:scale-[0.98] transition-transform disabled:opacity-60"
                          style={{ background: '#1a7d1a' }}>
                    Varonil
                  </button>
                  <button type="button" disabled={apuntando} onClick={() => apuntarme('M')}
                          className="flex-1 py-3 rounded-xl font-black text-white
                                     active:scale-[0.98] transition-transform disabled:opacity-60"
                          style={{ background: '#be185d' }}>
                    Femenil
                  </button>
                </div>
              </div>
            )}
            <p className="text-gray-400 text-[12px] text-center mt-2 leading-snug">
              Se aparta tu lugar al momento.{precio > 0
                ? ' No se cobra nada ahora: te la cobran cuando llegues al club.' : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
