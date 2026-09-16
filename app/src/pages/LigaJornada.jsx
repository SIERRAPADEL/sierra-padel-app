import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';

/**
 * LO QUE PASÓ EN UNA JORNADA DE LIGA — y sobre todo, la tarjeta para presumirlo.
 *
 * German (16-sep-2026): *"¿se puede generar la imagen del ganador de la cancha al momento de
 * capturar los resultados?, así como se hace en el viernes botanero o las retas"* · *"en el
 * caso del juego tipo liga asigna lugares 1, 2, 3 y 4"* · *"¿dónde vive? Quiero que se pueda
 * revisitar"* · *"me gustaría en verde los que suben o se quedan y en rojo los que bajan, de
 * acuerdo a las reglas de la jornada"* · *"también me agradó la idea de la siguiente hoja,
 * cómo va quedando el ranking"*.
 *
 * Tres pantallas, cada una con SU DIRECCIÓN — se abren hoy, mañana o en tres meses:
 *   /liga/:id/j/:num            → los bloques de la jornada, con su campeón
 *   /liga/:id/j/:num/b/:blq     → 🏆 la tarjeta del bloque, formato historia
 *   /liga/:id/j/:num/escalera   → 📊 cómo quedó la escalera completa
 *
 * 🔑 NO HIZO FALTA TOCAR EL BACKEND. `GET /escalera/:id/jornadas` ya devuelve, y además
 * público: el resultado de cada jugador (`posicion_final`, sets y juegos) y la FOTO del
 * ranking de antes de cerrar (`ranking_snapshot`). Con la foto y el ranking de hoy sale
 * cuántos lugares se movió cada quien, sin guardar nada nuevo.
 *
 * 🔑 EL COLOR SALE DE LA REGLA DE ESTA JORNADA, no de una lista fija — y la jornada MANDA
 * sobre la liga: la Liga Mujeres está en `suben 2 · bajan 2` pero su jornada 2 corrió con
 * override de `1 y 1`, y eso es lo que hay que pintar. Con 2 y 2, en un bloque de 4 nadie
 * se queda; con 1 y 1 se quedan los de en medio. Los dos extremos son aparte:
 * los de arriba del bloque 1 no tienen a dónde subir y los de abajo del último no tienen a
 * dónde bajar. Ésos SÍ se quedan, y van en verde — que es lo que pidió German.
 * Si algún día cambia el sube/baja (o el override de una jornada), esto se repinta solo.
 */

// Los mismos colores que la lista de ligas y la pantalla de la liga.
const RAMA = {
  Varonil: { a: '#0d2b0d', b: '#1a7d1a', c: '#4ab84a', tinte: '#d9f99d' },
  Femenil: { a: '#3d0a24', b: '#a12a63', c: '#e0559a', tinte: '#fce7f3' },
  _:       { a: '#0d2b0d', b: '#1a7d1a', c: '#4ab84a', tinte: '#d9f99d' },
};
// Verde y rojo que aguantan sobre el degradado, en las dos ramas.
const SUBE = '#c9f56a', SUBE_BG = 'rgba(150,200,0,.20)';
const BAJA = '#ff9c8a', BAJA_BG = 'rgba(255,92,60,.20)';

const MAY = (n) => String(n || '').toUpperCase();
const pila = (n) => String(n || '').trim().split(/\s+/)[0];
const capitaliza = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const fmtFecha = (iso) => {
  if (!iso) return '';
  const d = new Date(String(iso).slice(0, 10) + 'T12:00');
  return capitaliza(d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }));
};
const hhmm = (h) => (h ? String(h).slice(0, 5) : '');

/**
 * Qué le pasa a cada lugar de un bloque según la regla de ESTA jornada.
 * Devuelve 'sube' | 'baja' | 'queda'. El color lo decide quien llama: verde para sube y
 * queda, rojo para baja.
 */
function destinoDeLugar(lugar, { sube, baja, tam, esPrimero, esUltimo }) {
  if (lugar <= sube) return esPrimero ? 'queda' : 'sube';
  if (lugar > tam - baja) return esUltimo ? 'queda' : 'baja';
  return 'queda';
}
const ETIQUETA = { sube: '↑ SUBE', baja: '↓ BAJA', queda: '= QUEDA' };

/** El orden de un bloque: por lugar final; si aún no hay, por el orden con el que salió. */
function ordenDelBloque(b) {
  return [...(b.jugadores_bloque || [])].sort(
    (x, y) => (x.posicion_final ?? x.posicion_en_bloque ?? 99) - (y.posicion_final ?? y.posicion_en_bloque ?? 99),
  );
}
const jugado = (b) => (b.jugadores_bloque || []).some((j) => j.posicion_final != null);

export default function LigaJornada({ vista }) {
  const { id, num, blq } = useParams();
  const navigate = useNavigate();
  const { apiFetch } = useApi();

  const [liga, setLiga] = useState(null);
  const [jornadas, setJornadas] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    const [l, js, rk] = await Promise.all([
      apiFetch(`/escalera/${id}`),
      apiFetch(`/escalera/${id}/jornadas`),
      apiFetch(`/escalera/${id}/ranking`),
    ]);
    // Estas tres rutas contestan el objeto pelón, no envuelto en {ok, data}.
    setLiga(l?.data || l || null);
    setJornadas(Array.isArray(js) ? js : (js?.data || []));
    setRanking(Array.isArray(rk) ? rk : (rk?.data || []));
    setCargando(false);
  }, [apiFetch, id]);

  useEffect(() => { cargar(); }, [cargar]);

  const jornada = useMemo(
    () => jornadas.find((j) => String(j.numero) === String(num)) || null,
    [jornadas, num],
  );
  const bloques = useMemo(
    () => [...(jornada?.bloques_jornada || [])].sort((a, b) => a.numero_bloque - b.numero_bloque),
    [jornada],
  );
  const reglas = useMemo(() => ({
    sube: jornada?.sube_n_override ?? liga?.sube_n ?? 1,
    baja: jornada?.baja_n_override ?? liga?.baja_n ?? 1,
    tam: liga?.tam_bloque ?? 4,
    total: bloques.length,
  }), [jornada, liga, bloques.length]);

  const col = RAMA[liga?.categoria] || RAMA._;
  const fondo = `linear-gradient(160deg,${col.a} 0%,${col.b} 55%,${col.c} 100%)`;

  if (cargando) {
    return <div className="min-h-screen grid place-items-center text-gray-400 text-[14px]">Cargando…</div>;
  }
  if (!jornada) {
    return (
      <div className="min-h-screen grid place-items-center px-6 text-center">
        <div>
          <p className="text-sp-gray font-bold">No encontramos esa jornada.</p>
          <button onClick={() => navigate(`/liga/${id}`)}
                  className="mt-4 text-sp-green-dark font-bold text-[14px]">← Volver a la liga</button>
        </div>
      </div>
    );
  }

  // ── 🏆 LA TARJETA DEL BLOQUE ────────────────────────────────────────────────
  // Pantalla completa, formato historia: el screenshot ya sale en proporción para WhatsApp
  // e Instagram, sin recortar. `100svh` y no `100vh` — en el celular vh cuenta la barra del
  // navegador y la tarjeta se desborda justo por lo que mide esa barra.
  if (blq) {
    const b = bloques.find((x) => String(x.numero_bloque) === String(blq));
    if (!b) return <NoHay onVolver={() => navigate(`/liga/${id}/j/${num}`)} />;
    const orden = ordenDelBloque(b);
    const hayResultado = jugado(b);
    const campeon = hayResultado ? orden[0] : null;
    const extremos = { esPrimero: b.numero_bloque === 1, esUltimo: b.numero_bloque === reglas.total };

    return (
      <div className="w-full flex flex-col justify-center" style={{ minHeight: '100svh', background: fondo }}>
        <div className="px-6 py-8 text-center">
          <Encabezado liga={liga} jornada={jornada} tinte={col.tinte}
                      linea={`${fmtFecha(b.fecha || jornada.fecha)} · Cancha ${b.cancha ?? '—'}${b.hora ? ` · ${hhmm(b.hora)}` : ''}`} />

          {campeon ? (
            <>
              <p className="text-[64px] leading-none mt-7">🏆</p>
              <p className="text-white font-black text-[34px] leading-[1.15] mt-3 px-1">
                {MAY(campeon.jugadores?.nombre)}
              </p>
              <p className="text-white/60 text-[13px] font-bold mt-1.5 tracking-[.22em]">
                {liga.categoria === 'Femenil' ? 'CAMPEONA' : 'CAMPEÓN'}
              </p>
            </>
          ) : (
            <>
              <p className="text-[56px] leading-none mt-7">🎾</p>
              <p className="text-white font-black text-[24px] leading-tight mt-3">AÚN SIN RESULTADOS</p>
            </>
          )}

          <p className="text-white/55 text-[11px] font-bold mt-4 tracking-[.12em] uppercase">
            Bloque {b.numero_bloque} · Suben {reglas.sube} · Bajan {reglas.baja}
          </p>

          <div className="mt-2.5 rounded-3xl bg-black/25 px-4 py-1.5 text-left">
            {orden.map((j, i) => {
              const lugar = j.posicion_final ?? i + 1;
              const d = hayResultado ? destinoDeLugar(lugar, { ...reglas, ...extremos }) : null;
              const arriba = d === 'sube' || d === 'queda';
              const tinta = !d ? '#fff' : arriba ? SUBE : BAJA;
              const dif = (j.juegos_ganados || 0) - (j.juegos_perdidos || 0);
              return (
                <div key={j.id}
                     className="flex items-center gap-2.5 py-2.5 border-t border-white/[.07] first:border-0">
                  <span className="text-white/40 font-black tabular-nums w-5 text-[16px] shrink-0">{lugar}</span>
                  <span className="font-bold text-[18px] flex-1 min-w-0 truncate leading-tight"
                        style={{ color: tinta }}>
                    {MAY(pila(j.jugadores?.nombre))}
                  </span>
                  {hayResultado && (
                    <>
                      <span className="font-black tabular-nums text-[19px] shrink-0" style={{ color: tinta }}>
                        {j.sets_ganados || 0}<span className="text-white/40">-{3 - (j.sets_ganados || 0)}</span>
                      </span>
                      <span className="text-white/50 font-bold tabular-nums text-[13px] w-9 text-right shrink-0">
                        {dif > 0 ? '+' : ''}{dif}
                      </span>
                      <span className="shrink-0 font-black text-[10px] tracking-wide rounded-full px-2 py-[3px]"
                            style={{ color: tinta, background: arriba ? SUBE_BG : BAJA_BG }}>
                        {ETIQUETA[d]}
                      </span>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-7 flex items-center justify-center gap-5">
            <button onClick={() => navigate(`/liga/${id}/j/${num}`)}
                    className="text-white/70 text-[13px] font-bold">← Jornada {num}</button>
            <button onClick={() => navigate(`/liga/${id}/j/${num}/escalera`)}
                    className="text-white/70 text-[13px] font-bold">Ver la escalera →</button>
          </div>
        </div>
      </div>
    );
  }

  // ── 📊 LA ESCALERA COMPLETA ─────────────────────────────────────────────────
  // German pidió la lista COMPLETA, no un recorte. Cuántos lugares se movió cada quien sale
  // de comparar el ranking de hoy contra la foto que el cierre guardó (`ranking_snapshot`).
  if (vista === 'escalera') {
    // 🔑 EL RANKING PÚBLICO NO TRAE `jugador_id` — Y ES A PROPÓSITO.
    // `GET /escalera/:id/ranking` es la tabla que se enseña en la app y en la TV, así que
    // sólo manda el NOMBRE: el club no publica su directorio (ver el comentario de esa ruta
    // en escalera.js). La foto del cierre sí trae `jugador_id`, así que para cruzarlas se
    // arma el puente NOMBRE → id con los bloques de esta misma jornada, que traen los dos.
    // Un nombre repetido se descarta en vez de adivinar: mejor sin flecha que con la
    // flecha de otra persona.
    const idPorNombre = new Map();
    for (const b of bloques) {
      for (const j of (b.jugadores_bloque || [])) {
        const n = j.jugadores?.nombre;
        if (!n) continue;
        idPorNombre.set(n, idPorNombre.has(n) ? null : j.jugador_id);
      }
    }
    const posAntes = {};
    for (const f of (Array.isArray(jornada.ranking_snapshot) ? jornada.ranking_snapshot : [])) {
      if (f && f.jugador_id != null) posAntes[f.jugador_id] = f.posicion_actual;
    }
    const antesDe = (r) => {
      const id = idPorNombre.get(r.jugadores?.nombre || r.nombre);
      return id ? posAntes[id] : undefined;
    };
    return (
      <div className="w-full flex flex-col" style={{ minHeight: '100svh', background: fondo }}>
        <div className="px-5 py-8 text-center">
          <Encabezado liga={liga} jornada={jornada} tinte={col.tinte}
                      linea={`Así quedó la escalera · ${ranking.length} jugador${ranking.length === 1 ? '' : 'es'}`} />

          <div className="mt-6 rounded-3xl bg-black/25 px-4 py-1.5 text-left">
            {ranking.map((r, i) => {
              const pos = r.posicion_actual ?? i + 1;
              const bloque = r.bloque_actual ?? Math.ceil(pos / reglas.tam);
              const prev = antesDe(r);
              const movio = prev == null ? null : prev - pos;      // + subió, − bajó
              const arriba = movio == null || movio >= 0;
              const tinta = movio == null ? '#fff' : arriba ? SUBE : BAJA;
              const abreBloque = i === 0 || bloque !== (ranking[i - 1].bloque_actual
                ?? Math.ceil((ranking[i - 1].posicion_actual ?? i) / reglas.tam));
              return (
                <div key={r.jugador_id || i}>
                  {abreBloque && (
                    <div className="flex items-center gap-2 pt-2.5 pb-1">
                      <span className="text-white/40 text-[9px] font-black tracking-[.14em] uppercase whitespace-nowrap">
                        Bloque {bloque}
                      </span>
                      <i className="flex-1 h-px bg-white/20" />
                    </div>
                  )}
                  <div className="flex items-center gap-2.5 py-[7px]">
                    <span className="text-white/40 font-black tabular-nums w-6 text-[15px] shrink-0">{pos}</span>
                    <span className="font-bold text-[15px] flex-1 min-w-0 truncate leading-tight"
                          style={{ color: tinta }}>
                      {MAY(r.jugadores?.nombre || r.nombre || 'Jugador')}
                    </span>
                    {movio != null && (
                      <span className="shrink-0 font-black text-[10px] tabular-nums rounded-full px-2 py-[3px]"
                            style={{ color: tinta, background: arriba ? SUBE_BG : BAJA_BG }}>
                        {movio > 0 ? `↑ ${movio}` : movio < 0 ? `↓ ${-movio}` : '= 0'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <button onClick={() => navigate(`/liga/${id}/j/${num}`)}
                  className="mt-7 text-white/70 text-[13px] font-bold">← Jornada {num}</button>
        </div>
      </div>
    );
  }

  // ── LA JORNADA: sus bloques, cada uno con su campeón ────────────────────────
  return (
    <div className="min-h-screen bg-sp-green-wash">
      <div className="px-5 pt-7 pb-4 text-white" style={{ background: fondo }}>
        <button onClick={() => navigate(`/liga/${id}`)} className="text-white/80 text-[13px] font-bold">
          ← {liga.nombre}
        </button>
        <h1 className="text-[26px] font-black leading-tight mt-2">Jornada {jornada.numero}</h1>
        <p className="text-[13px] font-semibold mt-1" style={{ color: col.tinte }}>
          {fmtFecha(jornada.fecha)} · {bloques.length} bloque{bloques.length === 1 ? '' : 's'}
          {jornada.estado === 'finalizada' ? ' · cerrada' : ''}
        </p>
      </div>

      <div className="px-4 py-4 flex flex-col gap-2.5">
        {bloques.map((b) => {
          const orden = ordenDelBloque(b);
          const hay = jugado(b);
          const campeon = hay ? orden[0]?.jugadores?.nombre : null;
          return (
            <button key={b.id} onClick={() => navigate(`/liga/${id}/j/${num}/b/${b.numero_bloque}`)}
                    className="card p-4 text-left w-full active:scale-[.99] transition-transform">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl grid place-items-center text-white font-black text-[14px] shrink-0"
                      style={{ background: col.b }}>
                  {b.numero_bloque}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sp-gray text-[15px] truncate">
                    {campeon ? `🏆 ${campeon}` : 'Sin resultados todavía'}
                  </p>
                  <p className="text-gray-400 text-[12.5px] mt-0.5">
                    Cancha {b.cancha ?? '—'}{b.hora ? ` · ${hhmm(b.hora)}` : ''}
                    {' · '}{orden.length} jugador{orden.length === 1 ? '' : 'es'}
                  </p>
                </div>
                <span className="text-gray-300 text-[18px] shrink-0">›</span>
              </div>
            </button>
          );
        })}

        <button onClick={() => navigate(`/liga/${id}/j/${num}/escalera`)}
                className="card p-4 text-left w-full active:scale-[.99] transition-transform">
          <p className="font-black text-sp-gray text-[15px]">📊 Cómo quedó la escalera</p>
          <p className="text-gray-400 text-[12.5px] mt-0.5">
            Los {ranking.length} de la liga, con quién subió y quién bajó
          </p>
        </button>
      </div>
    </div>
  );
}

/** El encabezado que comparten las dos tarjetas: club, liga, jornada y una línea de contexto. */
function Encabezado({ liga, jornada, tinte, linea }) {
  return (
    <>
      <div className="flex items-center justify-center gap-3">
        <img src="/icons/isotipo-mask.png" alt="" width="40" height="40" style={{ opacity: 0.95 }} />
        <p className="text-white text-[21px] font-black tracking-[.16em] uppercase leading-none">
          Sierra Padel
        </p>
      </div>
      <p className="text-[11px] font-black mt-2.5 tracking-[.2em] uppercase" style={{ color: tinte }}>
        {liga.nombre} · Jornada {jornada.numero}
      </p>
      <p className="text-white/70 text-[12px] font-semibold mt-1">{linea}</p>
    </>
  );
}

function NoHay({ onVolver }) {
  return (
    <div className="min-h-screen grid place-items-center px-6 text-center">
      <div>
        <p className="text-sp-gray font-bold">No encontramos ese bloque.</p>
        <button onClick={onVolver} className="mt-4 text-sp-green-dark font-bold text-[14px]">← Volver</button>
      </div>
    </div>
  );
}
