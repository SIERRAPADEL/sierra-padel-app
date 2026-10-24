import { idioma, t } from '../i18n';

// 💲 Un extranjero lee «$» como dólar (German, 24-oct: «sí, agrégala»). Línea discreta junto al
// total, sólo en inglés y coreano; en español no se pinta nada.
export default function NotaPesos({ className = '' }) {
  if (idioma() === 'es') return null;
  return <p className={`text-[11px] text-gray-400 ${className}`}>{t('Precios en pesos mexicanos (MXN)')}</p>;
}
