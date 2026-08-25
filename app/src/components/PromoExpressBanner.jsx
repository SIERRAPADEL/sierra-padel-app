import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BACKEND, UBICACIONES } from '../lib/constants';
import PrenderAvisos from './PrenderAvisos';

/**
 * EL ESCAPARATE — las promociones del día, arriba en Home.
 *
 * German (24-ago-2026), en tres pasos que cambiaron el diseño:
 *   1. «necesito que sí hagamos un banner con las promociones del día en la app, bien
 *      ubicada para que no estorbe pero la gente las vea; la parte superior abajo del
 *      nombre como está plantada la promo de la primera renta x $200 es un buen lugar»
 *   2. «funciona para los que no tienen las notificaciones prendidas, y ese puede ser un
 *      gancho: reclámala siempre y cuando prendas las notificaciones»
 *   3. «y que TODO TIPO de promociones puedan ser anunciadas en ese espacio, no quiero que
 *      pongamos una promo express y no se pueda poner ahí por algún detalle»
 *
 * 🔴 LO QUE ESTABA MAL. Este componente mostraba UNA promo express y sólo mientras corría
 * su ventana de 90 minutos (`/activa`). El resto del día el banner no existía: quien no
 * recibió el push nunca se enteraba de que hubo promo — y ese es justo el público que
 * importa (70 de 131 clientes con cuenta tienen notificaciones). Y una cortesía cargada por
 * el motor de descuentos no cabía aquí "por un detalle": vivía en otra tabla.
 *
 * 🔑 AHORA pinta lo que le dé `/escaparate`, sin saber de dónde salió cada cosa. Fuente
 * nueva = se agrega en el backend y aparece sola.
 *
 * 🔔 EL GANCHO. Sin notificaciones las promos se VEN pero salen con candado, y debajo va el
 * botón para prenderlas. Esconderlas haría que nunca supiera que existen, y entonces no
 * incentivan nada — que es justo para lo que se pusieron.
 */
export default function PromoExpressBanner() {
  const navigate = useNavigate();
  const [items, setItems]             = useState([]);
  const [tienePush, setTienePush]     = useState(true);
  const [ahora, setAhora]             = useState(Date.now());
  const [reclamado, setReclamado]     = useState(null);
  const [reclamando, setReclamando]   = useState('');
  const [confirmando, setConfirmando] = useState(null);   // el item que se está confirmando
  const [ubicacion, setUbicacion]     = useState('');
  const [errorMsg, setErrorMsg]       = useState('');

  const token = () => localStorage.getItem('sp_token');

  const cargar = useCallback(async () => {
    try {
      const t = token();
      const r = await fetch(`${BACKEND}/api/promos-express/escaparate`, {
        headers: t ? { Authorization: `Bearer ${t}` } : {},
      });
      const d = await r.json();
      if (d.ok) { setItems(d.data || []); setTienePush(d.tiene_push !== false); }
    } catch { /* sin conexión: el banner simplemente no se pinta */ }
  }, []);

  useEffect(() => {
    cargar();
    const poll = setInterval(cargar, 30000);
    return () => clearInterval(poll);
  }, [cargar]);

  // Un solo reloj para todas las cuentas regresivas: un setInterval por tarjeta es lo que
  // calienta el teléfono de la gente sin que nadie sepa por qué.
  useEffect(() => {
    if (!items.some(i => i.expira_at)) return;
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [items]);

  const esDeCancha = it => it.origen === 'express' && String(it.tipo) === '2';

  async function reclamar(it) {
    if (reclamando) return;
    setReclamando(it.id);
    setErrorMsg('');
    setConfirmando(null);
    try {
      const t = token();
      const url = it.origen === 'beneficio'
        ? `${BACKEND}/api/beneficios/app/reclamar/${it.id}`
        : `${BACKEND}/api/promos-express/${it.id}/reclamar`;
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) },
        body: JSON.stringify(esDeCancha(it) || it.origen === 'beneficio' ? {} : { ubicacion }),
      });
      const d = await r.json();
      if (d.ok) {
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
        // No es un error del cliente: le falta un paso. Se recarga para que el candado
        // aparezca con su botón en vez de dejarle un texto rojo que no le dice qué hacer.
        setTienePush(false);
        cargar();
      } else {
        setErrorMsg(d.error || 'No se pudo reclamar la promo');
      }
    } catch {
      setErrorMsg('Error de conexión. Intenta de nuevo.');
    }
    setReclamando('');
    setUbicacion('');
  }

  // ── Post-reclamo (promo express con código) ─────────────────────────────────
  if (reclamado && !reclamado.beneficio) {
    const tipo = reclamado.tipo;
    return (
      <div style={{ background: 'linear-gradient(135deg,#1a2a00,#0e1a00)', border: '1px solid #96C800', borderRadius: 16, padding: 16 }}>
        <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#96C800' }}>Promo reclamada</p>
        <div style={{ background: 'rgba(150,200,0,.1)', border: '1px solid rgba(150,200,0,.3)', borderRadius: 12, padding: 14, textAlign: 'center', marginBottom: 10 }}>
          <p style={{ fontSize: 30, fontWeight: 900, letterSpacing: '0.15em', color: '#96C800' }}>{reclamado.codigo}</p>
          <p className="text-sm mt-1" style={{ color: '#c4c4d8' }}>
            {tipo === '2' ? 'Usa este código al reservar tu cancha o clase' : 'Tu pedido ya llegó a caja'}
          </p>
        </div>
        <div style={{ background: 'rgba(255,255,255,.06)', borderRadius: 10, padding: '8px 12px' }}>
          <p className="text-sm" style={{ color: '#c4c4d8' }}>
            🎯 <strong style={{ color: 'white' }}>{reclamado.titulo}</strong>
          </p>
        </div>
        {tipo !== '2' && (
          <button
            onClick={() => navigate('/pedir')}
            style={{ width: '100%', marginTop: 10, padding: 11, background: 'rgba(150,200,0,.12)', border: '1px solid rgba(150,200,0,.35)', color: '#96C800', borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Hacer otro pedido →
          </button>
        )}
      </div>
    );
  }

  if (reclamado && reclamado.beneficio) {
    return (
      <div style={{ background: 'linear-gradient(135deg,#1a2a00,#0e1a00)', border: '1px solid #96C800', borderRadius: 16, padding: 16 }}>
        <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#96C800' }}>Promo reclamada</p>
        <p style={{ color: 'white', fontWeight: 900, fontSize: 16 }}>{reclamado.titulo}</p>
        <p className="text-sm mt-1" style={{ color: '#c4c4d8' }}>
          Se aplica sola en la caja cuando el cajero te identifique.
        </p>
      </div>
    );
  }

  if (!items.length) return null;

  const hayBloqueadas = items.some(i => i.bloqueada);

  return (
    <>
      {/* Confirmación: sólo la piden las promos de PEDIDO (tipo 1), que se entregan en una
          mesa. A quien va a rentar cancha preguntarle "¿mesa o barra?" es fricción justo en
          el momento de convertir, y encima el dato no se usa para nada. */}
      {confirmando && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-6" onClick={() => { setConfirmando(null); setUbicacion(''); }}>
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm flex flex-col" onClick={e => e.stopPropagation()}>
            <p className="text-xs font-bold uppercase tracking-wider text-sp-green mb-1">Confirmar promo</p>
            <p className="text-lg font-black text-sp-gray">{confirmando.titulo}</p>
            <p className="text-sm text-gray-500 mb-4">{confirmando.descripcion}</p>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">¿Dónde estás?</p>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {UBICACIONES.map(u => (
                <button key={u} onClick={() => setUbicacion(u)}
                  className={`py-2.5 px-2 rounded-xl text-sm font-bold transition-colors ${
                    ubicacion === u ? 'bg-sp-green text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {u}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setConfirmando(null); setUbicacion(''); }}
                className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-500 font-bold text-sm">
                Cancelar
              </button>
              <button onClick={() => reclamar(confirmando)} disabled={!ubicacion}
                className={`flex-[2] py-3 rounded-xl font-bold text-sm ${
                  ubicacion ? 'bg-sp-green text-white' : 'bg-gray-100 text-gray-300'}`}>
                {ubicacion ? 'Confirmar y reclamar ✓' : 'Selecciona ubicación'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {items.map(it => {
          const segs = it.expira_at
            ? Math.max(0, Math.floor((new Date(it.expira_at) - ahora) / 1000)) : null;
          const mm = segs !== null ? String(Math.floor(segs / 60)).padStart(2, '0') : null;
          const ss = segs !== null ? String(segs % 60).padStart(2, '0') : null;
          const urge = segs !== null && segs < 120;
          return (
            <div key={`${it.origen}:${it.id}`}
                 style={{ background: 'linear-gradient(135deg,#1a2a00,#0e1a00)',
                          border: `1px solid rgba(150,200,0,${it.reclamable ? '.5' : '.22'})`,
                          borderRadius: 16, padding: 16 }}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#96C800' }}>
                    {it.origen === 'beneficio' ? '🎁 Para ti' : '⚡ Promo del día'}
                  </p>
                  <p className="font-black leading-snug" style={{ color: 'white', fontSize: 16 }}>{it.titulo}</p>
                  {it.descripcion && <p className="text-sm mt-0.5" style={{ color: '#c4c4d8' }}>{it.descripcion}</p>}
                  {/* La hora en que SE USA la cancha no es la misma que el plazo para
                      reclamar el cupón. Confundirlas es como se pierde una reserva. */}
                  {it.hora_desde && (
                    <p className="text-xs mt-1 font-semibold" style={{ color: '#8a8aa0' }}>
                      Para jugar de {String(it.hora_desde).slice(0, 5)} a {String(it.hora_hasta || '').slice(0, 5)}
                    </p>
                  )}
                </div>
                {segs !== null && (
                  <div className="text-right ml-3 flex-shrink-0">
                    <p style={{ fontSize: 26, fontWeight: 900, color: urge ? '#f97316' : '#96C800', fontVariantNumeric: 'tabular-nums' }}>{mm}:{ss}</p>
                    <p className="text-xs font-bold" style={{ color: '#8a8aa0' }}>para reclamar</p>
                  </div>
                )}
              </div>

              {it.bloqueada ? (
                <div style={{ background: 'rgba(245,158,11,.12)', border: '1px solid rgba(245,158,11,.35)', borderRadius: 10, padding: '9px 12px' }}>
                  <p className="text-sm font-bold" style={{ color: '#fbbf24' }}>🔔 {it.motivo_bloqueo}</p>
                </div>
              ) : it.reclamable ? (
                <button
                  onClick={() => (it.origen === 'express' && String(it.tipo) === '1'
                    ? setConfirmando(it) : reclamar(it))}
                  disabled={reclamando === it.id}
                  style={{ width: '100%', padding: 12, background: '#96C800', color: '#0a1a00', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {reclamando === it.id ? 'Procesando…' : (it.cta || 'Reclamar')}
                </button>
              ) : (
                // Su plazo cerró. Se sigue mostrando para que se vea que el club mueve
                // promos y vale la pena volver, pero sin un botón que iba a fallar.
                <p className="text-sm font-semibold" style={{ color: '#8a8aa0' }}>
                  Ya cerró el plazo de esta. Prende las notificaciones y te avisamos la próxima.
                </p>
              )}
            </div>
          );
        })}

        {/* Un solo botón de notificaciones para todo el escaparate: repetirlo por tarjeta
            sería tres veces la misma petición y se lee como insistencia. */}
        {(hayBloqueadas || (!tienePush && items.some(i => !i.reclamable))) && (
          <PrenderAvisos compacto motivo="Préndelas y reclama las promos del día en cuanto salgan." />
        )}
        {errorMsg && <p className="text-sm font-semibold text-center" style={{ color: '#ef4444' }}>{errorMsg}</p>}
      </div>
    </>
  );
}
