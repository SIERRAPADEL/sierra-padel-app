// 🔐 Autorizar el uso de tus puntos + 🔒 puntos bloqueados por una cuenta sin pagar.
// La lógica sin pantalla, para poder probarla sola (backend/tests/test_app_autorizar_puntos.mjs).
//
// German (22-oct-2026): «para usarse los puntos le llegue al cliente una confirmación en la app;
// evitar que los puntos se usen sin permiso». La caja pide, aquí se autoriza o no.

const money = (n) => '$' + (Math.round((Number(n) || 0) * 100) / 100).toFixed(2);
export { money };

// El servidor puede ir atrasado (Railway): una ruta que todavía no existe contesta 404 y la
// app NO se rompe — sólo no enseña nada.
export function es404(r) {
  return /\(404\)/.test(String((r && r.error) || ''));
}

// «Caja Bar quiere usar 263 puntos ($131.50) en tu cuenta F-0004059.»
export function textoSolicitud(s) {
  if (!s) return '';
  const folio = s.folio ? ` ${s.folio}` : '';
  return `${s.area || 'La caja'} quiere usar ${s.puntos} puntos (${money(s.monto)}) en tu cuenta${folio}.`;
}

export function segundosRestantes(expiresAt, ahora = Date.now()) {
  const t = new Date(expiresAt).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.round((t - ahora) / 1000));
}

export function reloj(seg) {
  const s = Math.max(0, Math.floor(Number(seg) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// Lo que se le dice a la persona según cómo quedó la solicitud.
export function mensajeEstado(estado) {
  return ({
    pendiente: null,
    aprobada: 'Autorizaste el uso de tus puntos. La caja ya puede aplicarlos.',
    usada: 'Listo: tus puntos ya se aplicaron a tu cuenta.',
    rechazada: 'No autorizaste. No se usó ningún punto.',
    expirada: 'Esta solicitud venció. Si quieres usar tus puntos, pídele a la caja que la mande otra vez.',
    cancelada: 'La caja canceló esta solicitud. No se usó ningún punto.',
  })[estado] || 'Esta solicitud ya no está vigente.';
}

export const MOTIVOS_RECLAMO = [
  { clave: 'no_es_mia', texto: 'No es mía' },
  { clave: 'ya_la_pague', texto: 'Ya la pagué' },
];
