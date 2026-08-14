/**
 * AvisosApagados — tarjeta FIJA en la portada para quien no tiene avisos activos.
 *
 * Pedido de German (13-ago): "quiero que sea más fácil activar las notificaciones, que
 * aparezca en la pantalla principal para quien no las tiene activadas".
 *
 * Por qué hacía falta: NotificationSetup es un aviso PASAJERO — sale a los 3 segundos, sólo
 * si la app ya está instalada, y si lo descartan una vez no vuelve nunca (queda la marca
 * `notifCard_dismissed`). Resultado medido: 30 personas con avisos y la última alta el
 * 31-jul. Quien lo cerró de prisa no tiene forma de volver a activarlos.
 *
 * Esta tarjeta vive en la portada, no interrumpe, y se puede posponer — pero vuelve, porque
 * sin avisos el jugador no se entera de que lo invitaron a una reta.
 *
 * Tres estados, tres textos distintos (un aviso genérico no ayuda a resolverlo):
 *  · Se puede activar aquí            → botón que pide el permiso.
 *  · iPhone sin la app instalada      → push no existe en Safari hasta instalarla: se explica cómo.
 *  · Bloqueado en el navegador        → el botón ya no sirve; hay que ir a ajustes del teléfono.
 */
import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { isPushSupported, isStandalone, usePushSubscription } from './NotificationSetup';

const POSPUESTO = 'avisosApagados_pospuesto';
const DIAS_POSPUESTO = 7;

function estaPospuesto() {
  const v = Number(localStorage.getItem(POSPUESTO) || 0);
  return v > 0 && Date.now() - v < DIAS_POSPUESTO * 86400000;
}

// ¿Es iPhone/iPad? Ahí el push NO existe hasta que la app se instala en la pantalla de inicio.
function esIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export default function AvisosApagados() {
  const { apiFetch } = useApi();
  const { subscribe, subscribing, error } = usePushSubscription(apiFetch);
  const [estado, setEstado] = useState(null); // 'activar' | 'instalar' | 'bloqueado' | null
  const [listo, setListo] = useState(false);

  useEffect(() => {
    if (estaPospuesto()) return;

    const permiso = typeof Notification !== 'undefined' ? Notification.permission : 'default';
    if (permiso === 'granted' && localStorage.getItem('pushSubscribed')) return; // ya está

    if (permiso === 'denied') { setEstado('bloqueado'); return; }
    // iPhone sin instalar: el navegador ni siquiera ofrece la posibilidad.
    if (esIOS() && !isStandalone()) { setEstado('instalar'); return; }
    if (!isPushSupported()) return;   // navegador que no puede: no prometer lo que no hay
    setEstado('activar');
  }, []);

  async function activar() {
    const ok = await subscribe();
    if (ok) setListo(true);
  }

  function posponer() {
    localStorage.setItem(POSPUESTO, String(Date.now()));
    setEstado(null);
  }

  if (listo) {
    return (
      <div className="card flex items-center gap-3 py-3" style={{ borderColor: '#96C800' }}>
        <span style={{ fontSize: 22 }}>✅</span>
        <p className="text-sp-gray font-bold text-[15px]">
          Listo, ya te vamos a avisar de tus retas.
        </p>
      </div>
    );
  }
  if (!estado) return null;

  const textos = {
    activar: {
      icono: '🔔',
      titulo: 'Activa los avisos',
      cuerpo: 'Te avisamos cuando te inviten a una reta, cuando se llene tu cancha y cuando haya torneo.',
      boton: subscribing ? 'Activando…' : 'Activar avisos',
    },
    instalar: {
      icono: '📲',
      titulo: 'Instala la app para recibir avisos',
      cuerpo: 'En tu iPhone: toca Compartir abajo y luego «Agregar a inicio». Desde ahí ya te podemos avisar de tus retas.',
      boton: null,
    },
    bloqueado: {
      icono: '🔕',
      titulo: 'Tienes los avisos bloqueados',
      cuerpo: 'Actívalos en los ajustes de tu teléfono, en las notificaciones de Sierra Padel. Sin eso no te enteras de tus retas.',
      boton: null,
    },
  }[estado];

  return (
    <div className="card py-3" style={{ borderColor: '#96C800', background: '#F8FCEF' }}>
      <div className="flex items-start gap-3">
        <span style={{ fontSize: 24, lineHeight: 1 }}>{textos.icono}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sp-gray font-bold text-[15px]">{textos.titulo}</p>
          <p className="text-gray-500 text-[13px] mt-0.5 leading-snug">{textos.cuerpo}</p>

          {error && error !== 'denied' && (
            <p className="text-red-500 text-[12px] mt-1">{error}</p>
          )}

          <div className="flex items-center gap-2 mt-2.5">
            {textos.boton && (
              <button
                onClick={activar}
                disabled={subscribing}
                className="text-[13px] font-black px-4 py-2 rounded-full bg-sp-green text-white active:scale-95 transition-transform disabled:opacity-50"
              >
                {textos.boton}
              </button>
            )}
            <button
              onClick={posponer}
              className="text-[13px] font-bold px-3 py-2 rounded-full text-gray-400"
            >
              Ahora no
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
