import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { es404, money, MOTIVOS_RECLAMO } from '../lib/puntosAut';

// 🔒 UNA CUENTA TUYA QUEDÓ SIN PAGAR (German 22-oct-2026). Aquí lleva el aviso: el detalle
// (folio, fecha, área, cargos, saldo, quién la abrió) y el botón «No es mía / ya la pagué»,
// que le llega a German. Al liquidarse, cada día de atraso descuenta puntos (si el reclamo procede, no).
export default function CuentaVencida() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { apiFetch } = useApi();
  const [c, setC] = useState(null);
  const [error, setError] = useState('');
  const [motivo, setMotivo] = useState('');
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  useEffect(() => {
    apiFetch(`/pagos/vencidas/${id}`).then(r => {
      if (r?.ok) setC(r.data);
      else if (es404(r)) setError('Este detalle no está disponible por ahora.');
      else setError(r?.error || 'No pudimos cargar la cuenta.');
    });
  }, [apiFetch, id]);

  async function reclamar() {
    if (!motivo || enviando) return;
    setEnviando(true);
    const r = await apiFetch(`/pagos/vencidas/${id}/reclamo`, { method: 'POST', body: JSON.stringify({ motivo, comentario }) });
    setEnviando(false);
    if (r?.ok) { setEnviado(true); setC(x => (x ? { ...x, reclamo: x.reclamo || { motivo } } : x)); }
    else setError(r?.error || 'No se pudo enviar. Intenta de nuevo.');
  }

  const pen = c && c.penalizacion;

  return (
    <div className="page safe-bottom">
      <div className="bg-sp-green px-5 pt-[env(safe-area-inset-top)] pb-4">
        <div className="flex items-center gap-2 pt-3">
          <button onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/home'))} aria-label="Regresar"
            className="w-9 h-9 -ml-2 rounded-full flex items-center justify-center active:bg-black/10">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <p className="text-white font-black text-lg">Cuenta pendiente</p>
        </div>
      </div>

      <div className="px-4 pt-5 flex flex-col gap-3">
        {!c && !error && <div className="card h-48 animate-pulse" />}
        {!c && error && <div className="card text-sm text-gray-600 text-center">{error}</div>}
        {c && (
          <>
            <div className="card">
              <p className="text-[12px] font-black tracking-[.14em] uppercase text-gray-400">{c.vencida ? 'Sin pagar' : 'Ya no está pendiente'}</p>
              <p className="text-[17px] font-black text-gray-900 mt-1">Cuenta {c.folio || ''} · {c.fecha}</p>
              <p className="text-[13px] text-gray-500 mt-0.5">{c.area}{c.abierta_por ? ` · la abrió ${c.abierta_por}` : ''}</p>
              <div className="mt-3 divide-y divide-gray-100">
                {(c.cargos || []).map((k, i) => (
                  <div key={i} className="flex justify-between py-1.5 text-[14px]">
                    <span className="text-gray-700">{k.cantidad > 1 ? `${k.cantidad}× ` : ''}{k.descripcion}</span>
                    <span className="font-bold text-gray-900 tabular-nums">{money(k.subtotal)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2 pt-2 border-t border-gray-200 text-[15px]">
                <span className="font-black text-gray-900">Debes</span>
                <span className="font-black text-gray-900 tabular-nums">{money(c.saldo)}</span>
              </div>
              {c.vencida && (
                <p className="text-[13px] text-amber-700 bg-amber-50 rounded-xl px-3 py-2 mt-3">
                  🔒 Mientras siga sin pagar, tus puntos están bloqueados (los sigues acumulando).
                  {pen && pen.puntos_por_dia > 0 ? ` Cada día de atraso te descuenta ${pen.puntos_por_dia} puntos al liquidarla${pen.dias_hasta_hoy > 0 ? `: si la liquidas hoy, son ${pen.puntos_si_liquida_hoy} (${pen.dias_hasta_hoy} día${pen.dias_hasta_hoy === 1 ? '' : 's'})` : ''}.` : ''}
                </p>
              )}
            </div>

            {c.vencida && (c.reclamo || enviado ? (
              <div className="card text-[14px] text-gray-700">
                ✅ Recibimos tu aviso{c.reclamo && c.reclamo.motivo ? ` («${(MOTIVOS_RECLAMO.find(m => m.clave === c.reclamo.motivo) || {}).texto || ''}»)` : ''}.
                Lo revisa el club; si no es tuya, no se te descuenta nada por atraso.
              </div>
            ) : (
              <div className="card">
                <p className="font-black text-gray-900">¿No es tuya o ya la pagaste?</p>
                <div className="flex gap-2 mt-3">
                  {MOTIVOS_RECLAMO.map(m => (
                    <button key={m.clave} onClick={() => setMotivo(m.clave)}
                      className={`flex-1 rounded-xl py-2.5 font-bold border ${motivo === m.clave ? 'bg-sp-green text-white border-sp-green' : 'border-gray-300 text-gray-700'}`}>
                      {m.texto}
                    </button>
                  ))}
                </div>
                <textarea value={comentario} onChange={e => setComentario(e.target.value)} maxLength={500} rows={2}
                  placeholder="Cuéntanos (por ejemplo: pagué por transferencia el martes)"
                  className="w-full mt-3 rounded-xl border border-gray-300 px-3 py-2 text-[14px]" />
                <button disabled={!motivo || enviando} onClick={reclamar}
                  className="w-full mt-3 rounded-xl bg-gray-900 text-white py-3 font-black disabled:opacity-40">
                  Avisar al club
                </button>
                {error && <p className="text-[12px] text-red-600 mt-2">{error}</p>}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
