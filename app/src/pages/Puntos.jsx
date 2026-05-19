import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import Isotipo from '../components/Isotipo';

const META_PUNTOS = 20;

export default function Puntos() {
  const { user } = useAuth();
  const { apiFetch } = useApi();
  const location = useLocation();
  const [saldo, setSaldo] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [tab, setTab] = useState(location.state?.tab || 'card');
  const [ticket, setTicket] = useState('');
  const [monto, setMonto] = useState('');
  const [msg, setMsg] = useState(null);
  const [loadingConsumo, setLoadingConsumo] = useState(false);

  useEffect(() => {
    apiFetch('/auth/me').then(d => { if (d.ok) setSaldo(d.data); });
    apiFetch(`/loyalty/clientes/${user?.id}/historial`).then(d => { if (d.ok) setHistorial(d.data); });
  }, []);

  const totalPuntos = saldo?.total_puntos ?? 0;
  const progreso = Math.min((totalPuntos / META_PUNTOS) * 100, 100);
  const puntosFaltantes = Math.max(META_PUNTOS - totalPuntos, 0);

  async function handleConsumo(e) {
    e.preventDefault();
    if (!ticket || !monto) return;
    setLoadingConsumo(true);
    setMsg(null);
    const data = await apiFetch('/loyalty/consumo', {
      method: 'POST',
      body: JSON.stringify({ ticket_numero: ticket, telefono: user.telefono, monto: parseFloat(monto) }),
    });
    setLoadingConsumo(false);
    if (data.ok) {
      setMsg({ ok: true, text: `✓ ${data.data.puntos_acreditados} puntos acreditados con ticket ${ticket}` });
      setTicket(''); setMonto('');
      setSaldo(prev => ({ ...prev, total_puntos: (prev?.total_puntos || 0) + data.data.puntos_acreditados }));
    } else {
      setMsg({ ok: false, text: data.error });
    }
  }

  function formatFecha(iso) {
    return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
  }

  return (
    <div className="page safe-bottom">
      <div className="bg-sp-gray px-5 pt-[env(safe-area-inset-top)] pb-4">
        <div className="pt-3">
          <p className="text-white font-black text-lg">Mis Puntos</p>
        </div>
      </div>

      <div className="mx-4 -mt-0 mt-4 bg-[#1C1C1C] rounded-2xl p-5">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sp-green text-xs font-bold tracking-widest">SIERRA PADEL</p>
            <p className="text-gray-600 text-xs tracking-widest mt-0.5">CLUB MEMBER</p>
          </div>
          <Isotipo size={28} color="#84C200" />
        </div>
        <div className="mt-4">
          <span className="text-white text-5xl font-black">{totalPuntos}</span>
          <p className="text-gray-600 text-xs mt-1">puntos acumulados</p>
        </div>
        <div className="mt-4 bg-[#2A2A2A] rounded-xl px-3 py-2 flex justify-between items-center">
          <span className="text-white text-sm font-semibold">{saldo?.nombre || user?.nombre}</span>
          <span className="text-gray-600 text-xs">#{String(user?.id || '').slice(-5).toUpperCase()}</span>
        </div>
      </div>

      <div className="mx-4 mt-3 card">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-sp-gray">Próximo premio</span>
          <span className="text-sm font-bold text-sp-green">{totalPuntos} / {META_PUNTOS}</span>
        </div>
        <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
          <div className="bg-sp-green h-2 rounded-full transition-all duration-500" style={{ width: `${progreso}%` }} />
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {puntosFaltantes > 0
            ? `${puntosFaltantes} puntos para 1 hora de cancha gratis`
            : '¡Tienes un premio disponible!'}
        </p>
      </div>

      <div className="mx-4 mt-3 flex gap-2">
        <button onClick={() => setTab('card')} className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${tab === 'card' ? 'bg-sp-green text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>Historial</button>
        <button onClick={() => setTab('consumo')} className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${tab === 'consumo' ? 'bg-sp-green text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>Registrar consumo</button>
      </div>

      {tab === 'card' && (
        <div className="mx-4 mt-3 flex flex-col gap-2 pb-4">
          {historial.length === 0 && (
            <div className="card text-center text-gray-400 text-sm py-8">Sin movimientos aún</div>
          )}
          {historial.map(h => (
            <div key={h.id} className="card flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-sp-gray capitalize">{h.tipo} {h.tipo === 'consumo' ? `· $${h.referencia_id}` : ''}</p>
                <p className="text-xs text-gray-400">{formatFecha(h.created_at)}</p>
              </div>
              <span className="text-lg font-black text-sp-green">+{h.puntos}</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'consumo' && (
        <form onSubmit={handleConsumo} className="mx-4 mt-3 card flex flex-col gap-3 pb-4">
          <p className="text-sm text-gray-500">Ingresa los datos de tu ticket del restaurante</p>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">Número de ticket</label>
            <input className="input-field" placeholder="Ej: 1842" value={ticket} onChange={e => setTicket(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">Monto total</label>
            <input className="input-field" type="number" placeholder="$0.00" step="0.01" min="1" value={monto} onChange={e => setMonto(e.target.value)} />
            {monto && parseFloat(monto) >= 50 && (
              <p className="text-xs text-sp-green mt-1 font-medium">= {Math.floor(parseFloat(monto) / 50)} punto(s) (1 punto por cada $50)</p>
            )}
          </div>
          {msg && <p className={`text-sm text-center font-medium ${msg.ok ? 'text-sp-green' : 'text-red-500'}`}>{msg.text}</p>}
          <button type="submit" disabled={!ticket || !monto || loadingConsumo} className="btn-green disabled:opacity-50">
            {loadingConsumo ? 'Registrando...' : 'Acreditar puntos'}
          </button>
        </form>
      )}
    </div>
  );
}
