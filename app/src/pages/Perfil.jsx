import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import PinInput from '../components/PinInput';

function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CCC" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function Icon({ d }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#96C800" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

// ── Pantalla: Mi información ──────────────────────────────────────────────────
function MiInformacion({ user, apiFetch, onBack, onUpdate }) {
  const [nombre, setNombre]   = useState(user?.nombre || '');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [saved, setSaved]     = useState(false);

  const changed = nombre.trim() !== (user?.nombre || '').trim() && nombre.trim().length > 0;

  async function handleSave() {
    if (!changed) return;
    if (nombre.trim().length < 2) return setError('El nombre debe tener al menos 2 caracteres');
    setLoading(true);
    setError('');
    try {
      const d = await apiFetch('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({ nombre: nombre.trim() }),
      });
      if (!d.ok) throw new Error(d.error || 'No se pudo guardar. Intenta de nuevo.');
      if (d.data?.token) {
        localStorage.setItem('sp_token', d.data.token);
        localStorage.setItem('sp_user', JSON.stringify(d.data.cliente));
      }
      setSaved(true);
      onUpdate && onUpdate(d.data?.cliente);
      setTimeout(() => { setSaved(false); onBack(); }, 1500);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="bg-sp-gray px-5 pt-[env(safe-area-inset-top)] pb-4">
        <button onClick={onBack} className="flex items-center gap-1 text-white/70 text-sm mb-2 -ml-1">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Perfil
        </button>
        <p className="text-white font-black text-lg">Mi información</p>
      </div>

      <div className="px-4 py-5 flex flex-col gap-4">
        <div className="card flex flex-col gap-3">
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Nombre completo</p>
            <input
              type="text"
              value={nombre}
              onChange={e => { setNombre(e.target.value); setError(''); setSaved(false); }}
              className="input-field"
              placeholder="Tu nombre"
            />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Teléfono</p>
            <p className="text-sp-gray font-semibold px-1">{user?.telefono || '—'}</p>
            <p className="text-xs text-gray-400 px-1">El teléfono no se puede cambiar</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
            <p className="text-red-600 text-sm font-medium">{error}</p>
          </div>
        )}

        {saved && (
          <div className="bg-sp-green-light border border-sp-green/20 rounded-2xl px-4 py-3">
            <p className="text-sp-green-dark text-sm font-medium">✓ Nombre actualizado correctamente</p>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={!changed || loading}
          className={`w-full py-3 rounded-2xl font-black text-base transition-all ${
            changed && !loading
              ? 'bg-sp-green text-white'
              : 'bg-gray-100 text-gray-400'
          }`}
        >
          {loading ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}

// ── Pantalla: Cambiar PIN ─────────────────────────────────────────────────────
function CambiarPin({ apiFetch, onBack }) {
  const [pinStep, setPinStep]         = useState(1); // 1=actual, 2=nuevo, 3=confirmar
  const [pinActual, setPinActual]     = useState('');
  const [pinNuevo, setPinNuevo]       = useState('');
  const [pinConfirm, setPinConfirm]   = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState(false);

  function handlePinActualChange(val) {
    setPinActual(val);
    setError('');
    if (val.length === 4) setPinStep(2);
  }

  function handlePinNuevoChange(val) {
    setPinNuevo(val);
    setError('');
    if (val.length === 4) setPinStep(3);
  }

  async function handlePinConfirmChange(val) {
    setPinConfirm(val);
    setError('');
    if (val.length === 4) {
      if (val !== pinNuevo) {
        setError('Los PINs no coinciden. Vuelve a intentarlo.');
        setPinNuevo('');
        setPinConfirm('');
        setPinStep(2);
        return;
      }
      setLoading(true);
      try {
        const d = await apiFetch('/auth/change-pin', {
          method: 'POST',
          body: JSON.stringify({ pin_actual: pinActual, pin_nuevo: pinNuevo }),
        });
        if (!d.ok) throw new Error(d.error || 'No se pudo cambiar el PIN. Intenta de nuevo.');
        setSuccess(true);
      } catch (e) {
        setError(e.message);
        setPinActual('');
        setPinNuevo('');
        setPinConfirm('');
        setPinStep(1);
      } finally {
        setLoading(false);
      }
    }
  }

  if (success) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <div className="bg-sp-gray px-5 pt-[env(safe-area-inset-top)] pb-4">
          <p className="text-white font-black text-lg pt-8">Cambiar PIN</p>
        </div>
        <div className="flex flex-col items-center justify-center flex-1 gap-5 px-6">
          <div className="w-20 h-20 rounded-full bg-sp-green-light flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#96C800" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <p className="text-xl font-black text-sp-gray text-center">PIN actualizado</p>
          <p className="text-gray-500 text-sm text-center">Tu nuevo PIN está activo. Úsalo la próxima vez que entres a la app.</p>
          <button className="btn-green w-full max-w-xs" onClick={onBack}>Volver a perfil</button>
        </div>
      </div>
    );
  }

  const labels = ['PIN actual', 'PIN nuevo', 'Confirmar PIN nuevo'];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="bg-sp-gray px-5 pt-[env(safe-area-inset-top)] pb-4">
        <button onClick={onBack} className="flex items-center gap-1 text-white/70 text-sm mb-2 -ml-1">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Perfil
        </button>
        <p className="text-white font-black text-lg">Cambiar PIN</p>
      </div>

      <div className="flex flex-col items-center justify-center flex-1 gap-6 px-6 pb-12">
        {/* Stepper */}
        <div className="flex items-center gap-2">
          {[1,2,3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                s === pinStep ? 'bg-sp-green text-white' :
                s < pinStep  ? 'bg-sp-green/20 text-sp-green' : 'bg-gray-100 text-gray-400'
              }`}>{s < pinStep ? '✓' : s}</div>
              {s < 3 && <div className={`w-8 h-0.5 ${s < pinStep ? 'bg-sp-green/40' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="text-center">
          <p className="text-sp-gray font-black text-lg">{labels[pinStep - 1]}</p>
          {pinStep === 1 && <p className="text-gray-400 text-sm mt-1">Ingresa tu PIN actual para continuar</p>}
          {pinStep === 2 && <p className="text-gray-400 text-sm mt-1">Elige un PIN de 4 dígitos nuevo</p>}
          {pinStep === 3 && <p className="text-gray-400 text-sm mt-1">Repite el nuevo PIN para confirmar</p>}
        </div>

        {pinStep === 1 && <PinInput value={pinActual} onChange={handlePinActualChange} />}
        {pinStep === 2 && <PinInput value={pinNuevo} onChange={handlePinNuevoChange} />}
        {pinStep === 3 && <PinInput value={pinConfirm} onChange={handlePinConfirmChange} />}

        {loading && <p className="text-sp-green text-sm font-semibold">Guardando…</p>}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 w-full max-w-xs">
            <p className="text-red-600 text-sm font-medium text-center">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Pantalla principal: Perfil ────────────────────────────────────────────────
export default function Perfil() {
  const { user, logout, updateUser } = useAuth();
  const { apiFetch }                 = useApi();
  const navigate                     = useNavigate();
  const [subScreen, setSubScreen]    = useState(null); // null | 'info' | 'pin'

  function handleLogout() {
    logout();
    navigate('/');
  }

  if (subScreen === 'info') {
    return (
      <MiInformacion
        user={user}
        apiFetch={apiFetch}
        onBack={() => setSubScreen(null)}
        onUpdate={updateUser}
      />
    );
  }

  if (subScreen === 'pin') {
    return (
      <CambiarPin
        apiFetch={apiFetch}
        onBack={() => setSubScreen(null)}
      />
    );
  }

  const inicial = (user?.nombre || '?').charAt(0).toUpperCase();

  return (
    <div className="page safe-bottom">
      {/* Header */}
      <div className="bg-sp-green px-5 pt-[env(safe-area-inset-top)] pb-6">
        <p className="text-white font-black text-lg pt-3">Perfil</p>
        <div className="flex items-center gap-4 mt-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-white font-black text-2xl">{inicial}</span>
          </div>
          <div>
            <p className="text-white font-black text-lg leading-tight">{user?.nombre || 'Jugador'}</p>
            <p className="text-white/60 text-sm">{user?.telefono || ''}</p>
          </div>
        </div>
      </div>

      {/* Menú */}
      <div className="px-4 py-4 flex flex-col gap-2">
        <div className="card p-0 overflow-hidden">
          <button
            onClick={() => setSubScreen('info')}
            className="w-full flex items-center justify-between px-4 py-4 border-b border-gray-50 active:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <Icon d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" />
              <span className="text-sp-gray font-semibold text-sm">Mi información</span>
            </div>
            <ChevronRight />
          </button>
          <button
            onClick={() => setSubScreen('pin')}
            className="w-full flex items-center justify-between px-4 py-4 active:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <span className="text-sp-gray font-semibold text-sm">Cambiar PIN</span>
            </div>
            <ChevronRight />
          </button>
        </div>

        <button
          onClick={handleLogout}
          className="card flex items-center gap-3 px-4 py-4 w-full text-left active:bg-red-50"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          <span className="text-red-500 font-semibold text-sm">Cerrar sesión</span>
        </button>
      </div>

      <p className="text-center text-xs text-gray-300 mt-4">Sierra Pádel v1.0</p>
    </div>
  );
}
