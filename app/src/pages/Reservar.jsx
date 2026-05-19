import { useState } from 'react';

const canchas = ['Cancha 1', 'Cancha 2', 'Cancha 3', 'Cancha 4', 'Cancha 5', 'Cancha 6'];
const horarios = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];

function hoyISO() {
  return new Date().toISOString().split('T')[0];
}

export default function Reservar() {
  const [fecha, setFecha] = useState(hoyISO());
  const [cancha, setCancha] = useState(null);
  const [hora, setHora] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);

  function handleConfirmar() {
    setConfirming(true);
    setTimeout(() => {
      setConfirming(false);
      setDone(true);
    }, 1200);
  }

  if (done) {
    return (
      <div className="page safe-bottom flex flex-col items-center justify-center px-6 gap-5">
        <div className="w-20 h-20 rounded-full bg-sp-green-light flex items-center justify-center">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#84C200" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-xl font-black text-sp-gray">¡Reserva confirmada!</p>
          <p className="text-gray-400 mt-1">{cancha} · {hora} · {new Date(fecha + 'T12:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <p className="text-sm text-gray-400 text-center">Tu compañeros recibirán un link para unirse y acumular sus puntos.</p>
        <button className="btn-green" onClick={() => { setDone(false); setCancha(null); setHora(null); }}>Nueva reserva</button>
      </div>
    );
  }

  return (
    <div className="page safe-bottom">
      <div className="bg-sp-green px-5 pt-[env(safe-area-inset-top)] pb-4">
        <p className="text-white font-black text-lg pt-3">Reservar cancha</p>
      </div>

      <div className="px-4 py-4 flex flex-col gap-4">
        <div className="card">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Fecha</p>
          <input
            type="date"
            className="input-field"
            value={fecha}
            min={hoyISO()}
            onChange={e => setFecha(e.target.value)}
          />
        </div>

        <div className="card">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-3">Cancha</p>
          <div className="grid grid-cols-3 gap-2">
            {canchas.map(c => (
              <button
                key={c}
                onClick={() => setCancha(c)}
                className={`py-2 rounded-xl text-sm font-semibold border transition-all active:scale-95
                  ${cancha === c ? 'bg-sp-green text-white border-sp-green' : 'bg-white text-sp-gray border-gray-200'}`}
              >
                {c.replace('Cancha ', '#')}
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-3">Horario</p>
          <div className="grid grid-cols-4 gap-2">
            {horarios.map(h => (
              <button
                key={h}
                onClick={() => setHora(h)}
                className={`py-2 rounded-xl text-sm font-semibold border transition-all active:scale-95
                  ${hora === h ? 'bg-sp-green text-white border-sp-green' : 'bg-white text-sp-gray border-gray-200'}`}
              >
                {h}
              </button>
            ))}
          </div>
        </div>

        {cancha && hora && (
          <div className="card bg-sp-green-light border-sp-green/30">
            <p className="text-sp-green-dark text-sm font-semibold">{cancha} · {hora}</p>
            <p className="text-sp-green-dark text-xs mt-0.5">{new Date(fecha + 'T12:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
        )}

        <button
          onClick={handleConfirmar}
          disabled={!cancha || !hora || confirming}
          className="btn-green disabled:opacity-50"
        >
          {confirming ? 'Confirmando...' : 'Confirmar reserva'}
        </button>
      </div>
    </div>
  );
}
