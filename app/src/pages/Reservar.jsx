import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

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
  const [tipo, setTipo] = useState('cancha'); // 'cancha' | 'clase'

  // --- Cancha ---
  const [fecha, setFecha]             = useState(hoyISO());
  const [hora, setHora]               = useState(null);
  const [canchasDisp, setCanchasDisp] = useState(null);
  const [loadingCanchas, setLoadingCanchas] = useState(false);
  const [cancha, setCancha]           = useState(null);

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
    const data = await apiFetch('/reservas/solicitar', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    setLoading(false);
    if (data.ok) {
      setDone({
        fecha:   tipo === 'cancha' ? fecha      : fechaClase,
        hora:    tipo === 'cancha' ? hora       : horaSel,
        detalle: tipo === 'cancha' ? `Cancha ${cancha}` : `Clase con ${coachSel}`,
      });
    } else {
      setError(data.error || 'No se pudo enviar la solicitud');
    }
  }

  function reset() {
    setDone(null); setHora(null); setCanchasDisp(null);
    setCancha(null); setCoachSel(null); setHoraSel(null); setError('');
  }

  const puedeConfirmarCancha = cancha && hora && fecha;
  const puedeConfirmarClase  = coachSel && horaSel && fechaClase;

  // ─── Pantalla de éxito ────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="page safe-bottom flex flex-col items-center justify-center px-6 gap-5">
        <div className="w-20 h-20 rounded-full bg-sp-green-light flex items-center justify-center">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#84C200" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
            El equipo de Sierra Padel confirmará tu reserva por WhatsApp.
          </p>
        </div>
        <button className="btn-green w-full max-w-xs" onClick={reset}>Nueva solicitud</button>
      </div>
    );
  }

  // ─── Formulario ───────────────────────────────────────────────────────────
  return (
    <div className="page safe-bottom">
      <div className="bg-sp-green px-5 pt-[env(safe-area-inset-top)] pb-4">
        <p className="text-white font-black text-lg pt-3">Reservar</p>
      </div>

      <div className="px-4 py-4 flex flex-col gap-4">

        {/* Tabs */}
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
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-3">Horario</p>
              <div className="grid grid-cols-4 gap-2">
                {HORARIOS.map(h => (
                  <button
                    key={h}
                    onClick={() => setHora(h)}
                    className={`py-2 rounded-xl text-sm font-semibold border transition-all active:scale-95 ${
                      hora === h
                        ? 'bg-sp-green text-white border-sp-green'
                        : 'bg-white text-sp-gray border-gray-200'
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            {hora && (
              <div className="card">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-3">
                  Canchas disponibles
                </p>
                {loadingCanchas ? (
                  <div className="flex justify-center py-4">
                    <div className="w-6 h-6 border-2 border-sp-green border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : canchasDisp && canchasDisp.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-2">
                    Sin canchas disponibles en este horario
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {(canchasDisp || []).map(c => (
                      <button
                        key={c}
                        onClick={() => setCancha(c)}
                        className={`py-2 rounded-xl text-sm font-semibold border transition-all active:scale-95 ${
                          cancha === c
                            ? 'bg-sp-green text-white border-sp-green'
                            : 'bg-white text-sp-gray border-gray-200'
                        }`}
                      >
                        #{c}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {puedeConfirmarCancha && (
              <div className="card bg-sp-green-light border border-sp-green/30">
                <p className="text-sp-green-dark font-semibold text-sm">Cancha {cancha} · {hora}</p>
                <p className="text-sp-green-dark text-xs mt-0.5 capitalize">{formatDate(fecha)}</p>
                <p className="text-sp-green-dark text-xs mt-0.5">Duración: 1:30 hrs</p>
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

            <div className="card">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-3">
                Coach disponible
              </p>
              {loadingCoaches ? (
                <div className="flex justify-center py-4">
                  <div className="w-6 h-6 border-2 border-sp-green border-t-transparent rounded-full animate-spin" />
                </div>
              ) : coaches && coaches.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-2">
                  Sin coaches disponibles este día
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {(coaches || []).map(c => (
                    <div key={c.instructor}>
                      <button
                        onClick={() => { setCoachSel(c.instructor); setHoraSel(null); }}
                        className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-xl border transition-all active:scale-[0.98] ${
                          coachSel === c.instructor
                            ? 'border-sp-green bg-sp-green-light'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-full bg-sp-green flex items-center justify-center shrink-0">
                          <span className="text-white font-black text-sm">
                            {c.instructor.charAt(0)}
                          </span>
                        </div>
                        <span className={`font-semibold text-sm flex-1 text-left ${
                          coachSel === c.instructor ? 'text-sp-green-dark' : 'text-sp-gray'
                        }`}>
                          {c.instructor}
                        </span>
                        <span className="text-xs text-gray-400">
                          {c.slots.length} {c.slots.length === 1 ? 'horario' : 'horarios'}
                        </span>
                      </button>

                      {coachSel === c.instructor && (
                        <div className="grid grid-cols-4 gap-2 mt-2 px-1">
                          {c.slots.map(s => (
                            <button
                              key={s}
                              onClick={() => setHoraSel(s)}
                              className={`py-2 rounded-xl text-sm font-semibold border transition-all active:scale-95 ${
                                horaSel === s
                                  ? 'bg-sp-green text-white border-sp-green'
                                  : 'bg-white text-sp-gray border-gray-200'
                              }`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {puedeConfirmarClase && (
              <div className="card bg-sp-green-light border border-sp-green/30">
                <p className="text-sp-green-dark font-semibold text-sm">Clase con {coachSel}</p>
                <p className="text-sp-green-dark text-xs mt-0.5 capitalize">{formatDate(fechaClase)} · {horaSel}</p>
                <p className="text-sp-green-dark text-xs mt-0.5">Duración: 1 hr</p>
              </div>
            )}
          </>
        )}

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <button
          onClick={handleConfirmar}
          disabled={loading || (tipo === 'cancha' ? !puedeConfirmarCancha : !puedeConfirmarClase)}
          className="btn-green disabled:opacity-50"
        >
          {loading ? 'Enviando...' : 'Solicitar reserva'}
        </button>

        <p className="text-xs text-gray-400 text-center -mt-1">
          Tu solicitud quedará pendiente hasta que Sierra Padel la confirme por WhatsApp.
        </p>
      </div>
    </div>
  );
}
