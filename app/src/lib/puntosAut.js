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

// 🌐 Este archivo NO importa i18n: lo prueba Node directo (backend/tests). Quien pinta pasa
// su t() como `tr`; sin `tr` sale en español, igual que siempre.
const sinTraducir = (texto, vars) => (vars ? String(texto).replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined && vars[k] !== null ? String(vars[k]) : m)) : texto);

// 💰 German (17-nov-2026): «el saldo a favor es decisión del cliente». La misma solicitud sirve
// para usar su saldo a favor (en pesos): viene con `tipo: 'saldo_favor'` y sin puntos.
export function esSaldo(s) {
  return !!s && s.tipo === 'saldo_favor';
}

// «Caja Bar quiere usar 263 puntos ($131.50) en tu cuenta F-0004059.»
// «Caja Bar quiere usar $200.00 de tu saldo a favor en tu cuenta F-0004059.»
export function textoSolicitud(s, tr = sinTraducir) {
  if (!s) return '';
  const vars = { area: s.area || tr('La caja'), puntos: s.puntos, monto: money(s.monto), folio: s.folio || '' };
  if (esSaldo(s)) {
    return s.folio
      ? tr('{area} quiere usar {monto} de tu saldo a favor en tu cuenta {folio}.', vars)
      : tr('{area} quiere usar {monto} de tu saldo a favor en tu cuenta.', vars);
  }
  return s.folio
    ? tr('{area} quiere usar {puntos} puntos ({monto}) en tu cuenta {folio}.', vars)
    : tr('{area} quiere usar {puntos} puntos ({monto}) en tu cuenta.', vars);
}

// La pregunta grande de la pantalla del saldo: «¿Usar $200.00 de tu saldo a favor en la cuenta F-0004059?»
export function preguntaSaldo(s, tr = sinTraducir) {
  if (!s) return '';
  const vars = { monto: money(s.monto), folio: s.folio || '' };
  return s.folio
    ? tr('¿Usar {monto} de tu saldo a favor en la cuenta {folio}?', vars)
    : tr('¿Usar {monto} de tu saldo a favor en esta cuenta?', vars);
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

// Lo que se le dice a la persona según cómo quedó la solicitud. Regresa el español: la
// pantalla lo pasa por t() (la llave es este mismo texto).
export function mensajeEstado(estado, tipo = 'puntos') {
  if (tipo === 'saldo_favor') {
    return ({
      pendiente: null,
      aprobada: 'Autorizaste usar tu saldo a favor. La caja ya puede aplicarlo.',
      usada: 'Listo: tu saldo a favor ya se aplicó a tu cuenta.',
      rechazada: 'No autorizaste. No se usó nada de tu saldo a favor.',
      expirada: 'Esta solicitud venció. Si quieres usar tu saldo a favor, pídele a la caja que la mande otra vez.',
      cancelada: 'La caja canceló esta solicitud. No se usó nada de tu saldo a favor.',
    })[estado] || 'Esta solicitud ya no está vigente.';
  }
  return ({
    pendiente: null,
    aprobada: 'Autorizaste el uso de tus puntos. La caja ya puede aplicarlos.',
    usada: 'Listo: tus puntos ya se aplicaron a tu cuenta.',
    rechazada: 'No autorizaste. No se usó ningún punto.',
    expirada: 'Esta solicitud venció. Si quieres usar tus puntos, pídele a la caja que la mande otra vez.',
    cancelada: 'La caja canceló esta solicitud. No se usó ningún punto.',
  })[estado] || 'Esta solicitud ya no está vigente.';
}

// `texto` es la llave en español: la pantalla lo pinta con t(m.texto).
export const MOTIVOS_RECLAMO = [
  { clave: 'no_es_mia', texto: 'No es mía' },
  { clave: 'ya_la_pague', texto: 'Ya la pagué' },
];
