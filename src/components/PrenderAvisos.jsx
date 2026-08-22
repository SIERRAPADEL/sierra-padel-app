import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { isPushSupported, isStandalone, usePushSubscription } from './NotificationSetup';

/**
 * PrenderAvisos — el botón para encender las notificaciones, a la vista.
 *
 * German (21-ago-2026): *"necesitamos que tengan acceso al botón de prende tus
 * notificaciones muy fácil, es la única manera que no tengan que buscarlo"*.
 *
 * 🔑 POR QUÉ NO ALCANZABA CON LO QUE HABÍA. `NotificationSetup` es un aviso pasajero: sale
 * a los 3 segundos, **sólo si la app está instalada**, **sólo si el permiso está sin
 * decidir**, y si lo descartan una vez **no vuelve nunca**. Por eso las notificaciones
 * llevan clavadas en ~59 de 255 clientes. Este componente es lo contrario: se queda en la
 * pantalla mientras la persona no las tenga, y se pone donde el aviso SIRVE.
 *
 * ⚠️ En iPhone el push exige que la app esté INSTALADA. Sin ese candado, el botón fallaría
 * y quedaría peor que no ofrecerlo: la persona toca, no pasa nada, y ya no vuelve a
 * intentar. Ahí se le dice qué hacer en vez de darle un botón muerto.
 */
export default function PrenderAvisos({ motivo, compacto = false }) {
  const { apiFetch } = useApi();
  const { subscribe, subscribing } = usePushSubscription(apiFetch);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState('');

  const ya = typeof localStorage !== 'undefined' && localStorage.getItem('pushSubscribed') === '1';
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const esIOS = /iPad|iPhone|iPod/.test(ua);
  const soportado = isPushSupported();

  if (ya || listo) {
    if (!listo) return null;                 // ya las tenía: no hay nada que decirle
    return (
      <div className={`rounded-2xl bg-sp-green-light p-4 ${compacto ? '' : 'mx-4 mt-4'}`}>
        <p className="font-black text-sp-green-dark text-[15px]">🔔 Listo, ya las tienes</p>
        <p className="text-[13px] text-sp-green-dark/80 mt-0.5">
          {motivo || 'Te avisamos en cuanto haya algo que necesites saber.'}
        </p>
      </div>
    );
  }

  // iPhone sin instalar: el push no existe hasta que la agreguen a la pantalla de inicio.
  if (esIOS && !isStandalone()) {
    return (
      <div className={`rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 ${compacto ? '' : 'mx-4 mt-4'}`}>
        <p className="font-black text-amber-900 text-[15px]">🔔 Para recibir avisos</p>
        <p className="text-[13px] text-amber-900/80 mt-1 leading-snug">
          En iPhone hay que agregar Sierra Pádel a la pantalla de inicio primero. Toca
          <b> Compartir</b> abajo y luego <b>Agregar a inicio</b>; desde ahí ya podrás
          prender las notificaciones.
        </p>
      </div>
    );
  }

  if (!soportado) return null;               // navegador que no puede: no se promete nada

  return (
    <div className={`rounded-2xl border-2 border-sp-green bg-white p-4 ${compacto ? '' : 'mx-4 mt-4'}`}>
      <p className="font-black text-sp-gray text-[15px]">🔔 Prende tus notificaciones</p>
      <p className="text-[13px] text-gray-600 mt-1 leading-snug">
        {motivo || 'Te avisamos lo que necesitas saber.'} Sin esto no te llega nada al teléfono.
      </p>
      <button
        onClick={async () => {
          setError('');
          const ok = await subscribe();
          if (ok) setListo(true);
          else setError('No se pudieron activar. Revisa los permisos del navegador e intenta de nuevo.');
        }}
        disabled={subscribing}
        className="btn-green w-full mt-3 disabled:opacity-60"
      >
        {subscribing ? 'Activando…' : 'Prender notificaciones'}
      </button>
      {error && <p className="text-[12px] text-red-500 mt-2">{error}</p>}
    </div>
  );
}
