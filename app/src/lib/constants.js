// Constantes compartidas de la app

export const BACKEND = import.meta.env.VITE_BACKEND_URL || 'https://sierra-padel-backend-production-a55f.up.railway.app';

// Ubicaciones dentro del club (para pedidos y promos express)
export const UBICACIONES = [
  'Cancha 1', 'Cancha 2', 'Cancha 3', 'Cancha 4',
  'Cancha 5', 'Cancha 6', 'Cancha 7', 'Bar / Mesa', 'Terraza', 'Recepcion',
];

// PASO A RECOGER (German, 19-ago). NO es una ubicación más: es lo contrario de una entrega
// —nadie sale a llevarlo, el cliente viene por él— y por eso vive aparte de UBICACIONES.
// Mezclarlo en esa lista lo dejaría escondido entre las canchas y un mesero saldría a
// buscar una cancha que no existe. Se guarda en el mismo campo `ubicacion` del pedido para
// no partir el modelo de datos; lo que cambia es cómo se presenta y cómo se atiende.
export const PASO_A_RECOGER = 'Paso a recoger';
