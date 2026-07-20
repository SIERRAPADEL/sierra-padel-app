// Helpers de formato compartidos

// "vie 24 jul"
export function formatFecha(str) {
  if (!str) return '';
  const d = new Date(str);
  return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
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
  if (diff < 60) return 'Ahora mismo';
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
  if (diff < 172800) return 'Ayer';
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}
