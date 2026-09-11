// 🎨 TEMA DE TEMPORADA — la app se viste sola según el mes.
//
// German (10-sep-2026): «quiero cambiar la temática de la app por los colores patrios de
// México, ya que es el mes de la independencia, desde ahorita hasta finales del mes que
// cambiamos por temática de Halloween». Vio la vista previa y dijo «está perfecto».
//
// 🔑 CAMBIA SOLA POR FECHA, NO A MANO. En este sistema nada avanza con el tiempo si nadie lo
// programa: un tema que hubiera que cambiar a mano el 1 de octubre se quedaba tricolor hasta
// que alguien se acordara. Aquí el mes lo decide:
//   · septiembre → patria    (verde bandera, blanco y rojo)
//   · octubre    → halloween (naranja y morado)
//   · el resto   → el verde lima de siempre
// Se repite cada año sin tocar nada.
//
// Los colores viven en index.css (`html[data-temporada=…]`); aquí sólo se decide cuál toca y
// se marca en <html>. El mes es el del CLUB (Monterrey), no el del teléfono ni el de UTC: el
// 30 de septiembre a las 9pm en el club ya es 1 de octubre en UTC.

const TEMPORADAS = {
  patria:    { meses: ['09'], barra: '#006847' },
  halloween: { meses: ['10'], barra: '#EA580C' },
};
const BARRA_NORMAL = '#96C800';
const LLAVE_FORZADA = 'sp_temporada_forzada';

export function mesDelClub(fecha = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Monterrey', month: '2-digit' }).format(fecha);
  } catch {
    return String(fecha.getMonth() + 1).padStart(2, '0');
  }
}

export function temporadaDe(fecha = new Date()) {
  const mes = mesDelClub(fecha);
  for (const [nombre, t] of Object.entries(TEMPORADAS)) if (t.meses.includes(mes)) return nombre;
  return null;
}

// Para VER un tema antes de que llegue su mes: `?temporada=halloween` (o `patria`, `normal`).
// Dura lo que dure la pestaña; `?temporada=auto` lo quita. Sirve para revisar octubre desde
// septiembre sin esperar ni desplegar nada.
function temporadaForzada() {
  try {
    const q = new URLSearchParams(location.search).get('temporada');
    if (q === 'auto') sessionStorage.removeItem(LLAVE_FORZADA);
    else if (q && (q === 'normal' || TEMPORADAS[q])) sessionStorage.setItem(LLAVE_FORZADA, q);
    const f = sessionStorage.getItem(LLAVE_FORZADA);
    if (f === 'normal') return { valor: null };
    if (f && TEMPORADAS[f]) return { valor: f };
  } catch { /* sin sessionStorage: manda la fecha */ }
  return null;
}

export function aplicarTemporada(fecha = new Date()) {
  const forzada = temporadaForzada();
  const t = forzada ? forzada.valor : temporadaDe(fecha);
  const root = document.documentElement;
  const antes = root.dataset.temporada || null;
  if (t) root.dataset.temporada = t;
  else delete root.dataset.temporada;
  // La barra del navegador en Android toma este color; en iPhone no cambia.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', t ? TEMPORADAS[t].barra : BARRA_NORMAL);
  if (antes !== t) window.dispatchEvent(new CustomEvent('temporada', { detail: t }));
  return t;
}

// Se aplica al abrir y se vuelve a revisar cuando la app regresa a primer plano y cada 15
// minutos: una app que se deja abierta el 30 de septiembre en la noche amanece en Halloween
// sin que nadie la recargue.
export function vigilarTemporada() {
  aplicarTemporada();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') aplicarTemporada();
  });
  setInterval(() => aplicarTemporada(), 15 * 60 * 1000);
}
