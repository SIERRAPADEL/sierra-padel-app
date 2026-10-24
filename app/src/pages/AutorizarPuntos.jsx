import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { textoSolicitud, segundosRestantes, reloj, mensajeEstado, es404, money } from '../lib/puntosAut';
import { t } from '../i18n';

// 🔐 AUTORIZAR EL USO DE TUS PUNTOS (German 22-oct-2026: «evitar que los puntos se usen sin
// permiso»). Aquí llega el push «¿Autorizas?» y la tarjeta de Inicio. Nada se descuenta hasta
// que la persona toca «Autorizar»; si no contesta en 3 minutos, vence sola.
export default function AutorizarPuntos() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { apiFetch } = useApi();
  const [s, setS] = useState(null);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    let vivo = true;
    apiFetch(`/pagos/puntos/autorizaciones/${id}`).then(r => {
      if (!vivo) return;
      if (r?.ok) setS(r.data);
      else if (es404(r)) setError(t('Esta solicitud no está disponible por ahora. Pídele a la caja que la mande otra vez.'));
      else setError(r?.error || t('No pudimos cargar la solicitud.'));
    });
    return () => { vivo = false; };
  }, [apiFetch, id]);

  // El reloj de los 3 minutos.
  useEffect(() => {
    if (!s || s.estado !== 'pendiente') return undefined;
    const iv = setInterval(() => setTick(x => x + 1), 1000);
    return () => clearInterval(iv);
  }, [s]);

  async function responder(aceptar) {
    if (enviando) return;
    setEnviando(true);
    const r = await apiFetch(`/pagos/puntos/autorizaciones/${id}/responder`, { method: 'POST', body: JSON.stringify({ aceptar }) });
    setEnviando(false);
    if (r?.ok) setS(r.data);
    else if (r?.data) { setS(r.data); setError(r.error || ''); }
    else setError(r?.error || t('No se pudo enviar tu respuesta. Intenta de nuevo.'));
  }

  const seg = s ? segundosRestantes(s.expires_at) : 0;
  const pendiente = s && s.estado === 'pendiente' && seg > 0;
  const vencida = s && s.estado === 'pendiente' && seg <= 0;

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
          <p className="text-white font-black text-lg">{t('Usar mis puntos')}</p>
        </div>
      </div>

      <div className="px-4 pt-5 flex flex-col gap-3">
        {!s && !error && <div className="card h-40 animate-pulse" />}
        {!s && error && <div className="card text-sm text-gray-600 text-center">{error}</div>}

        {s && (
          <div className="card">
            <p className="text-[12px] font-black tracking-[.14em] uppercase text-gray-400">{t('Solicitud de la caja')}</p>
            <p className="text-[17px] font-black text-gray-900 leading-snug mt-1">{textoSolicitud(s, t)}</p>
            <div className="grid grid-cols-2 gap-2 mt-4 text-[13px]">
              <div className="rounded-xl bg-gray-50 px-3 py-2"><p className="text-gray-400 font-bold">{t('Puntos')}</p><p className="font-black text-gray-900 text-[18px]">{s.puntos}</p></div>
              <div className="rounded-xl bg-gray-50 px-3 py-2"><p className="text-gray-400 font-bold">{t('Equivalen a')}</p><p className="font-black text-gray-900 text-[18px]">{money(s.monto)}</p></div>
              <div className="rounded-xl bg-gray-50 px-3 py-2"><p className="text-gray-400 font-bold">{t('Área')}</p><p className="font-bold text-gray-800">{s.area}</p></div>
              <div className="rounded-xl bg-gray-50 px-3 py-2"><p className="text-gray-400 font-bold">{t('Cuenta')}</p><p className="font-bold text-gray-800">{s.folio || '—'}</p></div>
            </div>
            {s.pedido_por && <p className="text-[13px] text-gray-500 mt-3">{t('La pidió:')} <b>{s.pedido_por}</b></p>}

            {pendiente && (
              <>
                <p className="text-center text-[13px] text-gray-500 mt-4">{(() => {
                  const [antes, despues = ''] = t('Tienes {tiempo} para contestar').split('{tiempo}');
                  return <>{antes}<b className="tabular-nums">{reloj(seg)}</b>{despues}</>;
                })()}</p>
                <div className="flex gap-2 mt-3">
                  <button disabled={enviando} onClick={() => responder(false)}
                    className="flex-1 rounded-xl border border-gray-300 py-3 font-black text-gray-700 active:scale-[0.98] disabled:opacity-50">
                    {t('No autorizo')}
                  </button>
                  <button disabled={enviando} onClick={() => responder(true)}
                    className="flex-[1.4] rounded-xl bg-sp-green py-3 font-black text-white active:scale-[0.98] disabled:opacity-50">
                    {t('Autorizar')}
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 text-center mt-2">{t('Si no lo pediste tú, toca «No autorizo»: no se descuenta nada.')}</p>
              </>
            )}
            {!pendiente && (
              <p className={`mt-4 rounded-xl px-3 py-2.5 text-[14px] font-bold ${s.estado === 'aprobada' || s.estado === 'usada' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {t(mensajeEstado(vencida ? 'expirada' : s.estado))}
              </p>
            )}
            {error && s && <p className="text-[12px] text-gray-500 mt-2">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
