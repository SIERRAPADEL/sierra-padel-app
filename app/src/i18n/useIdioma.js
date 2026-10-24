import { useEffect, useState } from 'react';
import { idioma, alCambiarIdioma } from './index';

// Re-pinta el componente cuando cambia el idioma. App.jsx lo usa en la raíz para volver a
// montar todo con el idioma nuevo: así ninguna pantalla se queda a medias.
export function useIdioma() {
  const [l, setL] = useState(idioma());
  useEffect(() => alCambiarIdioma(setL), []);
  return l;
}
