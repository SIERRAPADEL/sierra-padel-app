import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import Isotipo from '../components/Isotipo';

const API = 'https://sierra-padel-backend-production-a55f.up.railway.app/api';

// Dos formatos de link conviven:
//  - Reta (v2, el actual): token de 16 hex → roster real de la reserva (reservacion_jugadores)
//  - Lealtad (v1, links viejos del bot): token UUID → solo registra el punto
const esUUID = (t) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t || '');

function fmtFecha(iso) {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
}

// ── Flujo RETA (v2) ───────────────────────────────────────────────────────────
function UnirseReta({ token }) {
  const [info, setInfo]       = useState(null);
  const [estado, setEstado]   = useState('cargando'); // cargando | listo | invalido
  const [nombre, setNombre]   = useState('');
  const [telefono, setTelefono] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [exito, setExito]     = useState(false);

  const sesion = localStorage.getItem('sp_token');
  const yo     = (() => { try { return JSON.parse(localStorage.getItem('sp_user') || 'null'); } catch { return null; } })();

  const cargar = useCallback(() => {
    fetch(`${API}/reta/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.ok) { setInfo(d.data); setEstado('listo'); }
        else setEstado('invalido');
      })
      .catch(() => setEstado('invalido'));
  }, [token]);

  useEffect(() => { cargar(); }, [cargar]);

  async function apuntarme(e) {
    e?.preventDefault?.();
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      let res;
      if (sesion) {
        res = await fetch(`${API}/reta/${token}/unirme-app`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sesion}` },
        });
      } else {
        if (!nombre.trim()) { setLoading(false); return setError('Escribe tu nombre para unirte.'); }
        res = await fetch(`${API}/reta/${token}/unirme`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre: nombre.trim(), telefono }),
        });
      }
      const d = await res.json();
      if (d.ok) { setExito(true); cargar(); }
      else setError(d.error || 'No se pudo completar. Intenta de nuevo.');
    } catch {
      setError('Sin conexion. Verifica tu internet.');
    }
    setLoading(false);
  }

  if (estado === 'cargando') {
    return <div className="w-8 h-8 border-4 border-sp-green border-t-transparent rounded-full animate-spin" />;
  }
  if (estado === 'invalido') {
    return <p className="text-red-500 text-sm text-center font-medium">Este enlace es invalido o ya expiro.</p>;
  }

  const lugares = Math.max(0, (info.cupo || 4) - (info.apuntados || 0));

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Datos de la cancha */}
      <div className="bg-sp-green-light rounded-2xl p-4 text-center">
        <p className="text-sp-green-dark font-black text-base">🎾 Reta de {info.organizador || 'un jugador'}</p>
        <p className="text-sp-green-dark text-sm mt-1 capitalize">{fmtFecha(info.fecha)}</p>
        <p className="text-sp-green-dark text-sm font-bold">{String(info.hora_inicio || '').slice(0, 5)} hrs · Cancha {info.cancha}</p>
      </div>

      {/* Quiénes van */}
      <div className="bg-gray-50 rounded-2xl p-4">
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">
          Jugadores ({info.apuntados}/{info.cupo})
        </p>
        <div className="flex flex-wrap gap-1.5">
          {(info.jugadores || []).map((j, i) => (
            <span key={i} className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm font-semibold text-sp-gray">{j}</span>
          ))}
          {Array.from({ length: lugares }).map((_, i) => (
            <span key={`libre-${i}`} className="px-3 py-1.5 bg-white border border-dashed border-gray-300 rounded-full text-sm text-gray-300">Libre</span>
          ))}
        </div>
      </div>

      {exito ? (
        <div className="text-center flex flex-col gap-3">
          <div className="w-16 h-16 rounded-full bg-sp-green-light flex items-center justify-center mx-auto">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#96C800" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <p className="text-sp-gray font-black text-lg">¡Estas dentro!</p>
          <p className="text-gray-400 text-sm">Te esperamos en la cancha. Al llegar, di tu nombre en recepcion.</p>
          {!sesion && (
            <Link to="/registro" className="btn-green block text-center no-underline">
              Crea tu cuenta y junta puntos 🎁
            </Link>
          )}
        </div>
      ) : lugares === 0 ? (
        <p className="text-center text-sm font-semibold text-gray-400 py-2">La cancha ya esta llena 🎾</p>
      ) : sesion ? (
        <div className="flex flex-col gap-2">
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button onClick={apuntarme} disabled={loading} className="btn-green disabled:opacity-50">
            {loading ? 'Apuntando…' : `¡Me apunto${yo?.nombre ? `, soy ${yo.nombre.split(' ')[0]}` : ''}!`}
          </button>
        </div>
      ) : (
        <form onSubmit={apuntarme} className="flex flex-col gap-3">
          <input className="input-field" placeholder="Tu nombre" value={nombre} onChange={e => setNombre(e.target.value)} />
          <input className="input-field" type="tel" placeholder="Telefono (10 digitos)" value={telefono} onChange={e => setTelefono(e.target.value.replace(/\D/g, '').slice(0, 10))} />
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button type="submit" disabled={loading} className="btn-green disabled:opacity-50">
            {loading ? 'Apuntando…' : '¡Me apunto!'}
          </button>
          <Link to="/login" className="text-center text-gray-400 text-xs underline">
            ¿Ya tienes cuenta en la app? Entra y vuelve a abrir el link
          </Link>
        </form>
      )}
    </div>
  );
}

// ── Flujo LEALTAD (v1 — links viejos del bot; solo suma el punto) ─────────────
function UnirseLealtad({ token }) {
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

  if (estado === 'cargando') {
    return <div className="w-8 h-8 border-4 border-sp-green border-t-transparent rounded-full animate-spin" />;
  }
  if (estado === 'invalido') {
    return <p className="text-red-500 text-sm text-center font-medium">Este enlace es invalido o ya expiro.</p>;
  }
  if (exito) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-sp-green-light flex items-center justify-center mx-auto mb-3">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#96C800" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <p className="text-sp-gray font-bold">{exito}</p>
      </div>
    );
  }
  return (
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
  );
}

export default function Unirse() {
  const { token } = useParams();
  return (
    <div className="min-h-full bg-sp-green flex items-center justify-center px-5 py-8">
      <div className="bg-white rounded-3xl p-7 w-full max-w-xs flex flex-col items-center gap-5">
        <Isotipo size={52} />
        <div className="text-center">
          <p className="text-xl font-black text-sp-gray tracking-widest">SIERRA PADEL</p>
          <p className="text-sm text-gray-400 mt-1">Unete a la reta</p>
        </div>
        {esUUID(token) ? <UnirseLealtad token={token} /> : <UnirseReta token={token} />}
      </div>
    </div>
  );
}
