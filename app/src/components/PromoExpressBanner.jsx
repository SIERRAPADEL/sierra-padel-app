import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BACKEND, UBICACIONES } from '../lib/constants';

// Banner único de Promo Express (usado en Home y Noticias).
// Solo aparece cuando hay una promo activa corriendo. Maneja countdown,
// confirmación de ubicación y reclamo. Tipo 2 redirige a reservar con el código.
export default function PromoExpressBanner() {
  const navigate = useNavigate();
  const [promo, setPromo]             = useState(null);
  const [segundos, setSegundos]       = useState(0);
  const [reclamado, setReclamado]     = useState(null);
  const [reclamando, setReclamando]   = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [ubicacion, setUbicacion]     = useState('');
  const [errorMsg, setErrorMsg]       = useState('');

  useEffect(() => {
    fetchPromo();
    const poll = setInterval(fetchPromo, 30000);
    return () => clearInterval(poll);
  }, []);

  useEffect(() => {
    if (!promo) return;
    const t = setInterval(() => {
      const diff = Math.max(0, Math.floor((new Date(promo.fin_at) - Date.now()) / 1000));
      setSegundos(diff);
      if (diff === 0) setPromo(null);
    }, 1000);
    return () => clearInterval(t);
  }, [promo]);

  async function fetchPromo() {
    try {
      const r = await fetch(`${BACKEND}/api/promos-express/activa`);
      const d = await r.json();
      setPromo(d.ok && d.data ? d.data : null);
    } catch { }
  }

  async function confirmarYReclamar() {
    if (!promo || reclamando || !ubicacion) return;
    setReclamando(true);
    setConfirmando(false);
    setErrorMsg('');
    try {
      const token = localStorage.getItem('sp_token');
      const r = await fetch(`${BACKEND}/api/promos-express/${promo.id}/reclamar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({ ubicacion }),
      });
      const d = await r.json();
      if (d.ok) {
        setReclamado({ ...d.data, tipo: d.tipo || promo.tipo || '1' });
        if (d.tipo === '2') {
          const params = new URLSearchParams({
            promo:  d.data.codigo,
            titulo: promo.titulo,
            precio: d.precio_preferencial || '',
          });
          navigate(`/reservar?${params.toString()}`);
        }
      } else {
        setErrorMsg(d.error || 'No se pudo reclamar la promo');
      }
    } catch {
      setErrorMsg('Error de conexion. Intenta de nuevo.');
    }
    setReclamando(false);
  }

  if (!promo && !reclamado) return null;

  const mm  = String(Math.floor(segundos / 60)).padStart(2, '0');
  const ss  = String(segundos % 60).padStart(2, '0');
  const pct = promo ? (segundos / (promo.duracion_min * 60)) * 100 : 0;

  // ── Vista post-reclamo ──────────────────────────────────────────────────────
  if (reclamado) {
    const tipo = reclamado.tipo;
    return (
      <div style={{ background: 'linear-gradient(135deg,#1a2a00,#0e1a00)', border: '1px solid #96C800', borderRadius: 16, padding: 16 }}>
        <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#96C800' }}>Promo reclamada</p>
        <div style={{ background: 'rgba(150,200,0,.1)', border: '1px solid rgba(150,200,0,.3)', borderRadius: 12, padding: 14, textAlign: 'center', marginBottom: 10 }}>
          <p style={{ fontSize: 30, fontWeight: 900, letterSpacing: '0.15em', color: '#96C800' }}>{reclamado.codigo}</p>
          <p className="text-sm mt-1" style={{ color: '#c4c4d8' }}>
            {tipo === '2' ? 'Usa este codigo al reservar tu cancha o clase' : 'Tu pedido ya llego a caja'}
          </p>
        </div>
        <div style={{ background: 'rgba(255,255,255,.06)', borderRadius: 10, padding: '8px 12px' }}>
          <p className="text-sm" style={{ color: '#c4c4d8' }}>
            📍 <strong style={{ color: 'white' }}>{tipo === '2' ? 'Reserva tu cancha' : ubicacion}</strong> · 🎯 <strong style={{ color: 'white' }}>{promo?.titulo}</strong>
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

  // ── Banner con countdown + modal de confirmación ────────────────────────────
  return (
    <>
      {confirmando && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-6" onClick={() => { setConfirmando(false); setUbicacion(''); }}>
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm flex flex-col" onClick={e => e.stopPropagation()}>
            <p className="text-xs font-bold uppercase tracking-wider text-sp-green mb-1">Confirmar promo</p>
            <p className="text-lg font-black text-sp-gray">{promo.titulo}</p>
            <p className="text-sm text-gray-500 mb-4">{promo.descripcion}</p>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">¿Donde estas?</p>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {UBICACIONES.map(u => (
                <button
                  key={u}
                  onClick={() => setUbicacion(u)}
                  className={`py-2.5 px-2 rounded-xl text-sm font-bold transition-colors ${
                    ubicacion === u ? 'bg-sp-green text-white' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setConfirmando(false); setUbicacion(''); }}
                className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-500 font-bold text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarYReclamar}
                disabled={!ubicacion}
                className={`flex-[2] py-3 rounded-xl font-bold text-sm ${
                  ubicacion ? 'bg-sp-green text-white' : 'bg-gray-100 text-gray-300'
                }`}
              >
                {ubicacion ? 'Confirmar y reclamar ✓' : 'Selecciona ubicacion'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ background: 'linear-gradient(135deg,#1a2a00,#0e1a00)', border: '1px solid rgba(150,200,0,.5)', borderRadius: 16, padding: 16 }}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#96C800' }}>⚡ Promo express</p>
            <p className="font-black leading-snug" style={{ color: 'white', fontSize: 16 }}>{promo.titulo}</p>
            <p className="text-sm mt-0.5" style={{ color: '#c4c4d8' }}>{promo.descripcion}</p>
          </div>
          <div className="text-right ml-3 flex-shrink-0">
            <p style={{ fontSize: 26, fontWeight: 900, color: segundos < 120 ? '#f97316' : '#96C800', fontVariantNumeric: 'tabular-nums' }}>{mm}:{ss}</p>
            <p className="text-xs font-bold" style={{ color: '#8a8aa0' }}>restantes</p>
          </div>
        </div>
        <div style={{ height: 3, background: 'rgba(255,255,255,.1)', borderRadius: 99, marginBottom: 12, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: segundos < 120 ? '#f97316' : '#96C800', borderRadius: 99, transition: 'width 1s linear' }} />
        </div>
        {errorMsg && <p className="text-sm font-semibold text-center mb-2" style={{ color: '#ffb4b4' }}>{errorMsg}</p>}
        <button
          onClick={() => setConfirmando(true)}
          disabled={reclamando}
          style={{ width: '100%', padding: 12, background: '#96C800', color: '#0a1a00', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          {reclamando ? 'Procesando...' : 'Reclamar ahora'}
        </button>
      </div>
    </>
  );
}
