import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { t, locale } from '../i18n';
import NotaPesos from '../components/NotaPesos';

// ── Mis Reservas ─────────────────────────────────────────────────────────────

function fmtFecha(iso) {
  if (!iso) return '';
  return new Date(iso + 'T12:00').toLocaleDateString(locale(), {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

// Pinta un texto traducido que lleva un nodo JSX en medio ({llave} → nodo), para que el
// orden de las palabras lo decida la traducción y no el código.
function conNodo(texto, llave, nodo) {
  const [a, b = ''] = String(texto).split(`{${llave}}`);
  return <>{a}{nodo}{b}</>;
}

function EstadoPill({ estado, source }) {
  if (source === 'pre' || estado === 'pendiente') {
    return <span className="text-xs font-bold px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">{t('Pendiente')}</span>;
  }
  if (estado === 'confirmada') {
    return <span className="text-xs font-bold px-2 py-0.5 bg-green-100 text-green-700 rounded-full">{t('Confirmada')}</span>;
  }
  if (estado === 'cancelada') {
    return <span className="text-xs font-bold px-2 py-0.5 bg-red-100 text-red-400 rounded-full">{t('Cancelada')}</span>;
  }
  if (estado === 'no-show') {
    return <span className="text-xs font-bold px-2 py-0.5 bg-gray-100 text-gray-400 rounded-full">{t('No-show')}</span>;
  }
  return <span className="text-xs font-bold px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">{estado}</span>;
}

// Comparte el link de la reta por WhatsApp (o el share nativo del teléfono).
function invitarReta(r) {
  const link  = `${window.location.origin}/unirse/${r.join_token}`;
  const texto = t('🎾 ¡Únete a mi reta en Sierra Padel!\n📅 {fecha} · {hora} hrs · Cancha {cancha}\nApúntate aquí: {link}', {
    fecha: fmtFecha(r.fecha), hora: String(r.hora_inicio || '').slice(0, 5), cancha: r.cancha, link,
  });
  if (navigator.share) {
    navigator.share({ text: texto }).catch(() => {});
  } else {
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
  }
}

// Roster de la reta dentro de la tarjeta de una renta confirmada.
function RosterReta({ r, onInvitar }) {
  const cupo = r.cupo || 4;
  const jugadores = r.jugadores || [];
  const libres = Math.max(0, cupo - jugadores.length);
  return (
    <div className="mt-3 pt-3 border-t border-gray-50">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
          {t('Jugadores {n}/{cupo}', { n: jugadores.length, cupo })}
        </p>
        {r.join_token && libres > 0 && (
          <button
            onClick={onInvitar}
            className="text-[13px] font-bold text-white bg-[#25D366] px-3 py-1.5 rounded-full active:scale-95 transition-transform"
          >
            {t('Invitar por WhatsApp')}
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {jugadores.map((j, i) => (
          <span
            key={i}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
              j.yo ? 'bg-sp-green text-white' : 'bg-sp-green-light text-sp-green-dark'
            }`}
          >
            {j.yo ? t('Tú') : String(j.nombre || t('Jugador')).split(' ')[0]}
          </span>
        ))}
        {Array.from({ length: libres }).map((_, i) => (
          <span key={`l-${i}`} className="px-2.5 py-1 border border-dashed border-gray-300 text-gray-300 rounded-full text-xs">
            {t('Libre')}
          </span>
        ))}
      </div>
      {libres > 0 && (
        <p className="text-xs text-gray-400 mt-1.5">
          {t('Ya estás apuntado. Invita a los que faltan: check-in más rápido y cada quien su cuenta.')}
        </p>
      )}
    </div>
  );
}

// Controles de la reta en la tarjeta de una renta confirmada: anunciarla en el
// feed (de mi nivel o abierta a todos) para que el sistema ayude a llenarla,
// o dejar de anunciarla. El estado viene en r.reta desde mis-reservas.
function RetaControls({ r, apiFetch, onChanged, setMsg }) {
  const [eligiendo, setEligiendo] = useState(false);
  const [busy, setBusy] = useState(false);

  async function abrir(nivel) {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    const d = await apiFetch(`/reta/reserva-propia/${r.id}/abrir`, {
      method: 'POST',
      body: JSON.stringify({ nivel }),
    });
    setBusy(false);
    setEligiendo(false);
    if (d.ok) {
      setMsg({ ok: true, text: t('📣 Tu reta quedó anunciada. Avisamos a los jugadores compatibles.') });
      onChanged();
    } else {
      setMsg({ ok: false, text: d.error || t('No se pudo anunciar la reta.') });
    }
  }

  async function cerrar() {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    const d = await apiFetch(`/reta/reserva-propia/${r.id}/cerrar`, { method: 'POST' });
    setBusy(false);
    if (d.ok) { setMsg({ ok: true, text: t('Tu reta ya no se anuncia.') }); onChanged(); }
    else setMsg({ ok: false, text: d.error || t('No se pudo. Intenta de nuevo.') });
  }

  if (r.reta?.estado === 'completa') {
    return (
      <div className="mt-2 bg-sp-green-light rounded-xl px-3 py-2">
        <p className="text-xs text-sp-green-dark font-bold">{t('✅ ¡Reta completa! Nos vemos en la cancha.')}</p>
      </div>
    );
  }

  if (r.reta?.estado === 'abierta') {
    return (
      <div className="mt-2 flex items-center justify-between gap-2 bg-sp-green-light rounded-xl px-3 py-2">
        <p className="text-xs text-sp-green-dark font-bold">
          {t('📣 Anunciada en retas · {a_quien}', { a_quien: r.reta.nivel_objetivo ? `${r.reta.nivel_objetivo} (±1)` : t('abierta a todos') })}
        </p>
        <button onClick={cerrar} disabled={busy} className="text-xs text-gray-400 underline flex-shrink-0">
          {busy ? '…' : t('Dejar de anunciar')}
        </button>
      </div>
    );
  }

  if (eligiendo) {
    return (
      <div className="mt-2 flex flex-col gap-2">
        <p className="text-xs text-gray-400 font-semibold">{t('¿A quién avisamos?')}</p>
        <div className="flex gap-2">
          <button
            onClick={() => abrir('mi')}
            disabled={busy}
            className="flex-1 py-2 rounded-xl text-xs font-bold bg-sp-green text-white disabled:opacity-50"
          >
            {t('🎯 De mi nivel (±1)')}
          </button>
          <button
            onClick={() => abrir('todos')}
            disabled={busy}
            className="flex-1 py-2 rounded-xl text-xs font-bold bg-white text-sp-gray border border-gray-200 disabled:opacity-50"
          >
            {t('🌎 Abierta a todos')}
          </button>
          <button onClick={() => setEligiendo(false)} className="px-2 text-xs text-gray-400">✕</button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEligiendo(true)}
      className="mt-2 w-full py-2 rounded-xl text-xs font-bold bg-sp-gray text-white active:scale-[0.98] transition-transform"
    >
      {t('📣 Buscar jugadores (anunciar reta)')}
    </button>
  );
}

function MisReservas({ apiFetch }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('proximas'); // 'proximas' | 'historial'
  const [cancelando, setCancelando] = useState(null);   // id en confirmación de cancelar
  const [cancelMsg, setCancelMsg] = useState(null);     // { ok, text }
  const [cancelBusy, setCancelBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch('/reservas/mis-reservas').then(d => {
      if (d.ok) setData(d.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [apiFetch]);

  useEffect(() => { load(); }, [load]);

  async function cancelar(r) {
    if (cancelBusy) return;
    setCancelBusy(true);
    setCancelMsg(null);
    const path = r._source === 'pre'
      ? `/reservas/solicitud/${r.id}/cancelar`
      : `/reservas/reserva/${r.id}/cancelar`;
    const d = await apiFetch(path, { method: 'POST' });
    setCancelBusy(false);
    setCancelando(null);
    if (d.ok) {
      setCancelMsg({ ok: true, text: r._source === 'pre' ? t('Solicitud cancelada.') : t('Reserva cancelada.') });
      load();
    } else {
      setCancelMsg({ ok: false, text: d.error || t('No se pudo cancelar. Intenta de nuevo.') });
    }
  }

  const proximas = [
    ...(data?.pendientes || []),
    ...(data?.confirmadas || []),
  ].sort((a, b) => {
    if (a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1;
    return (a.hora_inicio || '') < (b.hora_inicio || '') ? -1 : 1;
  });

  const historial = data?.historial || [];

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-sp-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Tabs */}
      <div className="flex gap-1">
        {[['proximas', t('Proximas')], ['historial', t('Historial')]].map(([v, label]) => (
          <button
            key={v}
            onClick={() => setTab(v)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              tab === v ? 'bg-sp-green text-white' : 'bg-white text-sp-gray border border-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {cancelMsg && (
        <p className={`text-sm text-center font-medium ${cancelMsg.ok ? 'text-sp-green' : 'text-red-500'}`}>
          {cancelMsg.text}
        </p>
      )}

      {tab === 'proximas' && (
        <>
          {proximas.length === 0 && (
            <div className="card text-center py-12">
              <p className="text-3xl mb-3">🎾</p>
              <p className="text-gray-500 font-medium">{t('Sin reservas proximas')}</p>
              <p className="text-gray-400 text-sm mt-1">{t('Haz tu primera solicitud arriba')}</p>
            </div>
          )}
          {proximas.map(r => {
            const esRentaConf = r._source === 'reservacion' && r.tipo === 'renta' && r.estado === 'confirmada';
            const cancelable  = r._source === 'pre' || r.estado === 'confirmada';
            return (
              <div key={`${r._source}-${r.id}`} className="card">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-black text-sp-gray">
                      {r.tipo === 'renta' ? t('Cancha {n}', { n: r.cancha }) :
                       r.tipo === 'clase' ? t('Clase con {coach}', { coach: r.instructor }) : r.tipo}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5 capitalize">
                      {fmtFecha(r.fecha)} · {String(r.hora_inicio || '').slice(0, 5)}
                      {r.duracion_minutos ? ` · ${r.duracion_minutos} min` : ''}
                    </p>
                  </div>
                  <EstadoPill estado={r.estado} source={r._source} />
                </div>

                {r._source === 'pre' && (
                  <p className="text-xs text-yellow-600 mt-2 bg-yellow-50 rounded-lg px-3 py-1.5">
                    {t('⏳ Esperando confirmacion del club')}
                  </p>
                )}

                {/* Roster + invitar (solo rentas confirmadas) */}
                {esRentaConf && <RosterReta r={r} onInvitar={() => invitarReta(r)} />}
                {esRentaConf && (r.reta || (r.jugadores?.length || 0) < (r.cupo || 4)) && (
                  <RetaControls r={r} apiFetch={apiFetch} onChanged={load} setMsg={setCancelMsg} />
                )}

                {/* Cancelar (dos taps) */}
                {cancelable && (
                  <div className="mt-3">
                    {cancelando === `${r._source}-${r.id}` ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => cancelar(r)}
                          disabled={cancelBusy}
                          className="flex-1 py-2 rounded-xl text-xs font-bold bg-red-50 text-red-500 border border-red-200"
                        >
                          {cancelBusy ? t('Cancelando…') : t('Si, cancelar')}
                        </button>
                        <button
                          onClick={() => setCancelando(null)}
                          className="flex-1 py-2 rounded-xl text-xs font-bold bg-gray-50 text-gray-500 border border-gray-200"
                        >
                          {t('No, conservar')}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setCancelando(`${r._source}-${r.id}`); setCancelMsg(null); }}
                        className="text-xs text-gray-400 underline"
                      >
                        {r._source === 'pre' ? t('Cancelar solicitud') : t('Cancelar reserva')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <p className="text-xs text-gray-400 text-center px-4">
            {t('Las reservas confirmadas se pueden cancelar hasta 4 horas antes. Con menos tiempo, escríbenos por WhatsApp.')}
          </p>
        </>
      )}

      {tab === 'historial' && (
        <>
          {historial.length === 0 && (
            <div className="card text-center py-10">
              <p className="text-gray-400 text-sm">{t('Sin historial de reservas')}</p>
            </div>
          )}
          {historial.map(r => (
            <div key={r.id} className="card opacity-80">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-sp-gray">
                    {r.tipo === 'renta' ? t('Cancha {n}', { n: r.cancha }) :
                     r.tipo === 'clase' ? t('Clase con {coach}', { coach: r.instructor }) : r.tipo}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 capitalize">
                    {fmtFecha(r.fecha)} · {String(r.hora_inicio || '').slice(0, 5)}
                  </p>
                </div>
                <EstadoPill estado={r.estado} source={r._source} />
              </div>
            </div>
          ))}
        </>
      )}

      <button
        onClick={load}
        className="text-sp-green text-sm font-semibold text-center py-2"
      >
        {t('Actualizar')}
      </button>
    </div>
  );
}

// ── Constantes del formulario ─────────────────────────────────────────────────

// Cada 30 min (07:00 → 22:00); el backend confirma disponibilidad real por media hora.
const HORARIOS = [];
for (let m = 7 * 60; m <= 22 * 60; m += 30) {
  HORARIOS.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
}

// HOY EN EL CLUB, no en Londres. German (19-ago): "el calendario te está mostrando el día 20
// de entrada... en lugar de mostrar el 19".
// 🔑 `toISOString()` devuelve UTC. Monclova va 6 horas atrás, así que TODOS LOS DÍAS a partir
// de las 6 de la tarde el calendario abría en MAÑANA: el cliente entraba a reservar y veía el
// día equivocado. Justo la hora en que la gente reserva.
// Se usa la zona del club y no la del celular a propósito: quien reserva desde fuera de
// Monclova —de viaje, o con el teléfono en otra zona— tiene que ver el día del CLUB.
function hoyISO() {
  // 'en-CA' da exactamente AAAA-MM-DD, que es lo que espera un <input type="date">.
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Monterrey' });
}

// Hoy si es martes y aún no dan las 8:30 pm en el club; si no, el martes que sigue.
function proximoMartes() {
  const hoy = hoyISO();
  const d = new Date(`${hoy}T12:00:00Z`);
  const ahora = new Date().toLocaleTimeString('en-GB', { timeZone: 'America/Monterrey', hour12: false }).slice(0, 5);
  let faltan = (2 - d.getUTCDay() + 7) % 7;
  if (faltan === 0 && ahora >= '20:30') faltan = 7;
  d.setUTCDate(d.getUTCDate() + faltan);
  // d ya es la fecha del club a mediodía; sólo se le suman días.
  return d.toLocaleDateString('en-CA', { timeZone: 'UTC' });
}

function formatDate(iso) {
  return new Date(iso + 'T12:00').toLocaleDateString(locale(), {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

export default function Reservar() {
  const { apiFetch } = useApi();
  const location = useLocation();

  // Leer promo express desde URL params (tipo 2)
  const urlParams      = new URLSearchParams(location.search);
  const promoCodigo    = urlParams.get('promo') || null;
  const promoTitulo    = urlParams.get('titulo') || null;
  const promoPrecio    = urlParams.get('precio') ? parseFloat(urlParams.get('precio')) : null;
  const tienePromo     = !!promoCodigo;
  // 🎂 2x1 de cumpleaños (German 25-sep): se reservan LAS DOS canchas en una sola jugada.
  const cumpleCodigo   = urlParams.get('cumple') || null;
  const cumpleDesde    = urlParams.get('desde') || '';
  const cumpleHasta    = urlParams.get('hasta') || '';
  const esCumple       = !!cumpleCodigo;
  // 🎾 Link directo del Martes de Todo o Nada (German 19-oct): ?todo-o-nada abre el próximo
  // martes a las 8:30 pm. La promo la aplica sola la caja; aquí no se manda ningún código.
  const esTodoONada    = urlParams.has('todo-o-nada') && !esCumple && !tienePromo;

  // Puede venir a "Mis reservas" desde Mi cuenta (state) o desde un push (?tab=mis)
  const [mainTab, setMainTab] = useState(
    (location.state?.tab === 'mis' || urlParams.get('tab') === 'mis') ? 'mis' : 'nueva'
  );
  const [tipo, setTipo] = useState('cancha'); // 'cancha' | 'clase'

  // --- Cancha ---
  const [fecha, setFecha]             = useState(
    esTodoONada ? proximoMartes() : (esCumple && cumpleDesde > hoyISO() ? cumpleDesde : hoyISO())
  );
  const [canchas2, setCanchas2]       = useState([]);     // 2x1: las dos canchas elegidas
  const [hora, setHora]               = useState(esTodoONada ? '20:30' : null);
  const [horasDisp, setHorasDisp]     = useState(null);   // [{hora, libres}] del backend
  const [canchasDisp, setCanchasDisp] = useState(null);
  const [loadingCanchas, setLoadingCanchas] = useState(false);
  const [cancha, setCancha]           = useState(null);
  const [tarifa, setTarifa]           = useState(null);   // { precio, tipo } estimado

  // --- Clase ---
  const [fechaClase, setFechaClase]   = useState(hoyISO());
  const [coaches, setCoaches]         = useState(null);
  const [loadingCoaches, setLoadingCoaches] = useState(false);
  const [coachSel, setCoachSel]       = useState(null);
  const [horaSel, setHoraSel]         = useState(null);

  // --- Shared ---
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [done, setDone]       = useState(null);

  // Promo de bienvenida: primera renta $200 (el servidor decide si aplica)
  const [primera, setPrimera] = useState(null); // { elegible, precio }
  // Ella escoge si la usa (German 25-sep): guardarla le deja la 1ª cancha a precio normal,
  // que es lo que pide el 2x1 de cumpleaños.
  const [usarPrimera, setUsarPrimera] = useState(true);
  useEffect(() => {
    apiFetch('/reservas/primera-renta')
      .then(d => { if (d?.ok) setPrimera(d); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Horas con disponibilidad (oculta pasadas si es hoy, marca llenas)
  useEffect(() => {
    if (!fecha) { setHorasDisp(null); return; }
    setHorasDisp(null);
    apiFetch(`/reservas/horas-disponibles?fecha=${fecha}`)
      .then(d => setHorasDisp(d.ok ? d.horas : null))
      .catch(() => setHorasDisp(null));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha]);

  // Fetch canchas disponibles cuando se elige fecha + hora
  useEffect(() => {
    if (!fecha || !hora) { setCanchasDisp(null); return; }
    setLoadingCanchas(true);
    setCancha(null);
    setCanchas2([]);
    apiFetch(`/reservas/canchas-disponibles?fecha=${fecha}&hora=${hora}`)
      .then(d => setCanchasDisp(d.ok ? d.canchas : []))
      .catch(() => setCanchasDisp([]))
      .finally(() => setLoadingCanchas(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha, hora]);

  // Precio estimado al tener cancha + hora (misma tarifa que usa la caja)
  useEffect(() => {
    if (!cancha || !hora) { setTarifa(null); return; }
    apiFetch(`/reservas/tarifa?hora=${hora}&cancha=${cancha}`)
      .then(d => setTarifa(d.ok ? d.data : null))
      .catch(() => setTarifa(null));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cancha, hora]);

  // Fetch coaches disponibles cuando cambia la fecha (tab clase)
  useEffect(() => {
    if (tipo !== 'clase') return;
    setLoadingCoaches(true);
    setCoaches(null);
    setCoachSel(null);
    setHoraSel(null);
    apiFetch(`/reservas/coaches-disponibles?fecha=${fechaClase}`)
      .then(d => setCoaches(d.ok ? d.coaches : []))
      .catch(() => setCoaches([]))
      .finally(() => setLoadingCoaches(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaClase, tipo]);

  function switchTipo(t) { setTipo(t); setError(''); setDone(null); }

  function elegirCancha(c) {
    if (!esCumple) { setCancha(c); return; }
    setCanchas2(prev => {
      const sig = prev.includes(c) ? prev.filter(x => x !== c) : (prev.length >= 2 ? [prev[1], c] : [...prev, c]);
      setCancha(sig[0] || null);   // la tarifa que se muestra es la de la cancha que se paga
      return sig;
    });
  }

  async function handleConfirmar() {
    setLoading(true);
    setError('');
    if (esCumple && tipo === 'cancha') {
      const d = await apiFetch('/reservas/solicitar-2x1', {
        method: 'POST',
        body: JSON.stringify({ fecha, hora, canchas: canchas2, promo_codigo: cumpleCodigo }),
      });
      setLoading(false);
      if (d.ok) {
        setDone({ fecha, hora, detalle: t('Canchas {a} y {b} · la cancha {b} va por la casa 🎂', { a: canchas2[0], b: canchas2[1] }),
          promo: null, primera: null });
      } else setError(d.error || t('No se pudo enviar la solicitud'));
      return;
    }
    const body = tipo === 'cancha'
      ? { fecha, hora, tipo: 'renta', cancha }
      : { fecha: fechaClase, hora: horaSel, tipo: 'clase', instructor: coachSel };

    if (tipo === 'cancha' && !tienePromo && primera?.elegible && !usarPrimera) body.sin_primera = true;

    // Adjuntar código de promo express si viene de tipo 2
    if (tienePromo) {
      body.promo_codigo = promoCodigo;
      if (promoPrecio) body.promo_precio = promoPrecio;
    }

    const data = await apiFetch('/reservas/solicitar', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    setLoading(false);
    if (data.ok) {
      const esPrimera = data.data?.promo_codigo === 'PRIMERA200';
      const boteInfo = primera?.bote || null;
      if (esPrimera) setPrimera({ elegible: false }); // ya quedó apartada su promo
      setDone({
        fecha:   tipo === 'cancha' ? fecha      : fechaClase,
        hora:    tipo === 'cancha' ? hora       : horaSel,
        detalle: tipo === 'cancha' ? t('Cancha {n}', { n: cancha }) : t('Clase con {coach}', { coach: coachSel }),
        promo:   tienePromo ? { codigo: promoCodigo, precio: promoPrecio, titulo: promoTitulo } : null,
        primera: esPrimera ? { precio: Number(data.data.promo_precio) || 200, bote: boteInfo } : null,
      });
    } else {
      setError(data.error || t('No se pudo enviar la solicitud'));
    }
  }

  function reset() {
    setDone(null); setHora(null); setCanchasDisp(null);
    setCancha(null); setCoachSel(null); setHoraSel(null); setError('');
    setTarifa(null);
  }

  const puedeConfirmarCancha = hora && fecha && (esCumple ? canchas2.length === 2 : cancha);
  const puedeConfirmarClase  = coachSel && horaSel && fechaClase;

  // Grid de horas: usa la disponibilidad del backend; si no cargó, el grid fijo de siempre.
  const gridHoras = horasDisp
    ? horasDisp
    : HORARIOS.map(h => ({ hora: h, libres: null }));

  // ─── Pantalla de exito ────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="page safe-bottom flex flex-col items-center justify-center px-6 gap-5">
        <div className="w-20 h-20 rounded-full bg-sp-green-light flex items-center justify-center">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style={{ stroke: 'var(--sp-green)' }} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-xl font-black text-sp-gray">{t('Solicitud enviada')}</p>
          <p className="text-gray-500 mt-1 text-sm font-medium">{done.detalle}</p>
          <p className="text-gray-400 text-sm capitalize">{formatDate(done.fecha)} · {done.hora}</p>
        </div>
        <div className="bg-sp-green-light rounded-2xl px-5 py-4 text-center w-full max-w-xs">
          <p className="text-sp-green-dark text-sm font-medium">
            {t('Tu solicitud llego al panel del club. Te avisaremos en cuanto quede confirmada — al confirmarse podras invitar a tus jugadores.')}
          </p>
        </div>
        {done.promo && (
          <div style={{ background: 'linear-gradient(135deg,var(--sp-dark-a),var(--sp-dark-b))', border: '1px solid var(--sp-on-dark)', borderRadius: 16, padding: '14px 16px', width: '100%', maxWidth: 320, textAlign: 'center' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--sp-on-dark)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>{t('Promo Express aplicada')}</p>
            <p style={{ fontSize: 22, fontWeight: 900, letterSpacing: '0.12em', color: 'var(--sp-on-dark)' }}>{done.promo.codigo}</p>
            {done.promo.precio && <p style={{ fontSize: 13, color: '#9090a8', marginTop: 4 }}>{t('Precio preferencial:')} <strong style={{ color: '#eeeef5' }}>${done.promo.precio}</strong></p>}
            <p style={{ fontSize: 11, color: '#5e5e78', marginTop: 4 }}>{t('El encargado vera este codigo al revisar la reserva')}</p>
          </div>
        )}
        {done.primera && (
          <div style={{ background: 'linear-gradient(135deg,var(--sp-dark-a),var(--sp-dark-b))', border: '1px solid var(--sp-on-dark)', borderRadius: 16, padding: '14px 16px', width: '100%', maxWidth: 320, textAlign: 'center' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--sp-on-dark)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>{t('🎉 Promo de bienvenida aplicada')}</p>
            <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--sp-on-dark)' }}>{t('Renta a ${precio}', { precio: done.primera.precio })}</p>
            <p style={{ fontSize: 12, color: '#9090a8', marginTop: 4 }}>
              {conNodo(t('Comprando 1 {bote} al llegar al club.'), 'bote',
                <strong style={{ color: '#eeeef5' }}>{t('bote de pelotas Sierra Padel')}{done.primera.bote?.precio ? ` ($${done.primera.bote.precio})` : ''}</strong>)}
              {done.primera.bote?.precio ? ' ' + t('Total a pagar: ${total}.', { total: done.primera.precio + done.primera.bote.precio }) : ''} {t('Cancha completa · 90 min. Sin el bote, la promo no aplica.')}
            </p>
          </div>
        )}
        <button className="btn-green w-full max-w-xs" onClick={reset}>{t('Nueva solicitud')}</button>
      </div>
    );
  }

  // ─── Formulario ───────────────────────────────────────────────────────────
  return (
    <div className="page safe-bottom">
      <div className="bg-sp-green px-5 pt-[env(safe-area-inset-top)] pb-0">
        <p className="text-white font-black text-lg pt-3 mb-3">{t('Reservar')}</p>
        {/* Banner promo express tipo 2 */}
        {tienePromo && (
          <div style={{ background: 'rgba(0,0,0,.25)', borderRadius: 12, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>⚡</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>{promoTitulo || t('Promo Express activa')}</p>
              {promoPrecio && <p style={{ fontSize: 11, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>{t('Precio preferencial:')} <strong>${promoPrecio}</strong> · {t('Codigo: {codigo}', { codigo: promoCodigo })}</p>}
            </div>
          </div>
        )}
        {/* Main tabs */}
        <div className="flex gap-1">
          {[['nueva', t('Nueva reserva')], ['mis', t('Mis reservas')]].map(([v,label]) => (
            <button
              key={v}
              onClick={() => { setMainTab(v); setDone(null); }}
              className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${
                mainTab === v ? 'bg-white text-sp-green' : 'text-white/70'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 flex flex-col gap-4">

        {/* ── Mis reservas ── */}
        {mainTab === 'mis' && <MisReservas apiFetch={apiFetch} />}

        {/* ── Nueva reserva ── */}
        {mainTab === 'nueva' && <>

        {/* Tipo tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-2xl p-1">
          {[['cancha', t('🎾 Cancha')], ['clase', t('🏫 Clase')]].map(([val, label]) => (
            <button
              key={val}
              onClick={() => switchTipo(val)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                tipo === val ? 'bg-white text-sp-gray shadow-sm' : 'text-gray-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── CANCHA ── */}
        {tipo === 'cancha' && (
          <>
            {esTodoONada && (
              <div className="rounded-2xl px-3 py-3 flex items-center gap-3 text-[13.5px] leading-relaxed"
                   style={{ background: '#151515', color: '#F1E9DD' }}>
                <img src="/todo-o-nada.webp" alt={t('Todo o Nada · El que pierde paga')} width="84" height="99"
                     className="w-[84px] h-auto shrink-0" />
                <div className="min-w-0">
                  <p className="font-black text-[15px]" style={{ color: '#8DC63F' }}>{t('Martes de Todo o Nada')}</p>
                  <ul className="mt-1 list-disc pl-4 space-y-1">
                    <li>{t('Renta $600 desde las 8:30 pm.')}</li>
                    <li>{t('La pareja que gana no paga y la que pierde paga $300 cada quien.')}</li>
                    <li className="font-bold">{t('Para aplicar la promo, capturen el resultado en la app.')}</li>
                  </ul>
                </div>
              </div>
            )}
            {esCumple && (
              <div className="card border-0" style={{ background: 'linear-gradient(135deg,var(--sp-dark-a),var(--sp-dark-b))' }}>
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--sp-on-dark)' }}>{t('🎂 Tu promo de cumpleaños')}</p>
                <p style={{ color: 'white', fontWeight: 900, fontSize: 18, marginTop: 4 }}>{t('Reserva 2 canchas: la 2ª va por la casa')}</p>
                <p className="text-sm mt-1" style={{ color: '#c4c4d8' }}>
                  {conNodo(t('Elige el día{rango}, la hora y marca {dos}.', {
                    rango: cumpleDesde && cumpleHasta ? t(' (del {desde} al {hasta})', { desde: formatDate(cumpleDesde), hasta: formatDate(cumpleHasta) }) : '',
                  }), 'dos', <b style={{ color: 'white' }}>{t('dos canchas')}</b>)}
                  {' '}{t('Pagas una a precio normal y la otra es gratis. Caben 8.')}
                </p>
              </div>
            )}
            <div className="card">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">{t('Fecha')}</p>
              <input
                type="date"
                className="input-field"
                value={fecha}
                min={esCumple && cumpleDesde > hoyISO() ? cumpleDesde : hoyISO()}
                max={esCumple && cumpleHasta ? cumpleHasta : undefined}
                onChange={e => { setFecha(e.target.value); setHora(null); }}
              />
            </div>

            <div className="card">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-3">{t('Horario · renta 90 min')}</p>
              {gridHoras.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">{t('Ya no hay horarios para hoy')}</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {gridHoras.map(({ hora: h, libres }) => {
                    const lleno = libres === 0;
                    return (
                      <button
                        key={h}
                        onClick={() => !lleno && setHora(h)}
                        disabled={lleno}
                        className={`py-2 rounded-xl text-sm font-semibold border transition-all active:scale-95 ${
                          hora === h
                            ? 'bg-sp-green text-white border-sp-green'
                            : lleno
                              ? 'bg-gray-50 text-gray-300 border-gray-100 line-through'
                              : 'bg-white text-sp-gray border-gray-200'
                        }`}
                      >
                        {h}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {hora && (
              <div className="card">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-3">
                  {esCumple ? t('Canchas disponibles · marca 2 ({n}/2)', { n: canchas2.length }) : t('Canchas disponibles')}
                </p>
                {loadingCanchas ? (
                  <div className="flex justify-center py-6">
                    <div className="w-6 h-6 border-4 border-sp-green border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : canchasDisp && canchasDisp.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">{t('Sin canchas disponibles para este horario')}</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {(canchasDisp || []).map(c => (
                      <button
                        key={c}
                        onClick={() => elegirCancha(c)}
                        aria-pressed={esCumple ? canchas2.includes(c) : cancha === c}
                        className={`py-3 rounded-xl text-sm font-bold border transition-all active:scale-95 ${
                          (esCumple ? canchas2.includes(c) : cancha === c)
                            ? 'bg-sp-green text-white border-sp-green'
                            : 'bg-white text-sp-gray border-gray-200'
                        }`}
                      >
                        {t('Cancha {n}', { n: c })}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            {puedeConfirmarCancha && (
              <div className="card bg-sp-green-light border-0">
                <p className="text-xs text-sp-green-dark font-semibold uppercase tracking-wide mb-2">{t('Resumen')}</p>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-black text-sp-gray text-base">
                      {esCumple ? t('Canchas {a} y {b}', { a: canchas2[0], b: canchas2[1] }) : t('Cancha {n}', { n: cancha })}
                    </p>
                    {esCumple && (
                      <p className="text-xs text-sp-green-dark font-semibold mt-0.5">
                        {t('Cancha {a}: precio normal{precio} · Cancha {b}: $0 🎂', { a: canchas2[0], b: canchas2[1], precio: tarifa?.precio != null ? ` $${tarifa.precio}` : '' })}
                      </p>
                    )}
                    <p className="text-sm text-gray-500 capitalize">{formatDate(fecha)} · {hora} · 90 min</p>
                  </div>
                  {tarifa?.precio != null && (
                    <div className="text-right">
                      <p className="font-black text-sp-green-dark text-xl">${tarifa.precio}</p>
                      <p className="text-[10px] text-gray-400">{t('precio de lista')}</p>
                      <NotaPesos className="text-[10px]" />
                    </div>
                  )}
                </div>
                {tienePromo && promoPrecio && (
                  <p className="text-xs text-sp-green-dark mt-1 font-semibold">{t('⚡ Con tu promo: ${precio}', { precio: promoPrecio })}</p>
                )}
                {!tienePromo && !esCumple && primera?.elegible && (
                  <div className="mt-2 bg-white/70 rounded-xl px-3 py-2">
                    <p className="text-xs text-sp-green-dark font-bold">
                      {t('🎉 Tienes tu primera renta a ${precio} comprando 1 bote de pelotas Sierra Padel', { precio: primera.precio || 200 })}{primera.bote?.precio ? ` ($${primera.bote.precio})` : ''}
                    </p>
                    <div className="flex gap-2 mt-2" role="radiogroup" aria-label={t('¿Usar tu primera renta?')}>
                      <button type="button" role="radio" aria-checked={usarPrimera}
                        onClick={() => setUsarPrimera(true)}
                        className={`flex-1 text-xs font-bold rounded-lg px-2 py-2 border ${usarPrimera ? 'bg-sp-green text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'}`}>
                        {t('Usarla ahora (${precio})', { precio: primera.precio || 200 })}
                      </button>
                      <button type="button" role="radio" aria-checked={!usarPrimera}
                        onClick={() => setUsarPrimera(false)}
                        className={`flex-1 text-xs font-bold rounded-lg px-2 py-2 border ${!usarPrimera ? 'bg-sp-green text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'}`}>
                        {t('Precio normal, la guardo')}
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1.5">
                      {usarPrimera
                        ? (primera.bote?.precio
                            ? t('Cancha completa · 90 min. El bote se paga al llegar al club — total: ${total} (${cancha} cancha + ${bote} bote). Válida una sola vez y solo para quien hace la reservación.', { total: (primera.precio || 200) + primera.bote.precio, cancha: primera.precio || 200, bote: primera.bote.precio })
                            : t('Cancha completa · 90 min. El bote se paga al llegar al club. Válida una sola vez y solo para quien hace la reservación.'))
                        : t('Esta cancha va a precio normal y tu primera renta a ${precio} se queda para otro día. Elige esto si vas a usar otra promo, como tu 2x1 de cumpleaños.', { precio: primera.precio || 200 })}
                    </p>
                  </div>
                )}
                <button
                  className="btn-green w-full mt-4"
                  onClick={handleConfirmar}
                  disabled={loading}
                >
                  {loading ? t('Enviando...') : t('Confirmar solicitud')}
                </button>
              </div>
            )}
          </>
        )}

        {/* ── CLASE ── */}
        {tipo === 'clase' && (
          <>
            <div className="card">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">{t('Fecha')}</p>
              <input
                type="date"
                className="input-field"
                value={fechaClase}
                min={hoyISO()}
                onChange={e => setFechaClase(e.target.value)}
              />
            </div>

            {loadingCoaches ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-4 border-sp-green border-t-transparent rounded-full animate-spin" />
              </div>
            ) : coaches && coaches.length === 0 ? (
              <div className="card text-center py-8">
                <p className="text-gray-400 text-sm">{t('Sin instructores disponibles para esta fecha')}</p>
              </div>
            ) : coaches ? (
              coaches.map(coach => (
                <div
                  key={coach.nombre}
                  onClick={() => { setCoachSel(coach.nombre); setHoraSel(null); }}
                  className={`card cursor-pointer transition-all ${coachSel === coach.nombre ? 'ring-2 ring-sp-green' : ''}`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-sp-green-light flex items-center justify-center text-sp-green font-black text-lg">
                      {coach.nombre[0]}
                    </div>
                    <div>
                      <p className="font-black text-sp-gray">{coach.nombre}</p>
                      <p className="text-xs text-gray-400">{t('{n} horarios disponibles · clase 60 min', { n: coach.horarios?.length || 0 })}</p>
                    </div>
                  </div>
                  {coachSel === coach.nombre && coach.horarios?.length > 0 && (
                    <div className="grid grid-cols-4 gap-1.5">
                      {coach.horarios.map(h => (
                        <button
                          key={h}
                          onClick={e => { e.stopPropagation(); setHoraSel(h); }}
                          className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                            horaSel === h
                              ? 'bg-sp-green text-white border-sp-green'
                              : 'bg-white text-sp-gray border-gray-200'
                          }`}
                        >
                          {h}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : null}

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            {puedeConfirmarClase && (
              <div className="card bg-sp-green-light border-0">
                <p className="text-xs text-sp-green-dark font-semibold uppercase tracking-wide mb-2">{t('Resumen')}</p>
                <p className="font-black text-sp-gray text-base">{t('Clase con {coach}', { coach: coachSel })}</p>
                <p className="text-sm text-gray-500 capitalize">{formatDate(fechaClase)} · {horaSel} · 60 min</p>
                <button
                  className="btn-green w-full mt-4"
                  onClick={handleConfirmar}
                  disabled={loading}
                >
                  {loading ? t('Enviando...') : t('Confirmar solicitud')}
                </button>
              </div>
            )}
          </>
        )}

        </>}
      </div>
    </div>
  );
}
