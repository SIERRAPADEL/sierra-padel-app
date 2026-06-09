import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Isotipo from '../components/Isotipo';

const API = 'https://sierra-padel-backend-production-a55f.up.railway.app/api';

export default function Unirse() {
  const { token } = useParams();
  const [estado, setEstado] = useState('cargando');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [exito, setExito] = useState('');

  useEffect(() => {
    fetch(`${API}/loyalty/reservas/unirse/${token}`)
      .then(r => r.json())
      .then(d => setEstado(d.ok ? 'listo' : 'invalido'))
      .catch(() => setEstado('invalido'));
  }, [token]);

  async function handleUnirse(e) {
    e.preventDefault();
    if (!nombre || !telefono) return;
    setLoading(true); setError('');
    const res = await fetch(`${API}/loyalty/reservas/unirse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, nombre, telefono }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.ok) setExito(data.data.mensaje);
    else setError(data.error);
  }

  return (
    <div className="min-h-screen bg-sp-green flex items-center justify-center px-5">
      <div className="bg-white rounded-3xl p-7 w-full max-w-xs flex flex-col items-center gap-5">
        <Isotipo size={52} />
        <div className="text-center">
          <p className="text-xl font-black text-sp-gray tracking-widest">SIERRA PADEL</p>
          <p className="text-sm text-gray-400 mt-1">Acumula tus puntos de lealtad</p>
        </div>

        {estado === 'cargando' && (
          <div className="w-8 h-8 border-4 border-sp-green border-t-transparent rounded-full animate-spin" />
        )}

        {estado === 'invalido' && (
          <p className="text-red-500 text-sm text-center font-medium">Este enlace es invalido o ya expiro.</p>
        )}

        {estado === 'listo' && !exito && (
          <form onSubmit={handleUnirse} className="w-full flex flex-col gap-3">
            <div className="bg-sp-green-light rounded-xl p-3 text-center">
              <p className="text-sp-green-dark text-sm font-semibold">🎾 Reserva valida</p>
              <p className="text-sp-green-dark text-xs mt-0.5">Registrate para recibir 1 punto de lealtad</p>
            </div>
            <input className="input-field" placeholder="Tu nombre" value={nombre} onChange={e => setNombre(e.target.value)} />
            <input className="input-field" type="tel" placeholder="Telefono (10 digitos)" value={telefono} onChange={e => setTelefono(e.target.value.replace(/\D/g, '').slice(0, 10))} />
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button type="submit" disabled={loading} className="btn-green disabled:opacity-50">
              {loading ? 'Registrando...' : 'Recibir mis puntos'}
            </button>
          </form>
        )}

        {exito && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-sp-green-light flex items-center justify-center mx-auto mb-3">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#96C800" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <p className="text-sp-gray font-bold">{exito}</p>
          </div>
        )}
      </div>
    </div>
  );
}
