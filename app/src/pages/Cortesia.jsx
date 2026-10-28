import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { t } from '../i18n';

// 🎁 PIDE TU CORTESÍA (German 27-oct-2026). La cajera entregaba ~22% de las cortesías que
// tocaban: el socio no sabía que le tocaba y la caja no se acordaba. Ahora al llegar a su reta,
// clase o liga le llega un push que abre AQUÍ (/cortesia?dia=AAAA-MM-DD) y la pide él mismo:
// sale la comanda a barra/tienda a $0, igual que con el botón de la caja.
// Es del día: si el push era de otro día, o ya la recibió, se dice claro y no hay botón.
// Los mensajes de «por qué no» los pone el servidor (cortesias.js), en un solo lugar.
const ESTILO = {
  entregada: 'bg-green-50 text-green-700',
  vencida: 'bg-gray-100 text-gray-600',
  sin_renta: 'bg-amber-50 text-amber-800',
  sin_derecho: 'bg-gray-100 text-gray-600',
};

export default function Cortesia() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const dia = params.get('dia') || '';
  const { apiFetch } = useApi();
  const [s, setS] = useState(null);
  const [error, setError] = useState('');
  const [item, setItem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(null);

  useEffect(() => {
    let vivo = true;
    apiFetch(`/cortesias/mia${dia ? `?dia=${encodeURIComponent(dia)}` : ''}`).then(r => {
      if (!vivo) return;
      if (r?.ok) { setS(r.data); setItem((r.data?.opciones && r.data.opciones[0]) || r.data?.item || ''); }
      else setError(r?.error || t('No pudimos cargar tu cortesía.'));
    });
    return () => { vivo = false; };
  }, [apiFetch, dia]);

  async function pedir() {
    if (enviando) return;
    setEnviando(true); setError('');
    const r = await apiFetch('/cortesias/pedir', { method: 'POST', body: JSON.stringify({ dia: dia || null, item: item || null }) });
    setEnviando(false);
    if (r?.ok) { setListo(r.data); return; }
    // Se le adelantó la caja, se le acabó el día, etc.: el servidor dice el estado nuevo.
    if (r?.estado) setS(prev => ({ ...(prev || {}), estado: r.estado, mensaje: r.error }));
    else setError(r?.error || t('No se pudo pedir tu cortesía. Intenta de nuevo.'));
  }

  const disponible = s && s.estado === 'disponible' && !listo;

  return (
    <div className="page safe-bottom">
      <div className="bg-sp-green px-5 pt-[env(safe-area-inset-top)] pb-4">
        <div className="flex items-center gap-2 pt-3">
          <button
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/home'))}
            aria-label={t('Regresar')}
            className="w-9 h-9 -ml-2 rounded-full flex items-center justify-center active:bg-black/10"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <p className="text-white font-black text-lg">{t('Tu cortesía de hoy')}</p>
        </div>
      </div>

      <div className="px-4 pt-5 flex flex-col gap-3">
        {!s && !error && <div className="card h-40 animate-pulse" />}
        {!s && error && <div className="card text-sm text-gray-600 text-center">{error}</div>}

        {s && (
          <div className="card">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[12px] font-black tracking-[.14em] uppercase text-gray-400">
                🎁 {s.nivel ? t('Cortesía nivel {nivel}', { nivel: s.nivel }) : t('Cortesía de lealtad')}
              </p>
              {disponible && <span className="text-[11px] font-black uppercase tracking-wide rounded-full bg-amber-100 text-amber-800 px-2 py-0.5">{t('Vence hoy')}</span>}
            </div>

            {listo ? (
              <>
                <p className="text-[18px] font-black text-gray-900 leading-snug mt-2">{t('¡Listo! Tu {item} ya va en camino.', { item: listo.item })}</p>
                <p className="mt-3 rounded-xl px-3 py-2.5 text-[14px] font-bold bg-green-50 text-green-700">
                  {t('Pásala a recoger a barra/tienda. No se cobra.')}
                </p>
              </>
            ) : disponible ? (
              <>
                {Array.isArray(s.opciones) && s.opciones.length > 1 ? (
                  <>
                    <p className="text-[17px] font-black text-gray-900 leading-snug mt-2">{t('Escoge tu cortesía sin costo')}</p>
                    <div className="flex gap-2 mt-3">
                      {s.opciones.map(op => (
                        <button key={op} onClick={() => setItem(op)}
                          className={`flex-1 rounded-xl border py-3 font-black active:scale-[0.98] ${item === op ? 'border-sp-green bg-sp-green/10 text-sp-green' : 'border-gray-300 text-gray-700'}`}>
                          {t(op)}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-[18px] font-black text-gray-900 leading-snug mt-2">{t(s.item)} · {t('sin costo')}</p>
                )}
                <p className="text-[13px] text-gray-500 mt-3">{t('Se entrega en barra/tienda. Es sólo por hoy: si no la pides, se pierde.')}</p>
                <button disabled={enviando || !item} onClick={pedir}
                  className="w-full mt-4 rounded-xl bg-sp-green py-3 font-black text-white active:scale-[0.98] disabled:opacity-50">
                  {enviando ? t('Pidiendo…') : t('Pedir mi cortesía')}
                </button>
              </>
            ) : (
              <p className={`mt-3 rounded-xl px-3 py-2.5 text-[14px] font-bold ${ESTILO[s.estado] || 'bg-gray-100 text-gray-600'}`}>
                {s.mensaje}
              </p>
            )}
            {error && s && <p className="text-[12px] text-red-600 mt-2">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
