// Constantes compartidas de la app
import { t } from '../i18n';

export const BACKEND = import.meta.env.VITE_BACKEND_URL || 'https://sierra-padel-backend-production-a55f.up.railway.app';

// Ubicaciones dentro del club (para pedidos y promos express)
export const UBICACIONES = [
  'Cancha 1', 'Cancha 2', 'Cancha 3', 'Cancha 4',
  'Cancha 5', 'Cancha 6', 'Cancha 7', 'Bar / Mesa', 'Terraza', 'Recepcion',
];

// PARA LLEVAR (German, 19-ago): "vengo de fuera y paso por él. Quiero un café, lo pido y
// paso a recogerlo aunque no esté en el club".
// 🔑 NO es una ubicación más — es lo contrario de una entrega, y encima el cliente puede no
// estar aquí. Por eso vive aparte de UBICACIONES: mezclarlo entre las canchas lo dejaría
// escondido y un mesero saldría a buscar una cancha vacía.
// El nombre es el que YA usa el sistema: las cuentas tipo 'llevar' y la comanda imprimen
// "Para llevar". Una sola palabra en la app, en la caja y en el papel.
// Se guarda en el mismo campo `ubicacion` del pedido para no partir el modelo de datos.
export const PARA_LLEVAR = 'Para llevar';

// 🌐 Cómo se VE una ubicación en el idioma del cliente. El valor que se guarda y se manda
// al backend sigue siendo el español de arriba ('Cancha 3', 'Para llevar'): esto sólo pinta.
// Lo que no se reconoce (una mesa que puso la caja, p. ej.) se enseña tal cual.
export function nombreUbicacion(u) {
  const s = String(u || '');
  const m = s.match(/^Cancha (\d+)$/);
  if (m) return t('Cancha {n}', { n: m[1] });
  if (s === 'Bar / Mesa' || s === 'Terraza' || s === 'Recepcion' || s === PARA_LLEVAR) return t(s);
  return s;
}
