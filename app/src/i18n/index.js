// 🌐 IDIOMA DE LA APP (German, 23-oct-2026: «hay algunos clientes extranjeros que lo agradecerían»).
// Español, inglés y coreano. Decidido con German:
//   · la primera vez abre en el idioma del celular (coreano → coreano, español → español,
//     cualquier otro → inglés); en Perfil → Idioma se cambia, y se guarda en su ficha
//     para que no cambie al entrar desde otro celular.
//   · lo que no tiene traducción conserva el nombre original (marcas, nombres de eventos:
//     Viernes Botanero, Ladies Night, AVG Halloween).
//
// 🔑 LA LLAVE ES EL TEXTO EN ESPAÑOL, tal cual: t('Reservar cancha'). Así el código se sigue
// leyendo en español y una traducción que falte cae al español en vez de enseñar una llave
// rara. Variables con {llave}: t('Hola {nombre}', { nombre }).
//
// ⚠️ t() se llama AL PINTAR, nunca al importar: un arreglo de textos a nivel de módulo se
// evalúa una sola vez y se quedaría en el idioma con el que abrió la app.
import enInicio from './en/inicio.js';
import enReservas from './en/reservas.js';
import enCompetencia from './en/competencia.js';
import enCuenta from './en/cuenta.js';
import koInicio from './ko/inicio.js';
import koReservas from './ko/reservas.js';
import koCompetencia from './ko/competencia.js';
import koCuenta from './ko/cuenta.js';

export const IDIOMAS = [
  { clave: 'es', nombre: 'Español' },
  { clave: 'en', nombre: 'English' },
  { clave: 'ko', nombre: '한국어' },
];

const DICC = {
  en: { ...enInicio, ...enReservas, ...enCompetencia, ...enCuenta },
  ko: { ...koInicio, ...koReservas, ...koCompetencia, ...koCuenta },
};

const LOCALES = { es: 'es-MX', en: 'en-US', ko: 'ko-KR' };
const LLAVE = 'sp_idioma';

/** El idioma del celular, reducido a los tres que hay. */
export function idiomaDelCelular() {
  const lista = (typeof navigator !== 'undefined' && (navigator.languages || [navigator.language])) || [];
  for (const l of lista) {
    const c = String(l || '').toLowerCase();
    if (c.startsWith('es')) return 'es';
    if (c.startsWith('ko')) return 'ko';
    if (c) return 'en';
  }
  return 'es';
}

function valido(l) { return l === 'es' || l === 'en' || l === 'ko'; }

let actual = (() => {
  try { const g = localStorage.getItem(LLAVE); if (valido(g)) return g; } catch { /* sin storage */ }
  return idiomaDelCelular();
})();
if (typeof document !== 'undefined') document.documentElement.lang = actual;

const oyentes = new Set();

export function idioma() { return actual; }

/** Locale para fechas y números: 'es-MX' | 'en-US' | 'ko-KR'. */
export function locale() { return LOCALES[actual] || 'es-MX'; }

/** Cambia el idioma de la app. `guardar` lo deja fijo en este celular. */
export function setIdioma(l, { guardar = true } = {}) {
  if (!valido(l) || l === actual) return;
  actual = l;
  if (guardar) { try { localStorage.setItem(LLAVE, l); } catch { /* sin storage */ } }
  if (typeof document !== 'undefined') document.documentElement.lang = l;
  oyentes.forEach(fn => { try { fn(l); } catch { /* un oyente no tumba a los demás */ } });
}

export function alCambiarIdioma(fn) { oyentes.add(fn); return () => oyentes.delete(fn); }

/** Traduce un texto de la app. La llave es el español; si falta, regresa el español. */
export function t(texto, vars) {
  let s = actual === 'es' ? texto : ((DICC[actual] && DICC[actual][texto]) || texto);
  if (vars) s = String(s).replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined && vars[k] !== null ? String(vars[k]) : m));
  return s;
}
