// Helpers de formato compartidos
import { locale, t } from '../i18n/index.js';

// "2026-06-29" parseado como fecha LOCAL. Con new Date('YYYY-MM-DD') JS asume UTC
// y en México (UTC-6) la fecha se mostraba un día antes del real.
export function parseLocalDate(str) {
  const [y, m, d] = String(str).slice(0, 10).split('-').map(Number);
  if (y && m && d) return new Date(y, m - 1, d);
  return new Date(str);
}

// "vie 24 jul"
export function formatFecha(str) {
  if (!str) return '';
  return parseLocalDate(str).toLocaleDateString(locale(), { weekday: 'short', day: 'numeric', month: 'short' });
}

// El último DÍA que vale un cupón o promo ("2026-11-05"). Lo calcula el backend en la jornada del
// club (`ultimo_dia`, reloj-club.js). Antes se enseñaba String(valido_hasta).slice(0,10) = la fecha
// UTC: un premio de liga o un «hasta el 5» del panel decía 6 (2-nov-2026). Si el backend aún no
// lo manda, se queda lo de antes.
export function ultimoDiaDe(p) {
  if (!p) return '';
  if (p.ultimo_dia) return String(p.ultimo_dia).slice(0, 10);
  return p.valido_hasta ? String(p.valido_hasta).slice(0, 10) : '';
}

// "18:30" desde "18:30:00"
export function formatHora(str) {
  if (!str) return '';
  return str.slice(0, 5);
}

// "Hace 5 min", "Ayer", "24 jul"
export function fmtRelativa(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = Math.floor((new Date() - d) / 1000);
  if (diff < 60) return t('Ahora mismo');
  if (diff < 3600) return t('Hace {n} min', { n: Math.floor(diff / 60) });
  if (diff < 86400) return t('Hace {n} h', { n: Math.floor(diff / 3600) });
  if (diff < 172800) return t('Ayer');
  return d.toLocaleDateString(locale(), { day: 'numeric', month: 'short' });
}
