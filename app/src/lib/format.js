// Helpers de formato compartidos
import { locale, t } from '../i18n';

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
