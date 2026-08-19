// Constantes compartidas de la app

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
