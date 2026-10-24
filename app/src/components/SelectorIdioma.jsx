import { IDIOMAS, idioma, setIdioma } from '../i18n';
import { useIdioma } from '../i18n/useIdioma';
import { BACKEND } from '../lib/constants';

// Guarda el idioma en la ficha del cliente para que lo siga a cualquier celular.
// Best-effort: si falla, el idioma igual queda en este celular.
export function guardarIdiomaEnFicha(l) {
  try {
    const token = localStorage.getItem('sp_token');
    if (!token) return;
    fetch(`${BACKEND}/api/auth/idioma`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ idioma: l }),
    }).catch(() => {});
    const u = JSON.parse(localStorage.getItem('sp_user') || 'null');
    if (u) localStorage.setItem('sp_user', JSON.stringify({ ...u, idioma: l }));
  } catch { /* nunca rompe el cambio de idioma */ }
}

/** Tres botones ES · EN · 한국어. `compacto` para el login (fondo de color). */
export default function SelectorIdioma({ compacto = false }) {
  const actual = useIdioma();
  const elegir = (l) => { if (l === idioma()) return; setIdioma(l); guardarIdiomaEnFicha(l); };
  return (
    <div className={`flex gap-1.5 ${compacto ? '' : 'flex-wrap'}`} role="group" aria-label="Idioma / Language / 언어">
      {IDIOMAS.map(({ clave, nombre }) => (
        <button
          key={clave}
          type="button"
          onClick={() => elegir(clave)}
          aria-pressed={actual === clave}
          className={compacto
            ? `px-2.5 py-1 rounded-full text-xs font-semibold ${actual === clave ? 'bg-white text-sp-green' : 'bg-white/15 text-white'}`
            : `px-3.5 py-1.5 rounded-full text-sm font-semibold border ${actual === clave ? 'bg-sp-green text-white border-sp-green' : 'bg-white text-gray-600 border-gray-200'}`}
        >
          {compacto ? clave.toUpperCase() : nombre}
        </button>
      ))}
    </div>
  );
}
