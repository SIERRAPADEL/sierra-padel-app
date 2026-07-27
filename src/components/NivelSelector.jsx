import { useEffect, useState } from 'react';
import { BACKEND } from '../lib/constants';

// Fallback local por si el catálogo no carga (mismo orden que el backend)
const NIVELES_FALLBACK = [
  'Principiante',
  'Varonil 6ta', 'Varonil 5ta', 'Varonil 4ta', 'Varonil 3ra', 'Varonil Libre',
  'Femenil 6ta', 'Femenil 5ta', 'Femenil Libre',
];

// Selector de nivel de juego (mismo catálogo que torneos). Se usa en el registro,
// en "completa tu perfil" y en Mi información. Agrupa por rama para elegir en 2 taps.
export default function NivelSelector({ value, onChange, compact = false }) {
  const [niveles, setNiveles] = useState(NIVELES_FALLBACK);

  useEffect(() => {
    fetch(`${BACKEND}/api/auth/niveles-juego`)
      .then(r => r.json())
      .then(d => { if (d.ok && Array.isArray(d.data) && d.data.length) setNiveles(d.data); })
      .catch(() => {});
  }, []);

  const grupos = [
    { titulo: null, items: niveles.filter(n => n === 'Principiante') },
    { titulo: 'Varonil', items: niveles.filter(n => n.startsWith('Varonil')) },
    { titulo: 'Femenil', items: niveles.filter(n => n.startsWith('Femenil')) },
  ];

  return (
    <div className="flex flex-col gap-3">
      {grupos.map(g => g.items.length > 0 && (
        <div key={g.titulo || 'otros'}>
          {g.titulo && (
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1.5">{g.titulo}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {g.items.map(n => {
              const label = g.titulo ? n.replace(`${g.titulo} `, '') : n;
              const sel = value === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => onChange(n)}
                  className={`${compact ? 'px-3 py-2 text-sm' : 'px-4 py-2.5 text-[15px]'} rounded-xl font-bold border transition-all active:scale-95 ${
                    sel ? 'bg-sp-green text-white border-sp-green' : 'bg-white text-sp-gray border-gray-200'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <p className="text-xs text-gray-400">
        Si no estás seguro, elige donde sueles jugar — el club lo puede ajustar después.
      </p>
    </div>
  );
}
