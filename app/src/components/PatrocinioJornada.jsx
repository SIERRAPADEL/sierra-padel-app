import { useId } from 'react';

/**
 * 🥩 LA JORNADA PATROCINADA — piezas del diseño de la diseñadora (German, 26-sep-2026: «te
 * comparto las fotos de cómo me gustaría se vieran las pantallas de la app»; primer caso:
 * Carnes Luis, Jornada 3 de la Liga Miércoles).
 *
 * Todo lo de aquí se usa SÓLO cuando la jornada trae patrocinador (`liga_media`): las demás
 * ligas y jornadas se siguen viendo como siempre. Los colores salen de `colores` del
 * patrocinador y la leyenda de `leyenda`, así el siguiente patrocinio no toca código.
 */
export const KANIT = "'Kanit', 'Inter', system-ui, sans-serif";
export const CREMA = '#f3eedb';

/** El degradado vertical del diseño: oscuro arriba, más encendido abajo. */
export function fondoPatro(col) {
  return `linear-gradient(180deg, ${col.a} 0%, ${col.b} 48%, ${col.c} 100%)`;
}

/**
 * Texto en ARCO (el «PATROCINADOR JORNADA 3» y el «GANADOR DEL BLOQUE» del diseño).
 * SVG con textPath: escala con el ancho de la pantalla sin perder la curva.
 */
export function Arco({ texto, color = CREMA, size = 17, ancho = 300, curva = 16, className = '' }) {
  const id = `arco-${useId().replace(/:/g, '')}`;
  const alto = curva + size + 10;
  const base = alto - 4;
  return (
    <svg viewBox={`0 0 ${ancho} ${alto}`} className={`block mx-auto w-full ${className}`}
         style={{ maxWidth: ancho }} aria-label={texto} role="img">
      <path id={id} d={`M 6 ${base} Q ${ancho / 2} ${base - 2 * curva} ${ancho - 6} ${base}`} fill="none" />
      <text fill={color} fontFamily={KANIT} fontWeight="800" fontSize={size} letterSpacing=".5">
        <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">{texto}</textPath>
      </text>
    </svg>
  );
}

/** Leyenda en arco + logo grande y centrado. Sin mascota: así lo dibujó la diseñadora. */
export function PatrocinioArco({ m, jornada, ancho = '64%', className = '' }) {
  if (!m) return null;
  const leyenda = m.leyenda || `PATROCINADOR JORNADA ${jornada ?? ''}`.trim();
  return (
    <div className={`text-center ${className}`}>
      <div className="mx-auto" style={{ width: '84%' }}>
        <Arco texto={leyenda} />
      </div>
      {m.sponsor_url
        ? <img src={m.sponsor_url} alt={m.sponsor_nombre || 'Patrocinador'} loading="lazy"
               onError={(e) => { e.currentTarget.style.display = 'none'; }}
               className="block mx-auto -mt-1 object-contain" style={{ width: ancho, maxWidth: 360 }} />
        : <p className="text-white font-black text-[22px]" style={{ fontFamily: KANIT }}>{m.sponsor_nombre}</p>}
    </div>
  );
}

/** La escalera en línea blanca (tarjeta de la liga). */
export function IconoEscalera({ className = '' }) {
  return (
    <svg viewBox="0 0 48 52" className={className} fill="none" stroke="currentColor" strokeWidth="2.6"
         strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
      <path d="M8 50 L17 2 H23 L14 50 Z" />
      <path d="M26 50 L35 2 H41 L32 50" />
      <path d="M23 2 L41 2" />
      {[10, 18, 26, 34, 42].map((y) => (
        <path key={y} d={`M${16.5 - (y - 2) * 0.19} ${y} H${37 - (y - 2) * 0.19}`} />
      ))}
    </svg>
  );
}

/** La pala con la pelota (tarjeta del bloque sin resultados). */
export function IconoPala({ className = '' }) {
  const hoyos = [[40, 28], [52, 26], [34, 38], [46, 37], [58, 35], [32, 48], [44, 47], [56, 45], [38, 57], [50, 56]];
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="3.2"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {/* cara de la pala, inclinada */}
      <path d="M31 72 C18 60 18 34 34 20 C48 8 66 12 72 26 C78 42 68 62 50 70 C44 73 38 74 31 72 Z" />
      {hoyos.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" fill="currentColor" stroke="none" />)}
      {/* cuello y mango */}
      <path d="M31 72 L22 83" />
      <path d="M26 77 L12 91 L17 96 L31 82" />
      <path d="M15.5 93.5 L19 90 M18.5 90.5 L22 87 M21.5 87.5 L25 84" />
      {/* la pelota, montada sobre la orilla */}
      <circle cx="72" cy="18" r="11" />
      <path d="M64 11 C70 15 70 22 64 26" />
    </svg>
  );
}
