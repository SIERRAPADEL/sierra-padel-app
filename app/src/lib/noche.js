// 📅 LA FECHA DE LA NOCHE (Botanero / Ladies Night) SE DICE EN GRANDE.
//
// German (13-oct-2026): «necesitamos que se haga énfasis en la fecha del ladies night y
// botanero · ya hay gente inscribiéndose que muy seguramente no sabe que este jueves no hay».
// La semana del 12 al 18-oct se suspendieron por el torneo y la lista abierta ya era la del
// jueves 22 / viernes 23, pero la app lo decía en letra chica bajo el título: quien entraba
// el martes se apuntaba creyendo que era para ESTE jueves.
//
// `saltaSemana`: la próxima noche está a 7 días o más. En una semana normal nunca pasa (del
// sábado al viernes siguiente son 6), así que sólo se enciende cuando de verdad se brincó una.

import { locale, t } from '../i18n';

// Hoy EN MONCLOVA, no en el reloj del teléfono ni en UTC.
export function hoyClub() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Monterrey' });
}

export function infoNoche(fechaISO, hoy = hoyClub()) {
  if (!fechaISO) return null;
  const [y, m, d] = String(fechaISO).slice(0, 10).split('-').map(Number);
  const [hy, hm, hd] = String(hoy).slice(0, 10).split('-').map(Number);
  const f = new Date(Date.UTC(y, m - 1, d, 12));
  const dias = Math.round((f - Date.UTC(hy, hm - 1, hd, 12)) / 86400000);
  // Armadas a mano en español: «Jueves 22 de octubre» / «jue 22 oct», sin la coma ni el «De»
  // que sale al capitalizar con CSS. En inglés y coreano, Intl con el idioma de la app.
  const loc = locale();
  const p = (o) => f.toLocaleDateString(loc, { timeZone: 'UTC', ...o }).replace(/\./g, '');
  let larga, corta;
  if (loc === 'es-MX') {
    const dl = p({ weekday: 'long' });
    larga = dl[0].toUpperCase() + dl.slice(1) + ' ' + d + ' de ' + p({ month: 'long' });
    corta = p({ weekday: 'short' }) + ' ' + d + ' ' + p({ month: 'short' });
  } else {
    larga = f.toLocaleDateString(loc, { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
    corta = f.toLocaleDateString(loc, { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' });
  }
  const cuando = dias === 0 ? t('HOY') : dias === 1 ? t('MAÑANA') : dias > 1 ? t('en {n} días', { n: dias }) : '';
  return { larga, corta, dias, cuando, saltaSemana: dias >= 7 };
}
