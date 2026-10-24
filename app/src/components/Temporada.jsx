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
  return null;
}
