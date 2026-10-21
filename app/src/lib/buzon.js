// 🔔 El buzón de avisos (campanita) — la lógica sin pantalla, para poder probarla sola.
//
// German (21-oct-2026): «El tema del push no me tiene tan contento, un mal click y se pierde».
// Cada push que manda el club se guarda en el servidor (avisos-cliente.js) y aquí se enseña.

// El número del globito: 0 → nada, 1..9 → el número, 10 o más → «9+» (no cabe más en 18 px).
export function textoContador(n) {
  const k = Number(n) || 0;
  if (k <= 0) return '';
  return k > 9 ? '9+' : String(k);
}

// A dónde lleva un aviso. 🔒 Sólo rutas INTERNAS (igual que destinoTrasEntrar): un `//algo`
// el navegador lo lee como otro sitio. Sin ruta válida el aviso sólo se marca leído.
export function destinoDelAviso(url) {
  const u = String(url || '').trim();
  if (u.startsWith('/') && !u.startsWith('//')) return u;
  return null;
}

// Marca uno como leído en la lista de la pantalla (sin esperar al servidor).
export function marcarLeidoLocal(datos, id) {
  if (!datos) return datos;
  let bajo = 0;
  const avisos = (datos.avisos || []).map(a => {
    if (a.id !== id || a.leido) return a;
    bajo = 1;
    return { ...a, leido: true, leido_at: new Date().toISOString() };
  });
  return { ...datos, avisos, no_leidos: Math.max(0, (datos.no_leidos || 0) - bajo) };
}

export function marcarTodosLocal(datos) {
  if (!datos) return datos;
  const ahora = new Date().toISOString();
  return { ...datos, no_leidos: 0, avisos: (datos.avisos || []).map(a => (a.leido ? a : { ...a, leido: true, leido_at: ahora })) };
}

// Cuando la campanita y la pantalla del buzón no están juntas, se avisan por este evento:
// al leer en el buzón, el número de la campanita baja sin volver a preguntar.
export const EVENTO_BUZON = 'sp-buzon';
export function avisarCambioBuzon(noLeidos) {
  try { window.dispatchEvent(new CustomEvent(EVENTO_BUZON, { detail: { no_leidos: noLeidos } })); } catch { /* sin window */ }
}
