import { useEffect, useState } from 'react';
import { t } from '../i18n';

// Los adornos de temporada del Inicio: el saludo junto a los puntos y la franja debajo del
// encabezado. Los COLORES de toda la app no pasan por aquí: los pone index.css según
// `<html data-temporada>` (ver lib/temporada.js). Esto sólo pinta lo que no es un color.

export function useTemporada() {
  const [t, setT] = useState(() => document.documentElement.dataset.temporada || null);
  useEffect(() => {
    const cambio = (e) => setT(e.detail || null);
    window.addEventListener('temporada', cambio);
    return () => window.removeEventListener('temporada', cambio);
  }, []);
  return t;
}

// Función y no objeto: t() se llama al pintar, no al importar.
const saludo = (k) => ({
  patria: '🇲🇽 ' + t('¡Viva México!'),
  // German (10-sep): «Spooky szn», con la calabaza y un fantasma, en lugar de «¡Feliz Halloween!».
  // Ya es inglés: igual en los tres idiomas.
  halloween: '🎃 Spooky szn 👻',
  // Día de Muertos (1 al 3 de nov). German (26-oct): «agregar algún emoji, una calaverita o algo afín».
  muertos: '💀 ' + t('Día de Muertos') + ' 🌼',
})[k];

export function TemporadaSaludo() {
  const temp = useTemporada();
  const s = saludo(temp);
  if (!s) return null;
  return <span className={`temporada-saludo temporada-saludo--${temp}`}>{s}</span>;
}

export function TemporadaFranja() {
  const t = useTemporada();
  if (t === 'patria') return <div className="temporada-franja temporada-franja--patria" aria-hidden="true" />;
  if (t === 'halloween') {
    return (
      <div className="temporada-franja temporada-franja--halloween" aria-hidden="true">
        🎃🦇🕸️🎃🦇🕸️🎃🦇🕸️🎃🦇🕸️
      </div>
    );
  }
  if (t === 'muertos') return <PapelPicado />;
  return null;
}

// 🏵️ PAPEL PICADO: una cenefa de banderitas colgando del encabezado. Dibujo propio en SVG
// (nada de imágenes ni clip-art): cada banderita es UN trazo con `evenodd`, así los recortes
// (rombo, círculos, triangulitos) quedan huecos de verdad y se ve el fondo a través.
// Cuatro colores que se repiten: cempasúchil, magenta, morado y el verde del club.
const BANDERA_W = 40, PASO = 46, ALTO = 34;
const COLORES_PICADO = ['#E8930C', '#B8246E', '#5E3591', '#8DC63F'];

function circulo(x, y, r) {
  return `M${x - r},${y} a${r},${r} 0 1 0 ${2 * r},0 a${r},${r} 0 1 0 ${-2 * r},0 Z`;
}

function banderita() {
  const w = BANDERA_W, top = 2, bajo = 26;
  // Contorno con el borde de abajo festoneado (5 ondas).
  let d = `M0,${top} H${w} V${bajo}`;
  const n = 5, paso = w / n;
  for (let i = 0; i < n; i++) {
    const x1 = w - paso * i, x2 = w - paso * (i + 1);
    d += ` Q${(x1 + x2) / 2},${bajo + 6} ${x2},${bajo}`;
  }
  d += ' Z';
  // Recortes
  const c = w / 2;
  for (const x of [6, 13, 27, 34]) d += ` M${x - 2},${top + 2.5} L${x + 2},${top + 2.5} L${x},${top + 5.5} Z`;
  d += ` M${c},${top + 6} L${c + 5.5},${top + 12} L${c},${top + 18} L${c - 5.5},${top + 12} Z`;
  d += ' ' + circulo(c, top + 12, 1.6);
  d += ' ' + circulo(8.5, top + 12, 2.2) + ' ' + circulo(w - 8.5, top + 12, 2.2);
  for (const x of [11, c, w - 11]) d += ' ' + circulo(x, top + 20.5, 1.3);
  return d;
}

function PapelPicado() {
  const d = banderita();
  const ancho = PASO * COLORES_PICADO.length;
  return (
    <div className="temporada-franja temporada-franja--muertos" aria-hidden="true">
      <svg width="100%" height={ALTO} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="sp-papel-picado" width={ancho} height={ALTO} patternUnits="userSpaceOnUse" x="-6">
            {COLORES_PICADO.map((color, i) => (
              <path key={color} d={d} fill={color} fillRule="evenodd" transform={`translate(${i * PASO + 3},0)`} />
            ))}
          </pattern>
        </defs>
        <rect width="100%" height={ALTO} fill="url(#sp-papel-picado)" />
        {/* El hilo del que cuelgan */}
        <line x1="0" y1="1" x2="100%" y2="1" stroke="#4A2766" strokeWidth="2" />
      </svg>
    </div>
  );
}
