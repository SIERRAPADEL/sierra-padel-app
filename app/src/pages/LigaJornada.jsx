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

/**
 * 📣 LA MARCA QUE VIAJA CON LA FOTO.
 *
 * German (18-sep-2026): *"necesitamos que nos veamos beneficiados con esa info, que traiga un
 * enlace o algo que nos identifique de mejor manera"* · *"quiero que enlace instagram y fb"*.
 *
 * Esta tarjeta acaba en el grupo de WhatsApp y en las historias de los jugadores. Hasta hoy
 * sólo decía "Sierra Padel" arriba: quien la veía sin conocernos no tenía a dónde ir. El pie
 * lleva la dirección de la app —que es donde se reserva, se ve la liga y viven los puntos— y
 * las dos redes. Va DENTRO de la imagen a propósito: la captura de pantalla se reenvía sola y
 * el texto del mensaje no la acompaña.
 *
 * 🔑 Un solo lugar: lo usan la tarjeta de pantalla y la imagen que se comparte. Si cambia una
 * cuenta, se cambia aquí y cambia en las dos.
 */
const MARCA = {
  app: 'sierra-padel-app.vercel.app',
  // Cuentas confirmadas por German el 18-sep-2026. Ojo: el usuario de Instagram lleva PUNTO
  // (`sierra.padel`), y la página de Facebook se llama «Sierra Padel Mva» y no tiene nombre
  // corto — sólo número. En la imagen va el nombre BUSCABLE, no el número: un id de 17
  // dígitos impreso en una foto no le sirve a nadie.
  instagram: '@sierra.padel',
  facebook: 'Sierra Padel Mva',
  // Y esto es lo que viaja como TEXTO junto a la imagen: ahí sí son enlaces vivos, y en
  // WhatsApp se tocan. Van SIN los parámetros de rastreo (`stkn`, `mibextid`) de los links
  // que se copian desde la app de cada quien: ésos identifican a quien compartió.
  urlApp: 'https://sierra-padel-app.vercel.app',
  urlIg: 'https://www.instagram.com/sierra.padel',
  urlFb: 'https://www.facebook.com/61554401167516',
};

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
  const [compartiendo, setCompartiendo] = useState(false);
  const [copiado, setCopiado] = useState(false);

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

          {/* 📤 El botón que pidió German: comparte la IMAGEN, no un texto. En el celular
              abre el menú del sistema y de ahí va al grupo o a la historia; en la compu no
              existe `share` con archivos, así que se descarga el PNG y se sube a mano. */}
          <button
            disabled={compartiendo}
            onClick={async () => {
              const encabezado = campeon
                ? `🏆 ${MAY(campeon.jugadores?.nombre)} se llevó la cancha ${b.cancha ?? ''} · ${liga.nombre} J${jornada.numero}`
                : `${liga.nombre} · Jornada ${jornada.numero}`;

              // 📋 EL PIE DE FOTO SE COPIA SOLO, Y VA ANTES QUE LA IMAGEN.
              //
              // Instagram TIRA el texto que manda `navigator.share`: de todo esto sólo le
              // llega la foto, y la descripción queda vacía. Y ninguna red deja que una app
              // de fuera escriba una etiqueta en la publicación de otra persona — no hay
              // manera de que la mención sea automática, en ninguna plataforma.
              //
              // 🔑 Y la etiqueta es justo lo que le sirve al club: el botón de «añadir a tu
              // historia» —con el que reposteamos— sólo aparece cuando alguien nos MENCIONA.
              // El @ impreso en la imagen identifica, pero no da ese botón.
              //
              // Así que se deja el pie ya escrito en el portapapeles: en Instagram es pegar
              // y listo, y al pegar "@sierra.padel" la app lo convierte en mención de verdad.
              // Va PRIMERO porque en iPhone el portapapeles sólo se deja escribir dentro del
              // toque: si se hace después de dibujar la imagen, Safari ya cortó el permiso.
              let copiado = false;
              const pieDeFoto = `${encabezado}\n\nJugando en ${MARCA.instagram} 🎾\n`
                + `Reserva en ${MARCA.app}\n\n#SierraPadel #Monclova #Padel`;
              try { await navigator.clipboard.writeText(pieDeFoto); copiado = true; } catch { /* sin portapapeles se comparte igual */ }
              setCopiado(copiado);

              setCompartiendo(true);
              try {
                const blob = await imagenDelBloque({
                  liga, jornada, bloque: b, orden, reglas, extremos, col, hayResultado,
                });
                if (!blob) throw new Error('no se pudo generar la imagen');
                const archivo = new File(
                  [blob], `sierra-${liga.nombre}-j${num}-bloque${b.numero_bloque}.png`.replace(/\s+/g, '-').toLowerCase(),
                  { type: 'image/png' },
                );
                // A WhatsApp (que sí respeta el texto) van los enlaces completos: ahí se tocan.
                const texto = `${encabezado}\n\n🎾 ${MARCA.urlApp}\n📸 ${MARCA.urlIg}\n👍 ${MARCA.urlFb}`;
                if (navigator.canShare?.({ files: [archivo] })) {
                  await navigator.share({ files: [archivo], text: texto });
                } else {
                  const a = document.createElement('a');
                  a.href = URL.createObjectURL(blob);
                  a.download = archivo.name;
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
                }
              } catch (e) {
                // Cancelar el menú de compartir no es un error: no se le grita al usuario.
                if (e?.name !== 'AbortError') alert('No se pudo armar la imagen. Toma captura de pantalla y compártela.');
              } finally { setCompartiendo(false); }
            }}
            className="mt-6 w-full rounded-2xl bg-white/95 text-black font-black text-[15px] py-3.5 active:scale-[.99] transition-transform disabled:opacity-60"
          >
            {compartiendo ? 'Armando la imagen…' : '📤 Compartir'}
          </button>

          {/* La instrucción sólo aparece DESPUÉS de compartir, que es cuando sirve: el
              jugador ya está con la foto en la mano y a punto de escribir el pie. */}
          {copiado && (
            <p className="mt-2.5 text-white/85 text-[12px] font-bold leading-snug px-2">
              📋 Ya te copiamos el texto. Pégalo y deja la etiqueta{' '}
              <span className="text-white font-black">{MARCA.instagram}</span> —
              así nos llega y te reposteamos en nuestras historias.
            </p>
          )}

          <PieDeMarca />

          <div className="mt-5 flex items-center justify-center gap-5">
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
              // 🔑 SE MUEVE EN BLOQUES, NO EN LUGARES (German, 16-sep): *"la regla es si ganas
              // subes al bloque inmediatamente arriba de ti, si pierdes bajas al siguiente;
              // pero por ningún motivo saltas 2 bloques después de un juego"*. La primera
              // versión enseñaba cuántas POSICIONES se movió cada quien y se leía como si
              // alguien hubiera brincado: pasar de la 8 a la 3 son cinco lugares pero UN solo
              // bloque. La escalera se juega por bloques; la flecha tiene que hablar de eso.
              const prev = antesDe(r);
              const bloquePrev = prev == null ? null : Math.ceil(prev / reglas.tam);
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
                        {bloquePrev == null || bloquePrev === bloque
                          ? `= B${bloque}`
                          : `${bloquePrev > bloque ? '↑' : '↓'} B${bloquePrev} → B${bloque}`}
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

/* ═══ LA IMAGEN QUE SE COMPARTE ═══════════════════════════════════════════════
 * Se DIBUJA en un canvas, no se captura la pantalla. Es el mismo camino que ya usa la
 * premiación de torneos (`panel/premiacion.html`), y evita meter una librería de captura:
 * sale siempre a 1080×1920 —la medida de una historia— aunque el celular sea chico, y no
 * depende de que la pantalla esté enfocada ni de que el navegador permita capturar.
 * El isotipo es del MISMO origen que la app: si viniera de fuera, el navegador ensucia el
 * canvas y `toBlob` devuelve null. Si aun así falla, la imagen sale sin logo en vez de no salir.
 */
const CW = 1080, CH = 1920;

function txt(ctx, s, x, y, { size = 40, weight = '700', color = '#fff', track = 0, max = 0 } = {}) {
  const fuente = (px) => `${weight} ${px}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  let px = size;
  ctx.font = fuente(px);
  // Un nombre largo no se recorta ni se sale: se encoge hasta que cabe.
  if (max) { while (px > 18 && ctx.measureText(String(s)).width + Math.max(0, track) * String(s).length > max) { px -= 2; ctx.font = fuente(px); } }
  ctx.fillStyle = color;
  if (!track) { ctx.textAlign = 'center'; ctx.fillText(String(s), x, y); return; }
  // El espaciado entre letras no existe en canvas: se dibuja letra por letra.
  const chars = [...String(s)];
  ctx.textAlign = 'left';
  const total = chars.reduce((w, c) => w + ctx.measureText(c).width + track, -track);
  let cx = x - total / 2;
  for (const c of chars) { ctx.fillText(c, cx, y); cx += ctx.measureText(c).width + track; }
}

async function imagenDelBloque({ liga, jornada, bloque, orden, reglas, extremos, col, hayResultado }) {
  const cv = document.createElement('canvas');
  cv.width = CW; cv.height = CH;
  const ctx = cv.getContext('2d');

  const g = ctx.createLinearGradient(0, 0, CW * .6, CH);
  g.addColorStop(0, col.a); g.addColorStop(.55, col.b); g.addColorStop(1, col.c);
  ctx.fillStyle = g; ctx.fillRect(0, 0, CW, CH);

  let y = 150;
  try {
    // El MISMO isotipo que ya usa el encabezado de la pantalla (`/icons/isotipo-mask.png`):
    // es el que con seguridad está publicado, y al ser del mismo origen no ensucia el canvas.
    const im = await new Promise((ok, no) => {
      const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = '/icons/isotipo-mask.png';
    });
    const h = 120, w = im.width * (h / im.height);
    ctx.drawImage(im, (CW - w) / 2, y, w, h);
    y += h + 56;
  } catch { y += 40; }

  txt(ctx, 'SIERRA PADEL', CW / 2, y, { size: 58, weight: '900', track: 10 });
  txt(ctx, `${liga.nombre} · Jornada ${jornada.numero}`, CW / 2, y + 66, { size: 28, weight: '800', color: col.tinte, track: 5, max: CW - 120 });
  txt(ctx, `${fmtFecha(bloque.fecha || jornada.fecha)} · Cancha ${bloque.cancha ?? '—'}${bloque.hora ? ` · ${hhmm(bloque.hora)}` : ''}`,
      CW / 2, y + 116, { size: 28, weight: '600', color: 'rgba(255,255,255,.72)' });

  // Lo de en medio (copa, campeón y el cuadro) se CENTRA entre el encabezado y el pie: con
  // 4 jugadores o con 2, la tarjeta se ve compuesta y no con un hueco abajo.
  const pie = CH - 200;
  const altoCuadro = Math.max(1, orden.length) * 132 + 34;
  const altoMedio = 240 + 50 + 50 + altoCuadro;
  y = Math.max(y + 250, y + 150 + Math.round(((pie - 60 - (y + 150)) - altoMedio) / 2));
  ctx.textAlign = 'center';
  if (hayResultado && orden[0]) {
    ctx.font = '150px system-ui'; ctx.fillStyle = '#fff'; ctx.fillText('🏆', CW / 2, y);
    txt(ctx, MAY(orden[0].jugadores?.nombre), CW / 2, y + 110, { size: 62, weight: '900', max: CW - 110 });
    txt(ctx, liga.categoria === 'Femenil' ? 'CAMPEONA' : 'CAMPEÓN', CW / 2, y + 168,
        { size: 24, weight: '800', color: 'rgba(255,255,255,.62)', track: 9 });
  } else {
    ctx.font = '140px system-ui'; ctx.fillStyle = '#fff'; ctx.fillText('🎾', CW / 2, y);
    txt(ctx, 'AÚN SIN RESULTADOS', CW / 2, y + 110, { size: 46, weight: '900' });
  }

  y += 240;
  txt(ctx, `BLOQUE ${bloque.numero_bloque} · SUBEN ${reglas.sube} · BAJAN ${reglas.baja}`,
      CW / 2, y, { size: 22, weight: '800', color: 'rgba(255,255,255,.58)', track: 5 });

  // El cuadro de resultados, con los mismos verdes y rojos de la pantalla.
  y += 50;
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  // `roundRect` no existe en Safari viejo; sin esto la imagen no sale en esos iPhone.
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(70, y, CW - 140, altoCuadro, 46);
  else ctx.rect(70, y, CW - 140, altoCuadro);
  ctx.fill();

  let ry = y + 100;
  for (let i = 0; i < orden.length; i++) {
    const j = orden[i];
    const lugar = j.posicion_final ?? i + 1;
    const d = hayResultado ? destinoDeLugar(lugar, { ...reglas, ...extremos }) : null;
    const arriba = d === 'sube' || d === 'queda';
    const tinta = !d ? '#fff' : arriba ? SUBE : BAJA;
    if (i) { ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(110, ry - 82); ctx.lineTo(CW - 110, ry - 82); ctx.stroke(); }
    ctx.textAlign = 'left';
    ctx.font = '900 42px ui-sans-serif, system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.4)';
    ctx.fillText(String(lugar), 120, ry);
    ctx.font = '800 50px ui-sans-serif, system-ui, sans-serif'; ctx.fillStyle = tinta;
    ctx.fillText(MAY(pila(j.jugadores?.nombre)), 190, ry);
    if (hayResultado) {
      ctx.textAlign = 'right';
      ctx.font = '900 34px ui-sans-serif, system-ui, sans-serif'; ctx.fillStyle = tinta;
      ctx.fillText(ETIQUETA[d], CW - 120, ry);
      ctx.font = '900 50px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(`${j.sets_ganados || 0}-${3 - (j.sets_ganados || 0)}`, CW - 320, ry);
    }
    ry += 132;
  }

  // ── El pie de marca: lo que hace que la foto trabaje para el club ──────────
  ctx.textAlign = 'center';
  ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(220, pie - 40); ctx.lineTo(CW - 220, pie - 40); ctx.stroke();
  txt(ctx, MARCA.app, CW / 2, pie + 24, { size: 36, weight: '900', color: '#fff', track: 2 });
  txt(ctx, `Instagram ${MARCA.instagram}   ·   Facebook ${MARCA.facebook}`,
      CW / 2, pie + 82, { size: 27, weight: '700', color: 'rgba(255,255,255,.78)' });
  txt(ctx, 'RESERVA, LIGAS Y PUNTOS EN LA APP', CW / 2, pie + 132,
      { size: 20, weight: '700', color: 'rgba(255,255,255,.5)', track: 4 });

  return new Promise((ok) => cv.toBlob(ok, 'image/png'));
}

/** El pie que se ve en pantalla — para que la captura de pantalla también nos traiga. */
function PieDeMarca() {
  return (
    <div className="mt-6 pt-4 border-t border-white/20">
      <p className="text-white font-black text-[13.5px] tracking-[.04em]">{MARCA.app}</p>
      {/* En pantalla sí se pueden tocar: quien está viendo la tarjeta en su celular llega a
          las redes de un toque. En la imagen van impresos, que es lo que sobrevive al reenvío. */}
      <p className="text-white/75 text-[11.5px] font-bold mt-1">
        <a href={MARCA.urlIg} target="_blank" rel="noreferrer" className="underline decoration-white/30">
          Instagram {MARCA.instagram}
        </a>
        {' · '}
        <a href={MARCA.urlFb} target="_blank" rel="noreferrer" className="underline decoration-white/30">
          Facebook {MARCA.facebook}
        </a>
      </p>
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
