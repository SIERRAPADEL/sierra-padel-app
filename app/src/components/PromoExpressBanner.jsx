import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BACKEND, UBICACIONES } from '../lib/constants';
import PrenderAvisos from './PrenderAvisos';

/**
 * EL ESCAPARATE — un banner rotativo con las promociones del día, arriba en Home.
 *
 * German (24-ago-2026), en cuatro pasos que fueron formando el diseño:
 *   1. «un banner con las promociones del día, bien ubicada para que no estorbe pero la
 *      gente las vea; abajo del nombre como está plantada la promo de la primera renta»
 *   2. «funciona para los que no tienen las notificaciones prendidas, y ese puede ser un
 *      gancho: reclámala siempre y cuando prendas las notificaciones»
 *   3. «que TODO TIPO de promociones puedan ser anunciadas en ese espacio, no quiero que
 *      pongamos una promo express y no se pueda poner ahí por algún detalle»
 *   4. «quiero que sea UN banner, que con el tiempo vaya cambiando la promo. Título en
 *      grande, explicación al dar click. No quiero mucho texto en la tarjeta del banner,
 *      la gente no lee; no es funcional»
 *
 * 🔑 POR ESO LA TARJETA CASI NO TIENE TEXTO: sólo el título en grande y, si corre el reloj,
 * el tiempo. La descripción, los horarios y el botón viven en la hoja que se abre al tocar.
 * Una tarjeta con tres renglones de explicación no la lee nadie y ocupa media pantalla.
 *
 * 🔴 LO QUE ESTABA MAL ANTES: se mostraba UNA promo express y sólo durante su ventana de 90
 * minutos. El resto del día el banner no existía, así que quien no recibió el push nunca se
 * enteraba — 61 de 131 clientes con cuenta no tienen notificaciones. Y una cortesía cargada
 * por el motor de descuentos no cabía aquí "por un detalle": vive en otra tabla. Ahora pinta
 * lo que le dé /escaparate, sin saber de dónde salió: fuente nueva = aparece sola.
 */

// 3 segundos por promo, en el mismo lugar (German, 24-ago: «si hay 3 promos, que vayan
// apareciendo 3 segs por promo en el mismo lugar»).
const ROTA_MS = 3000;

export default function PromoExpressBanner() {
  const navigate = useNavigate();
  const [items, setItems]           = useState([]);
  const [i, setI]                   = useState(0);
  const [ahora, setAhora]           = useState(Date.now());
  const [abierta, setAbierta]       = useState(null);   // la promo que se está viendo
  const [ubicacion, setUbicacion]   = useState('');
  const [reclamando, setReclamando] = useState(false);
  const [reclamado, setReclamado]   = useState(null);
  const [errorMsg, setErrorMsg]     = useState('');

  const token = () => localStorage.getItem('sp_token');

  const cargar = useCallback(async () => {
    try {
      const t = token();
      const r = await fetch(`${BACKEND}/api/promos-express/escaparate`, {
        headers: t ? { Authorization: `Bearer ${t}` } : {},
      });
      const d = await r.json();
      if (d.ok) setItems(d.data || []);
    } catch { /* sin conexión: el banner no se pinta y ya */ }
  }, []);

  useEffect(() => {
    cargar();
    const poll = setInterval(cargar, 30000);
    return () => clearInterval(poll);
  }, [cargar]);

  // ROTACIÓN CONTINUA, pausada sólo mientras la hoja está abierta — si siguiera girando
  // detrás, al cerrar aparecería otra promo y se sentiría que la app hace cosas sola.
  // Un toque NO la detiene para siempre: la tarjeta captura la promo que se estaba viendo
  // (setAbierta(it)), así que aunque cambie justo al tocar, la hoja abre la correcta.
  useEffect(() => {
    if (items.length < 2 || abierta) return;
    const t = setInterval(() => setI(v => (v + 1) % items.length), ROTA_MS);
    return () => clearInterval(t);
  }, [items.length, abierta]);

  // Un solo reloj para todas las cuentas regresivas. Un setInterval por tarjeta es lo que
  // calienta el teléfono de la gente sin que nadie sepa por qué.
  useEffect(() => {
    if (!items.some(x => x.expira_at)) return;
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [items]);

  // Si la lista se encoge (una promo cerró su plazo), el índice puede quedar fuera.
  useEffect(() => { if (i >= items.length) setI(0); }, [i, items.length]);

  // Sólo las promos de PEDIDO (tipo 1) se entregan en una mesa. A una de CANCHA (tipo 2)
  // preguntarle «¿dónde estás?» es fricción justo al convertir, y el dato no se usa para nada.
  const pideUbicacion = it => it.origen === 'express' && String(it.tipo) === '1';

  async function reclamar(it) {
    if (reclamando) return;
    setReclamando(true);
    setErrorMsg('');
    try {
      const t = token();
      const url = it.origen === 'beneficio'
        ? `${BACKEND}/api/beneficios/app/reclamar/${it.id}`
        : `${BACKEND}/api/promos-express/${it.id}/reclamar`;
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) },
        body: JSON.stringify(pideUbicacion(it) ? { ubicacion } : {}),
      });
      const d = await r.json();
      if (d.ok) {
        setAbierta(null);
        if (it.origen === 'beneficio') {
          setReclamado({ beneficio: true, titulo: it.titulo });
        } else {
          setReclamado({ ...d.data, tipo: d.tipo || it.tipo || '1', titulo: it.titulo });
          // Vale igual la primera vez o si ya lo tenía (d.repetido): en los dos casos hay
          // que llevarlo a reservar, que es donde se usa el cupón.
          if (String(d.tipo || it.tipo) === '2') {
            navigate(`/reservar?${new URLSearchParams({
              promo: d.data.codigo, titulo: it.titulo,
              precio: d.precio_preferencial || it.precio_preferencial || '',
            })}`);
          }
        }
        cargar();
      } else if (d.requiere_push) {
        // No es un error del cliente: le falta un paso. Se recarga para que la promo salga
        // con su candado y su botón, en vez de dejarle un texto rojo que no dice qué hacer.
        cargar();
      } else {
        setErrorMsg(d.error || 'No se pudo reclamar la promo');
      }
    } catch {
      setErrorMsg('Error de conexión. Intenta de nuevo.');
    }
    setReclamando(false);
    setUbicacion('');
  }

  // ── Post-reclamo ────────────────────────────────────────────────────────────
  if (reclamado) {
    const esBen = reclamado.beneficio;
    return (
      <div style={{ background: 'linear-gradient(135deg,#1a2a00,#0e1a00)', border: '1px solid #96C800', borderRadius: 18, padding: 16 }}>
        <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#96C800' }}>Promo reclamada</p>
        {esBen ? (<>
          <p style={{ color: 'white', fontWeight: 900, fontSize: 18 }}>{reclamado.titulo}</p>
          <p className="text-sm mt-1" style={{ color: '#c4c4d8' }}>
            Se aplica sola en la caja cuando el cajero te identifique.
          </p>
        </>) : (<>
          <div style={{ background: 'rgba(150,200,0,.1)', border: '1px solid rgba(150,200,0,.3)', borderRadius: 12, padding: 14, textAlign: 'center', marginBottom: 10 }}>
            <p style={{ fontSize: 30, fontWeight: 900, letterSpacing: '0.15em', color: '#96C800' }}>{reclamado.codigo}</p>
            <p className="text-sm mt-1" style={{ color: '#c4c4d8' }}>
              {reclamado.tipo === '2' ? 'Úsalo al reservar tu cancha' : 'Tu pedido ya llegó a caja'}
            </p>
          </div>
          {reclamado.tipo !== '2' && (
            <button onClick={() => navigate('/pedir')}
              style={{ width: '100%', padding: 11, background: 'rgba(150,200,0,.12)', border: '1px solid rgba(150,200,0,.35)', color: '#96C800', borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
              Hacer otro pedido →
            </button>
          )}
        </>)}
      </div>
    );
  }

  if (!items.length) return null;

  const it   = items[Math.min(i, items.length - 1)];
  const segs = it.expira_at ? Math.max(0, Math.floor((new Date(it.expira_at) - ahora) / 1000)) : null;
  const mm   = segs !== null ? String(Math.floor(segs / 60)).padStart(2, '0') : null;
  const ss   = segs !== null ? String(segs % 60).padStart(2, '0') : null;
  const urge = segs !== null && segs < 120;

  return (
    <>
      {/* ── LA HOJA: aquí sí va la explicación completa ─────────────────────── */}
      {abierta && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-6"
             onClick={() => { setAbierta(null); setUbicacion(''); }}>
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <p className="text-xs font-bold uppercase tracking-wider text-sp-green mb-1">
              {abierta.origen === 'beneficio' ? 'Para ti' : 'Promo del día'}
            </p>
            <p className="text-2xl font-black text-sp-gray leading-tight">{abierta.titulo}</p>
            {abierta.descripcion && (
              <p className="text-[15px] text-gray-600 mt-2 leading-snug">{abierta.descripcion}</p>
            )}
            {/* La hora de JUGAR no es el plazo para RECLAMAR. Confundirlas es como se
                pierde una reserva, así que se dicen por separado y con todas sus letras. */}
            {abierta.hora_desde && (
              <p className="text-sm text-gray-500 mt-2 font-semibold">
                🎾 Para jugar de {String(abierta.hora_desde).slice(0, 5)} a {String(abierta.hora_hasta || '').slice(0, 5)}
              </p>
            )}
            {abierta.precio_preferencial != null && (
              <p className="text-sm text-sp-green mt-1 font-bold">
                Precio de la promo: ${Math.round(Number(abierta.precio_preferencial))}
              </p>
            )}

            {abierta.bloqueada ? (
              <div className="mt-4">
                <PrenderAvisos compacto motivo={`Préndelas y reclama: ${abierta.titulo}.`} />
              </div>
            ) : !abierta.reclamable ? (
              <p className="text-sm text-gray-500 mt-4 font-semibold">
                Ya cerró el plazo de esta promo. Prende las notificaciones y te avisamos la próxima.
              </p>
            ) : (<>
              {/* Sólo las promos de PEDIDO se entregan en una mesa. Preguntarle "¿dónde
                  estás?" a quien va a rentar cancha es fricción justo al convertir, y el
                  dato no se usa para nada. */}
              {pideUbicacion(abierta) && (<>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mt-4 mb-2">¿Dónde estás?</p>
                <div className="grid grid-cols-2 gap-2">
                  {UBICACIONES.map(u => (
                    <button key={u} onClick={() => setUbicacion(u)}
                      className={`py-2.5 px-2 rounded-xl text-sm font-bold transition-colors ${
                        ubicacion === u ? 'bg-sp-green text-white' : 'bg-gray-100 text-gray-500'}`}>
                      {u}
                    </button>
                  ))}
                </div>
              </>)}
              <button
                onClick={() => reclamar(abierta)}
                disabled={reclamando || (pideUbicacion(abierta) && !ubicacion)}
                className={`w-full mt-4 py-3.5 rounded-xl font-black text-[15px] ${
                  (!pideUbicacion(abierta) || ubicacion) ? 'bg-sp-green text-white' : 'bg-gray-100 text-gray-300'}`}>
                {reclamando ? 'Procesando…'
                  : (pideUbicacion(abierta) && !ubicacion) ? 'Selecciona ubicación'
                  : (abierta.cta || 'Reclamar')}
              </button>
            </>)}
            {errorMsg && <p className="text-sm font-semibold text-center mt-2 text-red-500">{errorMsg}</p>}
            <button onClick={() => { setAbierta(null); setUbicacion(''); }}
              className="w-full mt-2 py-3 rounded-xl bg-gray-100 text-gray-500 font-bold text-sm">
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* ── LA TARJETA: título grande y nada más ────────────────────────────── */}
      <button
        onClick={() => setAbierta(it)}
        style={{
          width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
          background: 'linear-gradient(135deg,#1a2a00,#0e1a00)',
          border: `1px solid rgba(150,200,0,${it.reclamable ? '.5' : '.22'})`,
          borderRadius: 18, padding: '16px 18px',
        }}
        className="active:scale-[0.99] transition-transform"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#96C800' }}>
            {it.origen === 'beneficio' ? '🎁 Para ti' : '⚡ Promo del día'}
          </p>
          {segs !== null && (
            <p style={{ fontSize: 15, fontWeight: 900, color: urge ? '#f97316' : '#96C800', fontVariantNumeric: 'tabular-nums' }}>
              {mm}:{ss}
            </p>
          )}
        </div>

        <p style={{ color: 'white', fontWeight: 900, fontSize: 23, lineHeight: 1.12, marginTop: 6, textWrap: 'balance' }}>
          {it.titulo}
        </p>

        {/* Una sola línea, y sólo cuando dice algo que el título no. */}
        <p className="text-[13px] font-bold mt-2" style={{ color: it.bloqueada ? '#fbbf24' : '#96C800' }}>
          {it.bloqueada ? '🔔 Prende tus notificaciones'
            : it.reclamable ? 'Ver promo →'
            : 'Ya cerró · ver detalle'}
        </p>

        {/* Puntos: sin esto nadie sabe que hay más de una promo esperando. */}
        {items.length > 1 && (
          <div className="flex gap-1.5 mt-3">
            {items.map((_, n) => (
              <span key={n} style={{
                width: n === i ? 16 : 5, height: 5, borderRadius: 99,
                background: n === i ? '#96C800' : 'rgba(255,255,255,.25)',
                transition: 'width .3s',
              }} />
            ))}
          </div>
        )}
      </button>
    </>
  );
}
