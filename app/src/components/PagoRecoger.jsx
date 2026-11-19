import { useState, useEffect } from 'react';
import { t, locale } from '../i18n';

// 🛍️ PASO A RECOGER (German, 19-nov-2026) — las piezas del carrito y del seguimiento que sólo existen
// en este modo. Viven aquí para no engordar Pedir.jsx; NO son pantallas nuevas.

// «7:45 pm» en la hora del CLUB (Monclova), no la del celular: el cliente puede estar de viaje.
export function horaClub(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleTimeString(locale(), { hour: 'numeric', minute: '2-digit', timeZone: 'America/Monterrey' });
}
export const pesos = (n) => '$' + (Number(n) || 0).toLocaleString(locale(), { minimumFractionDigits: 0, maximumFractionDigits: 2 });

// ── Selector de modo del carrito: «En el club» · «Paso a recoger» ───────────────────────
// 🔭 'domicilio' llegará como un tercer botón: el selector ya se arma desde una lista.
export function SelectorModo({ esRecoger, onClub, onRecoger }) {
  const opciones = [
    { k: 'club', on: !esRecoger, click: onClub, txt: t('En el club (mesa o cancha)'), sub: t('Te lo llevamos a tu lugar') },
    { k: 'recoger', on: esRecoger, click: onRecoger, txt: t('Paso a recoger'), sub: t('Pasas por él a la barra') },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 mb-3">
      {opciones.map(o => (
        <button key={o.k} onClick={o.click}
          className={`rounded-xl px-2.5 py-2.5 text-left border ${o.on ? 'bg-sp-green text-white border-sp-green' : 'bg-white text-sp-gray border-gray-200'}`}>
          <span className="block text-[14px] font-black">{o.k === 'recoger' ? '🛍️ ' : '📍 '}{o.txt}</span>
          <span className={`block text-[11px] font-semibold ${o.on ? 'text-white/80' : 'text-gray-400'}`}>{o.sub}</span>
        </button>
      ))}
    </div>
  );
}

// ── El resumen y las formas de pago (se piden al servidor: los precios son suyos) ───────
export function PagoRecoger({ cot, error, pago, setPago, minutos }) {
  if (error) return <p className="text-[13px] font-bold mb-3" style={{ color: '#9a3412' }}>{error}</p>;
  if (!cot) return <p className="text-gray-400 text-[13px] mb-3">{t('Calculando tu total…')}</p>;
  const opciones = [];
  if (cot.mp.activo) opciones.push({ k: 'mp', ico: '💳', txt: t('Tarjeta (link de pago)'), sub: cot.mp.recargo > 0 ? t('Incluye {monto} de servicio de pago en línea', { monto: pesos(cot.mp.recargo) }) : t('Pagas con el link de Mercado Pago'), total: cot.mp.total });
  if (cot.spei.activo) opciones.push({ k: 'spei', ico: '🏦', txt: t('Transferencia SPEI'), sub: t('Sin comisión · tienes {n} min para transferir', { n: cot.spei.espera_min }), total: cot.spei.total });
  // «Pagar al recoger» sólo aparece prendido para clientes frecuentes; para los demás se EXPLICA por qué no.
  opciones.push({ k: 'al_recoger', ico: '💵', txt: t('Pagar al recoger'), total: cot.total, apagada: !cot.habitual,
    sub: cot.habitual ? t('Eres cliente frecuente: pagas al recoger') : (cot.habitual_motivo === 'adeudo'
      ? t('No disponible: tienes un adeudo pendiente')
      : t('Para clientes frecuentes ({n} consumos en {d} días)', { n: cot.habitual_regla.consumos, d: cot.habitual_regla.dias })) });
  return (
    <div className="mb-3">
      {/* Desglose: lo que cuesta, el empaque y el tiempo. Las promos se aplican al preparar. */}
      <div className="rounded-xl bg-gray-50 px-3.5 py-2.5 mb-3 text-[14px]">
        <div className="flex justify-between text-gray-500"><span>{t('Productos')}</span><span>{pesos(cot.subtotal)}</span></div>
        {cot.empaque > 0 && (
          <div className="flex justify-between text-gray-500">
            <span>{t('🥡 Empaque (+{n} por platillo de cocina)', { n: pesos(cot.empaque_unit) })}</span><span>{pesos(cot.empaque)}</span>
          </div>
        )}
        <div className="flex justify-between font-black text-sp-green-dark pt-1.5 mt-1 border-t border-gray-200"><span>{t('Total')}</span><span>{pesos(cot.total)}</span></div>
        <p className="text-[12px] text-gray-400 mt-1">{t('Tus promociones se aplican al preparar tu pedido.')}</p>
        <p className="text-[13px] font-bold mt-1.5" style={{ color: 'var(--sp-green-dark)' }}>⏱️ {t('Pasa por él en ~{n} min', { n: minutos || cot.listo_en_min || 5 })}</p>
      </div>
      <p className="text-sp-gray font-black text-[14px] mb-1.5">{t('¿Cómo pagas?')}</p>
      <div className="flex flex-col gap-2">
        {opciones.map(o => (
          <button key={o.k} disabled={o.apagada} onClick={() => setPago(o.k)}
            className={`rounded-xl px-3.5 py-2.5 text-left border flex items-center justify-between gap-2 ${
              o.apagada ? 'bg-gray-50 text-gray-400 border-gray-100' : pago === o.k ? 'bg-sp-green text-white border-sp-green' : 'bg-white text-sp-gray border-gray-200'}`}>
            <span>
              <span className="block text-[15px] font-black">{o.ico} {o.txt}</span>
              <span className={`block text-[12px] font-semibold ${pago === o.k && !o.apagada ? 'text-white/80' : 'text-gray-400'}`}>{o.sub}</span>
            </span>
            {!o.apagada && <span className="text-[15px] font-black flex-shrink-0">{pesos(o.total)}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Mientras el pedido ESPERA SU PAGO (pantalla de seguimiento) ─────────────────────────
function Cuenta({ hasta }) {
  const [ahora, setAhora] = useState(Date.now());
  useEffect(() => { const iv = setInterval(() => setAhora(Date.now()), 1000); return () => clearInterval(iv); }, []);
  const ms = Math.max(0, new Date(hasta).getTime() - ahora);
  const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000);
  return <span>{m}:{String(s).padStart(2, '0')}</span>;
}

export function EsperandoPago({ pago }) {
  const [copiado, setCopiado] = useState(false);
  if (!pago) return null;
  if (pago.metodo === 'mp') {
    return (
      <div className="card text-left mb-5" style={{ borderColor: '#fde68a' }}>
        <p className="text-sp-gray font-black text-[15px] mb-1">{t('💳 Paga con tarjeta')}</p>
        <p className="text-gray-500 text-[13px] mb-3">{t('Tu pedido entra a la barra en cuanto se confirme el pago.')}</p>
        {pago.link
          ? <a href={pago.link} target="_blank" rel="noopener noreferrer" className="block w-full text-center py-3.5 rounded-xl font-black text-[15px] bg-sp-green text-white">{t('Pagar {monto}', { monto: pesos(pago.monto) })}</a>
          : <p className="text-[13px]" style={{ color: '#9a3412' }}>{t('Estamos preparando tu link de pago…')}</p>}
        {pago.vence_at && <p className="text-[12px] text-gray-400 mt-2">{t('Si no pagas antes de las {hora}, el pedido se cancela.', { hora: horaClub(pago.vence_at) })}</p>}
      </div>
    );
  }
  if (pago.metodo === 'spei') {
    const s = pago.spei || {};
    return (
      <div className="card text-left mb-5" style={{ borderColor: '#fde68a' }}>
        <p className="text-sp-gray font-black text-[15px] mb-1">{t('🏦 Transfiere por SPEI')}</p>
        <p className="text-gray-500 text-[13px] mb-3">{t('Transfiere el monto EXACTO: así tu pedido entra solo a la barra en cuanto llega.')}</p>
        <div className="rounded-xl bg-gray-50 px-3.5 py-2.5 text-[14px] mb-2">
          <div className="flex justify-between"><span className="text-gray-500">{t('Monto exacto')}</span><span className="font-black text-sp-green-dark">{pesos(pago.monto)}</span></div>
          {s.banco && <div className="flex justify-between"><span className="text-gray-500">{t('Banco')}</span><span className="font-bold text-sp-gray">{s.banco}</span></div>}
          {s.beneficiario && <div className="flex justify-between"><span className="text-gray-500">{t('Beneficiario')}</span><span className="font-bold text-sp-gray">{s.beneficiario}</span></div>}
          {s.clabe && <div className="flex justify-between items-center gap-2"><span className="text-gray-500">CLABE</span><span className="font-black text-sp-gray tracking-wide">{s.clabe}</span></div>}
        </div>
        {s.clabe && (
          <button onClick={() => { try { navigator.clipboard.writeText(s.clabe); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch { /* sin portapapeles */ } }}
            className="w-full py-2.5 rounded-xl font-bold text-[14px] bg-white border border-gray-200 text-sp-gray">{copiado ? t('✓ Copiada') : t('Copiar CLABE')}</button>
        )}
        {pago.vence_at && (
          <p className="text-[13px] font-bold mt-2.5" style={{ color: '#9a3412' }}>
            ⏳ {t('Tienes')} <Cuenta hasta={pago.vence_at} /> {t('min — si no llega, el pedido se cancela y te avisamos.')}
          </p>
        )}
      </div>
    );
  }
  return null;
}
