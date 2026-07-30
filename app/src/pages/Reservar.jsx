import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useApi } from '../hooks/useApi';

// ── Mis Reservas ─────────────────────────────────────────────────────────────

function fmtFecha(iso) {
  if (!iso) return '';
  return new Date(iso + 'T12:00').toLocaleDateString('es-MX', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

function EstadoPill({ estado, source }) {
  if (source === 'pre' || estado === 'pendiente') {
    return <span className="text-xs font-bold px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">Pendiente</span>;
  }
  if (estado === 'confirmada') {
    return <span className="text-xs font-bold px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Confirmada</span>;
  }
  if (estado === 'cancelada') {
    return <span className="text-xs font-bold px-2 py-0.5 bg-red-100 text-red-400 rounded-full">Cancelada</span>;
  }
  if (estado === 'no-show') {
    return <span className="text-xs font-bold px-2 py-0.5 bg-gray-100 text-gray-400 rounded-full">No-show</span>;
  }
  return <span className="text-xs font-bold px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">{estado}</span>;
}

// Comparte el link de la reta por WhatsApp (o el share nativo del teléfono).
function invitarReta(r) {
  const link  = `${window.location.origin}/unirse/${r.join_token}`;
  const texto = `🎾 ¡Únete a mi reta en Sierra Padel!\n📅 ${fmtFecha(r.fecha)} · ${String(r.hora_inicio || '').slice(0, 5)} hrs · Cancha ${r.cancha}\nApúntate aquí: ${link}`;
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
          Jugadores {jugadores.length}/{cupo}
        </p>
        {r.join_token && libres > 0 && (
          <button
            onClick={onInvitar}
            className="text-[13px] font-bold text-white bg-[#25D366] px-3 py-1.5 rounded-full active:scale-95 transition-transform"
          >
            Invitar por WhatsApp
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {jugadores.map((j, i) => (
          <span key={i} className="px-2.5 py-1 bg-sp-green-light text-sp-green-dark rounded-full text-xs font-semibold">
            {String(j.nombre || 'Jugador').split(' ')[0]}
          </span>
        ))}
        {Array.from({ length: libres }).map((_, i) => (
          <span key={`l-${i}`} className="px-2.5 py-1 border border-dashed border-gray-300 text-gray-300 rounded-full text-xs">
            Libre
          </span>
        ))}
      </div>
      {jugadores.length === 0 && (
        <p className="text-xs text-gray-400 mt-1.5">Invita a los que juegan contigo: check-in más rápido y cada quien su cuenta.</p>
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
      setMsg({ ok: true, text: '📣 Tu reta quedó anunciada. Avisamos a los jugadores compatibles.' });
      onChanged();
    } else {
      setMsg({ ok: false, text: d.error || 'No se pudo anunciar la reta.' });
    }
  }

  async function cerrar() {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    const d = await apiFetch(`/reta/reserva-propia/${r.id}/cerrar`, { method: 'POST' });
    setBusy(false);
    if (d.ok) { setMsg({ ok: true, text: 'Tu reta ya no se anuncia.' }); onChanged(); }
    else setMsg({ ok: false, text: d.error || 'No se pudo. Intenta de nuevo.' });
  }

  if (r.reta?.estado === 'completa') {
    return (
      <div className="mt-2 bg-sp-green-light rounded-xl px-3 py-2">
        <p className="text-xs text-sp-green-dark font-bold">✅ ¡Reta completa! Nos vemos en la cancha.</p>
      </div>
    );
  }

  if (r.reta?.estado === 'abierta') {
    return (
      <div className="mt-2 flex items-center justify-between gap-2 bg-sp-green-light rounded-xl px-3 py-2">
        <p className="text-xs text-sp-green-dark font-bold">
          📣 Anunciada en retas · {r.reta.nivel_objetivo ? `${r.reta.nivel_objetivo} (±1)` : 'abierta a todos'}
        </p>
        <button onClick={cerrar} disabled={busy} className="text-xs text-gray-400 underline flex-shrink-0">
          {busy ? '…' : 'Dejar de anunciar'}
        </button>
      </div>
    );
  }

  if (eligiendo) {
    return (
      <div className="mt-2 flex flex-col gap-2">
        <p className="text-xs text-gray-400 font-semibold">¿A quién avisamos?</p>
        <div className="flex gap-2">
          <button
            onClick={() => abrir('mi')}
            disabled={busy}
            className="flex-1 py-2 rounded-xl text-xs font-bold bg-sp-green text-white disabled:opacity-50"
          >
            🎯 De mi nivel (±1)
          </button>
          <button
            onClick={() => abrir('todos')}
            disabled={busy}
            className="flex-1 py-2 rounded-xl text-xs font-bold bg-white text-sp-gray border border-gray-200 disabled:opacity-50"
          >
            🌎 Abierta a todos
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
      📣 Buscar jugadores (anunciar reta)
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
      setCancelMsg({ ok: true, text: r._source === 'pre' ? 'Solicitud cancelada.' : 'Reserva cancelada.' });
      load();
    } else {
      setCancelMsg({ ok: false, text: d.error || 'No se pudo cancelar. Intenta de nuevo.' });
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
        {[['proximas','Proximas'],['historial','Historial']].map(([v, label]) => (
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
              <p className="text-gray-500 font-medium">Sin reservas proximas</p>
              <p className="text-gray-400 text-sm mt-1">Haz tu primera solicitud arriba</p>
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
                      {r.tipo === 'renta' ? `Cancha ${r.cancha}` :
                       r.tipo === 'clase' ? `Clase con ${r.instructor}` : r.tipo}
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
                    ⏳ Esperando confirmacion del club
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
                          {cancelBusy ? 'Cancelando…' : 'Si, cancelar'}
                        </button>
                        <button
                          onClick={() => setCancelando(null)}
                          className="flex-1 py-2 rounded-xl text-xs font-bold bg-gray-50 text-gray-500 border border-gray-200"
                        >
                          No, conservar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setCancelando(`${r._source}-${r.id}`); setCancelMsg(null); }}
                        className="text-xs text-gray-400 underline"
                      >
                        {r._source === 'pre' ? 'Cancelar solicitud' : 'Cancelar reserva'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <p className="text-xs text-gray-400 text-center px-4">
            Las reservas confirmadas se pueden cancelar hasta 4 horas antes. Con menos tiempo, escríbenos por WhatsApp.
          </p>
        </>
      )}

      {tab === 'historial' && (
        <>
          {historial.length === 0 && (
            <div className="card text-center py-10">
              <p className="text-gray-400 text-sm">Sin historial de reservas</p>
            </div>
          )}
          {historial.map(r => (
            <div key={r.id} className="card opacity-80">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-sp-gray">
                    {r.tipo === 'renta' ? `Cancha ${r.cancha}` :
                     r.tipo === 'clase' ? `Clase con ${r.instructor}` : r.tipo}
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
        Actualizar
      </button>
    </div>
  );
}

// ── Constantes del formulario ─────────────────────────────────────────────────

const HORARIOS = [
  '07:00','08:00','09:00','10:00','11:00','12:00','13:00',
  '14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00',
];

function hoyISO() { return new Date().toISOString().split('T')[0]; }

function formatDate(iso) {
  return new Date(iso + 'T12:00').toLocaleDateString('es-MX', {
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

  // Puede venir a "Mis reservas" desde Mi cuenta (state) o desde un push (?tab=mis)
  const [mainTab, setMainTab] = useState(
    (location.state?.tab === 'mis' || urlParams.get('tab') === 'mis') ? 'mis' : 'nueva'
  );
  const [tipo, setTipo] = useState('cancha'); // 'cancha' | 'clase'

  // --- Cancha ---
  const [fecha, setFecha]             = useState(hoyISO());
  const [hora, setHora]               = useState(null);
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

  async function handleConfirmar() {
    setLoading(true);
    setError('');
    const body = tipo === 'cancha'
      ? { fecha, hora, tipo: 'renta', cancha }
      : { fecha: fechaClase, hora: horaSel, tipo: 'clase', instructor: coachSel };

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
      if (esPrimera) setPrimera({ elegible: false }); // ya quedó apartada su promo
      setDone({
        fecha:   tipo === 'cancha' ? fecha      : fechaClase,
        hora:    tipo === 'cancha' ? hora       : horaSel,
        detalle: tipo === 'cancha' ? `Cancha ${cancha}` : `Clase con ${coachSel}`,
        promo:   tienePromo ? { codigo: promoCodigo, precio: promoPrecio, titulo: promoTitulo } : null,
        primera: esPrimera ? { precio: Number(data.data.promo_precio) || 200 } : null,
      });
    } else {
      setError(data.error || 'No se pudo enviar la solicitud');
    }
  }

  function reset() {
    setDone(null); setHora(null); setCanchasDisp(null);
    setCancha(null); setCoachSel(null); setHoraSel(null); setError('');
    setTarifa(null);
  }

  const puedeConfirmarCancha = cancha && hora && fecha;
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
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#96C800" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-xl font-black text-sp-gray">Solicitud enviada</p>
          <p className="text-gray-500 mt-1 text-sm font-medium">{done.detalle}</p>
          <p className="text-gray-400 text-sm capitalize">{formatDate(done.fecha)} · {done.hora}</p>
        </div>
        <div className="bg-sp-green-light rounded-2xl px-5 py-4 text-center w-full max-w-xs">
          <p className="text-sp-green-dark text-sm font-medium">
            Tu solicitud llego al panel del club. Te avisaremos en cuanto quede confirmada — al confirmarse podras invitar a tus jugadores.
          </p>
        </div>
        {done.promo && (
          <div style={{ background: 'linear-gradient(135deg,#1a2a00,#0e1a00)', border: '1px solid #96C800', borderRadius: 16, padding: '14px 16px', width: '100%', maxWidth: 320, textAlign: 'center' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#96C800', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Promo Express aplicada</p>
            <p style={{ fontSize: 22, fontWeight: 900, letterSpacing: '0.12em', color: '#96C800' }}>{done.promo.codigo}</p>
            {done.promo.precio && <p style={{ fontSize: 13, color: '#9090a8', marginTop: 4 }}>Precio preferencial: <strong style={{ color: '#eeeef5' }}>${done.promo.precio}</strong></p>}
            <p style={{ fontSize: 11, color: '#5e5e78', marginTop: 4 }}>El encargado vera este codigo al revisar la reserva</p>
          </div>
        )}
        {done.primera && (
          <div style={{ background: 'linear-gradient(135deg,#1a2a00,#0e1a00)', border: '1px solid #96C800', borderRadius: 16, padding: '14px 16px', width: '100%', maxWidth: 320, textAlign: 'center' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#96C800', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>🎉 Promo de bienvenida aplicada</p>
            <p style={{ fontSize: 22, fontWeight: 900, color: '#96C800' }}>Renta a ${done.primera.precio}</p>
            <p style={{ fontSize: 12, color: '#9090a8', marginTop: 4 }}>En la compra de un <strong style={{ color: '#eeeef5' }}>bote de pelotas Sierra Padel</strong> al llegar al club. Cancha completa · 90 min.</p>
          </div>
        )}
        <button className="btn-green w-full max-w-xs" onClick={reset}>Nueva solicitud</button>
      </div>
    );
  }

  // ─── Formulario ───────────────────────────────────────────────────────────
  return (
    <div className="page safe-bottom">
      <div className="bg-sp-green px-5 pt-[env(safe-area-inset-top)] pb-0">
        <p className="text-white font-black text-lg pt-3 mb-3">Reservar</p>
        {/* Banner promo express tipo 2 */}
        {tienePromo && (
          <div style={{ background: 'rgba(0,0,0,.25)', borderRadius: 12, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>⚡</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>{promoTitulo || 'Promo Express activa'}</p>
              {promoPrecio && <p style={{ fontSize: 11, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>Precio preferencial: <strong>${promoPrecio}</strong> · Codigo: {promoCodigo}</p>}
            </div>
          </div>
        )}
        {/* Main tabs */}
        <div className="flex gap-1">
          {[['nueva','Nueva reserva'],['mis','Mis reservas']].map(([v,label]) => (
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
          {[['cancha', '🎾 Cancha'], ['clase', '🏫 Clase']].map(([val, label]) => (
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
            <div className="card">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Fecha</p>
              <input
                type="date"
                className="input-field"
                value={fecha}
                min={hoyISO()}
                onChange={e => { setFecha(e.target.value); setHora(null); }}
              />
            </div>

            <div className="card">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-3">Horario · renta 90 min</p>
              {gridHoras.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Ya no hay horarios para hoy</p>
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
                  Canchas disponibles
                </p>
                {loadingCanchas ? (
                  <div className="flex justify-center py-6">
                    <div className="w-6 h-6 border-4 border-sp-green border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : canchasDisp && canchasDisp.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">Sin canchas disponibles para este horario</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {(canchasDisp || []).map(c => (
                      <button
                        key={c}
                        onClick={() => setCancha(c)}
                        className={`py-3 rounded-xl text-sm font-bold border transition-all active:scale-95 ${
                          cancha === c
                            ? 'bg-sp-green text-white border-sp-green'
                            : 'bg-white text-sp-gray border-gray-200'
                        }`}
                      >
                        Cancha {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            {puedeConfirmarCancha && (
              <div className="card bg-sp-green-light border-0">
                <p className="text-xs text-sp-green-dark font-semibold uppercase tracking-wide mb-2">Resumen</p>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-black text-sp-gray text-base">Cancha {cancha}</p>
                    <p className="text-sm text-gray-500 capitalize">{formatDate(fecha)} · {hora} · 90 min</p>
                  </div>
                  {tarifa?.precio != null && (
                    <div className="text-right">
                      <p className="font-black text-sp-green-dark text-xl">${tarifa.precio}</p>
                      <p className="text-[10px] text-gray-400">precio de lista</p>
                    </div>
                  )}
                </div>
                {tienePromo && promoPrecio && (
                  <p className="text-xs text-sp-green-dark mt-1 font-semibold">⚡ Con tu promo: ${promoPrecio}</p>
                )}
                {!tienePromo && primera?.elegible && (
                  <div className="mt-2 bg-white/70 rounded-xl px-3 py-2">
                    <p className="text-xs text-sp-green-dark font-bold">🎉 Tu primera renta a ${primera.precio || 200} en la compra de un bote de pelotas Sierra Padel</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Cancha completa · 90 min. El bote lo compras al llegar al club; la promo se aplica sola al confirmar.</p>
                  </div>
                )}
                <button
                  className="btn-green w-full mt-4"
                  onClick={handleConfirmar}
                  disabled={loading}
                >
                  {loading ? 'Enviando...' : 'Confirmar solicitud'}
                </button>
              </div>
            )}
          </>
        )}

        {/* ── CLASE ── */}
        {tipo === 'clase' && (
          <>
            <div className="card">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Fecha</p>
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
                <p className="text-gray-400 text-sm">Sin instructores disponibles para esta fecha</p>
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
                      <p className="text-xs text-gray-400">{coach.horarios?.length || 0} horarios disponibles · clase 60 min</p>
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
                <p className="text-xs text-sp-green-dark font-semibold uppercase tracking-wide mb-2">Resumen</p>
                <p className="font-black text-sp-gray text-base">Clase con {coachSel}</p>
                <p className="text-sm text-gray-500 capitalize">{formatDate(fechaClase)} · {horaSel} · 60 min</p>
                <button
                  className="btn-green w-full mt-4"
                  onClick={handleConfirmar}
                  disabled={loading}
                >
                  {loading ? 'Enviando...' : 'Confirmar solicitud'}
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
