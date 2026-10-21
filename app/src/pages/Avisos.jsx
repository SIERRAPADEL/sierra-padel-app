import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { fmtRelativa } from '../lib/format';
import { destinoDelAviso, marcarLeidoLocal, marcarTodosLocal, avisarCambioBuzon } from '../lib/buzon';

// 🔔 EL BUZÓN (German 21-oct-2026): «un mal click y se pierde». Aquí se quedan los avisos que
// el club te mandó por push, aunque hayas cerrado la notificación o no te haya llegado.
// Tocar uno lo marca leído y te lleva a su pantalla (la misma a la que llevaba el push).
// Cada aviso se va solo: el día de su evento, o a los 7 días.
export default function Avisos() {
  const navigate = useNavigate();
  const { apiFetch } = useApi();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/avisos-cliente').then(r => {
      if (r?.ok) { setDatos(r.data); avisarCambioBuzon(r.data?.no_leidos || 0); }
      else setError(r?.error || 'No se pudieron cargar tus avisos.');
    });
  }, [apiFetch]);

  function abrir(a) {
    if (!a.leido) {
      const nuevo = marcarLeidoLocal(datos, a.id);
      setDatos(nuevo);
      avisarCambioBuzon(nuevo.no_leidos);
      apiFetch(`/avisos-cliente/${a.id}/leido`, { method: 'POST' }).catch(() => {});
    }
    const destino = destinoDelAviso(a.url);
    if (destino) navigate(destino);
  }

  function leerTodos() {
    const nuevo = marcarTodosLocal(datos);
    setDatos(nuevo);
    avisarCambioBuzon(0);
    apiFetch('/avisos-cliente/leidos', { method: 'POST' }).catch(() => {});
  }

  const avisos = datos?.avisos || [];
  const noLeidos = datos?.no_leidos || 0;

  return (
    <div className="page safe-bottom">
      {/* Header */}
      <div className="bg-sp-green px-5 pt-[env(safe-area-inset-top)] pb-4">
        <div className="flex items-center justify-between gap-3 pt-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/home'))}
              aria-label="Regresar"
              className="w-9 h-9 -ml-2 rounded-full flex items-center justify-center active:bg-black/10"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <p className="text-white font-black text-lg truncate">Avisos</p>
          </div>
          {noLeidos > 0 && (
            <button
              onClick={leerTodos}
              className="bg-black/20 rounded-full px-3.5 py-1.5 text-white text-[13px] font-bold active:scale-95 transition-transform flex-shrink-0"
            >
              Marcar leídos
            </button>
          )}
        </div>
        <p className="text-white/75 text-[13px] font-medium mt-1">
          {noLeidos > 0 ? `${noLeidos} sin leer · ` : ''}Aquí se quedan aunque cierres la notificación.
        </p>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-2.5">
        {!datos && !error && [1, 2, 3].map(i => (
          <div key={i} className="card h-[76px] animate-pulse" />
        ))}

        {error && <div className="card text-sm text-gray-500 text-center">{error}</div>}

        {datos && avisos.length === 0 && (
          <div className="flex flex-col items-center text-center py-14 px-6">
            <div className="w-14 h-14 rounded-full bg-white border border-gray-100 flex items-center justify-center mb-3">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
            </div>
            <p className="font-black text-gray-800">No tienes avisos</p>
            <p className="text-sm text-gray-500 mt-1">Cuando el club te mande algo, aquí lo encuentras.</p>
          </div>
        )}

        {avisos.map(a => {
          const lleva = !!destinoDelAviso(a.url);
          return (
            <button
              key={a.id}
              onClick={() => abrir(a)}
              className={`card text-left w-full flex items-start gap-3 active:scale-[0.99] transition-transform ${
                a.leido ? 'opacity-70' : 'border-sp-green/40'
              }`}
            >
              <span
                aria-hidden="true"
                className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${a.leido ? 'bg-transparent' : 'bg-sp-green'}`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className={`text-[15px] leading-snug ${a.leido ? 'font-semibold text-gray-600' : 'font-black text-gray-900'}`}>
                    {a.titulo}
                  </p>
                  <span className="text-[11px] text-gray-400 font-semibold whitespace-nowrap flex-shrink-0">
                    {fmtRelativa(a.creado_at)}
                  </span>
                </div>
                {a.cuerpo && <p className="text-[13px] text-gray-500 leading-snug mt-0.5">{a.cuerpo}</p>}
                {lleva && <p className="text-[12px] font-bold text-sp-green mt-1.5">Ver →</p>}
              </div>
            </button>
          );
        })}

        {avisos.length > 0 && (
          <p className="text-[11px] text-gray-400 text-center mt-2">Cada aviso se borra solo cuando pasa su evento o a los 7 días.</p>
        )}
      </div>
    </div>
  );
}
