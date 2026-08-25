import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { BACKEND } from './lib/constants';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// ── ¿ESTA VISITA VIENE DE UNA CAMPAÑA DE WHATSAPP? ─────────────────────────────
// German, 24-ago-2026: «lo que tenemos que medir es el éxito de esas campañas: cuántos
// leyeron, cuántos entraron al link, cuántos bajaron la app». Los acuses de Meta llegan
// hasta "lo leyó"; de ahí el rastro se cortaba. Cada mensaje lleva ahora el mismo link de
// siempre con un ?c=CODIGO propio de esa persona, y esto es lo que avisa que llegó.
//
// Se hace ANTES de pintar nada y sin esperar respuesta: es una baliza, no un paso del
// arranque. Si el backend está caído, la app abre igual — medir nunca puede costarle la
// entrada a un cliente, y menos en la pantalla que la campaña le pidió abrir.
(() => {
  try {
    const c = new URLSearchParams(location.search).get('c');
    if (!c) return;
    fetch(BACKEND + '/api/avisos/abrio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ c }),
      keepalive: true,   // sobrevive si el cliente navega enseguida
    }).catch(() => {});
    // Se borra el código de la barra de direcciones: si se queda, el cliente puede
    // compartir SU link y las visitas de otros se contarían como suyas. history.replaceState
    // no recarga ni deja entrada en el historial.
    const u = new URL(location.href);
    u.searchParams.delete('c');
    history.replaceState(null, '', u.pathname + u.search + u.hash);
  } catch { /* medir jamás rompe el arranque */ }
})();

// ── Registro del Service Worker (push notifications + offline cache) ───────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
