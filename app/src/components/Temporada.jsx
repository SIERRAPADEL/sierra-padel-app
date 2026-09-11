import { useEffect, useState } from 'react';

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

const SALUDO = {
  patria: '🇲🇽 ¡Viva México!',
  // German (10-sep): «Spooky szn», en lugar de «¡Feliz Halloween!».
  halloween: '🎃 Spooky szn',
};

export function TemporadaSaludo() {
  const t = useTemporada();
  if (!SALUDO[t]) return null;
  return <span className={`temporada-saludo temporada-saludo--${t}`}>{SALUDO[t]}</span>;
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
