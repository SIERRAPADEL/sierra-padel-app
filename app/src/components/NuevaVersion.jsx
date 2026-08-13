import { useState, useEffect } from 'react';

// Aviso de "hay version nueva, recarga".
//
// EL PROBLEMA (vivido el 13-ago, dos veces seguidas): se despliega un arreglo, el usuario
// tiene la app abierta y NO se entera. El service worker no tiene la culpa — la navegacion
// es network-first — es que una app abierta simplemente no vuelve a pedir el index.html:
// sigue corriendo en memoria el JavaScript viejo. German cerro su reta de prueba por error
// DOS veces con la version anterior, ya con el arreglo desplegado.
//
// COMO SE DETECTA: se pide el index.html sin cache y se compara el nombre del bundle (que
// lleva hash) contra el que esta corriendo. Si cambio, hay version nueva. No hace falta
// llevar un numero de version a mano: el hash ya cambia solo en cada build.
const CADA_MS = 5 * 60 * 1000;

// El bundle que ESTA corriendo, leido del propio documento.
function bundleActual() {
  const s = document.querySelector('script[src*="/assets/index-"]');
  const m = s && s.getAttribute('src') && s.getAttribute('src').match(/index-[A-Za-z0-9_-]+\.js/);
  return m ? m[0] : null;
}

export default function NuevaVersion() {
  const [hayNueva, setHayNueva] = useState(false);

  useEffect(() => {
    const mio = bundleActual();
    if (!mio) return;   // en desarrollo no hay bundle con hash: no aplica

    let vivo = true;
    async function revisar() {
      try {
        // 🔑 URL ÚNICA en cada intento. `cache:'no-store'` salta el cache del navegador
        // pero NO el del service worker: para un fetch normal el SW usa cache-first con
        // refresco en segundo plano, asi que devolvia el index.html ANTERIOR y la
        // deteccion llegaba un ciclo tarde (comprobado en vivo). Con una URL distinta
        // cada vez, el SW no tiene nada cacheado y va a la red.
        const r = await fetch(`/index.html?v=${Date.now()}`, { cache: 'no-store' });
        const html = await r.text();
        const m = html.match(/index-[A-Za-z0-9_-]+\.js/);
        if (vivo && m && m[0] !== mio) setHayNueva(true);
      } catch (_) { /* sin red: se reintenta al rato */ }
    }
    revisar();
    const t = setInterval(revisar, CADA_MS);
    // Al volver a la app (cambio de pestaña / desbloquear el telefono) se revisa de una:
    // es justo el momento en que alguien retoma una app que llevaba horas abierta.
    const alVolver = () => { if (document.visibilityState === 'visible') revisar(); };
    document.addEventListener('visibilitychange', alVolver);
    return () => { vivo = false; clearInterval(t); document.removeEventListener('visibilitychange', alVolver); };
  }, []);

  if (!hayNueva) return null;

  return (
    <div
      className="fixed left-0 right-0 z-[60] px-4"
      style={{ bottom: 'calc(72px + env(safe-area-inset-bottom))' }}
    >
      <div className="rounded-2xl bg-sp-gray text-white shadow-lg flex items-center gap-3 px-4 py-3">
        <span className="text-[13px] font-bold flex-1 leading-tight">
          Hay una versión nueva de la app
        </span>
        <button
          onClick={() => window.location.reload()}
          className="text-[13px] font-black px-4 py-2 rounded-full bg-sp-green text-white active:scale-95 transition-transform shrink-0"
        >
          Actualizar
        </button>
      </div>
    </div>
  );
}
