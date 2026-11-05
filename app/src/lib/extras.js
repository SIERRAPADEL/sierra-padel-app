// 🧥 EXTRAS OPCIONALES AL INSCRIBIRSE (German, 5-nov-2026: el hoodie de la liga, +$250, con talla,
// con fecha límite). La regla y el candado viven en el backend (extras-opcionales.js) y en la base
// (trigger): aquí sólo lo que la pantalla necesita para pintar. Puro: sin React, se prueba en node.

const ZONA = 'America/Monterrey';

/** Los extras que todavía se pueden pedir (el backend ya filtra; esto cubre la pantalla abierta de más). */
export function extrasAbiertos(extras, ahora = Date.now()) {
  return (Array.isArray(extras) ? extras : []).filter((e) => {
    if (!e || !e.clave || !(Number(e.precio) > 0)) return false;
    if (!e.hasta) return true;
    const h = Date.parse(e.hasta);
    return Number.isFinite(h) && ahora < h;
  });
}

// `elegidos` = { clave: valor }: undefined/null/false = no lo eligió; '' = lo eligió y falta la talla;
// 'M' = su talla; true = lo eligió (no lleva talla).
const elegido = (v) => v !== undefined && v !== null && v !== false;

/** El total a pagar: inscripción + los extras elegidos. */
export function totalConExtras(precio, extras, elegidos) {
  const base = Number(precio) || 0;
  return (Array.isArray(extras) ? extras : [])
    .filter((e) => elegidos && elegido(elegidos[e.clave]))
    .reduce((t, e) => t + (Number(e.precio) || 0), base);
}

/** Lo que viaja al backend: [{ clave, talla }]. null si falta una talla (no se manda a medias). */
export function extrasParaEnviar(extras, elegidos) {
  const out = [];
  for (const e of (Array.isArray(extras) ? extras : [])) {
    const v = elegidos && elegidos[e.clave];
    if (!elegido(v)) continue;
    const pideTalla = Array.isArray(e.tallas) && e.tallas.length > 0;
    if (pideTalla && !e.tallas.includes(v)) return null;
    out.push({ clave: e.clave, talla: pideTalla ? v : null });
  }
  return out;
}

/** «miércoles 11 de noviembre, 7:00 pm» en hora del club, en el idioma de la app. */
export function textoHasta(hasta, loc = 'es-MX') {
  const d = new Date(hasta);
  if (!hasta || isNaN(d)) return '';
  let fecha = d.toLocaleDateString(loc, { timeZone: ZONA, weekday: 'long', day: 'numeric', month: 'long' });
  if (loc.startsWith('es')) fecha = fecha.replace(/^([^\s,]+),\s+/, '$1 ');   // «miércoles, 11 de…» → «miércoles 11 de…»
  const hora = d.toLocaleTimeString(loc.startsWith('es') ? 'en-US' : loc,
    { timeZone: ZONA, hour: 'numeric', minute: '2-digit', hour12: !loc.startsWith('ko') })
    .replace(/\s+/g, ' ');
  return `${fecha}, ${loc.startsWith('es') ? hora.toLowerCase() : hora}`;
}
