// El nombre SÓLO lleva letras (German, 30-sep-2026: «hay un usuario que capturó su número de
// teléfono 2 veces, y aparece como su nombre… ese espacio sólo debería aceptar letras»).
// Misma regla que `nombreValido` del backend (auth.js): letras con acento, ñ y ü, espacios,
// apóstrofo, guion y punto; al menos 2 letras; nada de números.

// Para el onChange del campo: lo que no es letra ni se escribe. Así el teclado numérico o
// un pegado del teléfono no llegan ni a aparecer en la caja.
export function soloLetras(s) {
  return String(s || '').replace(/[^A-Za-zÀ-ÖØ-öø-ÿÑñÜü' .\-]/g, '').replace(/\s{2,}/g, ' ');
}

// Devuelve el texto del error, o '' si está bien.
export function errorNombre(s) {
  const v = String(s || '').replace(/\s+/g, ' ').trim();
  if (!v) return 'Escribe tu nombre.';
  if (/\d/.test(v)) return 'Tu nombre no puede llevar números. Escribe tu nombre y apellido.';
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿÑñÜü' .\-]+$/.test(v)) return 'Tu nombre sólo puede llevar letras.';
  if ((v.match(/[A-Za-zÀ-ÖØ-öø-ÿ]/g) || []).length < 2) return 'Escribe tu nombre completo.';
  return '';
}

export const nombreEsValido = (s) => errorNombre(s) === '';
