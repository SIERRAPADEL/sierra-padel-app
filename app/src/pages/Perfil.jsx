import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import PinInput from '../components/PinInput';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

function isPushSupported() {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    Boolean(VAPID_PUBLIC_KEY)
  );
}

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

function BackBtn({ onBack, label = 'Perfil' }) {
  return (
    <button onClick={onBack} className="flex items-center gap-1 text-white/70 text-sm mb-2 -ml-1">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {label}
    </button>
  );
}

// ââ Pantalla: Mi informaciÃ³n ââââââââââââââââââââââââââââââââââââââââââââââââââ
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
        <BackBtn onBack={onBack} />
        <p className="text-white font-black text-lg">Mi informaciÃ³n</p>
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
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">TelÃ©fono</p>
            <p className="text-sp-gray font-semibold px-1">{user?.telefono || 'â'}</p>
            <p className="text-xs text-gray-400 px-1">El telÃ©fono no se puede cambiar</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
            <p className="text-red-600 text-sm font-medium">{error}</p>
          </div>
        )}

        {saved && (
          <div className="bg-sp-green-light border border-sp-green/20 rounded-2xl px-4 py-3">
            <p className="text-sp-green-dark text-sm font-medium">â Nombre actualizado correctamente</p>
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
          {loading ? 'Guardandoâ¦' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}

// ââ Pantalla: Cambiar PIN âââââââââââââââââââââââââââââââââââââââââââââââââââââ
function CambiarPin({ apiFetch, onBack }) {
  const [pinStep, setPinStep]         = useState(1);
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
          <p className="text-gray-500 text-sm text-center">Tu nuevo PIN estÃ¡ activo. Ãsalo la prÃ³xima vez que entres a la app.</p>
          <button className="btn-green w-full max-w-xs" onClick={onBack}>Volver a perfil</button>
        </div>
      </div>
    );
  }

  const labels = ['PIN actual', 'PIN nuevo', 'Confirmar PIN nuevo'];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="bg-sp-gray px-5 pt-[env(safe-area-inset-top)] pb-4">
        <BackBtn onBack={onBack} />
        <p className="text-white font-black text-lg">Cambiar PIN</p>
      </div>

      <div className="flex flex-col items-center justify-center flex-1 gap-6 px-6 pb-12">
        <div className="flex items-center gap-2">
          {[1,2,3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                s === pinStep ? 'bg-sp-green text-white' :
                s < pinStep  ? 'bg-sp-green/20 text-sp-green' : 'bg-gray-100 text-gray-400'
              }`}>{s < pinStep ? 'â' : s}</div>
              {s < 3 && <div className={`w-8 h-0.5 ${s < pinStep ? 'bg-sp-green/40' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="text-center">
          <p className="text-sp-gray font-black text-lg">{labels[pinStep - 1]}</p>
          {pinStep === 1 && <p className="text-gray-400 text-sm mt-1">Ingresa tu PIN actual para continuar</p>}
          {pinStep === 2 && <p className="text-gray-400 text-sm mt-1">Elige un PIN de 4 dÃ­gitos nuevo</p>}
          {pinStep === 3 && <p className="text-gray-400 text-sm mt-1">Repite el nuevo PIN para confirmar</p>}
        </div>

        {pinStep === 1 && <PinInput value={pinActual} onChange={handlePinActualChange} />}
        {pinStep === 2 && <PinInput value={pinNuevo} onChange={handlePinNuevoChange} />}
        {pinStep === 3 && <PinInput value={pinConfirm} onChange={handlePinConfirmChange} />}

        {loading && <p className="text-sp-green text-sm font-semibold">Guardandoâ¦</p>}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 w-full max-w-xs">
            <p className="text-red-600 text-sm font-medium text-center">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ââ Pantalla: Notificaciones ââââââââââââââââââââââââââââââââââââââââââââââââââ
function Notificaciones({ apiFetch, onBack }) {
  const [permission, setPermission] = useState(
    isPushSupported() ? Notification.permission : 'unsupported'
  );
  const [subscribed, setSubscribed] = useState(
    () => Boolean(localStorage.getItem('pushSubscribed'))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isPushSupported()) return;
    navigator.serviceWorker.ready.then(reg =>
      reg.pushManager.getSubscription()
    ).then(sub => {
      if (!sub) {
        localStorage.removeItem('pushSubscribed');
        setSubscribed(false);
      }
    }).catch(() => {});
  }, []);

  const handleActivate = useCallback(async () => {
    if (!isPushSupported()) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }
      const result = await apiFetch('/auth/push-subscription', {
        method: 'POST',
        body: JSON.stringify(sub.toJSON()),
      });
      if (!result.ok) throw new Error(result.error || 'No se pudo activar.');
      localStorage.setItem('pushSubscribed', '1');
      setSubscribed(true);
      setPermission(Notification.permission);
      setSuccess('Â¡Notificaciones activadas correctamente!');
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setPermission('denied');
        setError('Permiso denegado. ActÃ­valo desde la configuraciÃ³n de tu dispositivo.');
      } else {
        setError(err.message || 'Error al activar notificaciones.');
      }
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  const handleDeactivate = useCallback(async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      localStorage.removeItem('pushSubscribed');
      setSubscribed(false);
      setSuccess('Notificaciones desactivadas.');
    } catch (err) {
      setError('No se pudo desactivar. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, []);

  const isActive = permission === 'granted' && subscribed;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="bg-sp-gray px-5 pt-[env(safe-area-inset-top)] pb-4">
        <BackBtn onBack={onBack} />
        <p className="text-white font-black text-lg">Notificaciones</p>
      </div>

      <div className="px-4 py-5 flex flex-col gap-4">
        <div className="card flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div style={{ width: 44, height: 44, borderRadius: 12, background: isActive ? '#96C800' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                ð
              </div>
              <div>
                <p className="text-sp-gray font-bold text-sm">Notificaciones push</p>
                <p className="text-xs mt-0.5" style={{ color: isActive ? '#96C800' : permission === 'denied' ? '#EF4444' : '#9CA3AF' }}>
                  {isActive ? 'Activas' : permission === 'denied' ? 'Bloqueadas' : 'Inactivas'}
                </p>
              </div>
            </div>
            <div style={{
              width: 44, height: 26, borderRadius: 13,
              background: isActive ? '#96C800' : '#E5E7EB',
              position: 'relative', transition: 'background 0.2s',
  2           display: 'flex', alignItems: 'center', padding: '0 3px',
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%', background: 'white',
                boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                transform: isActive ? 'translateX(18px)' : 'translateX(0)',
                transition: 'transform 0.2s',
              }} />
            </div>
          </div>

          <div style={{ background: '#f9fafb', borderRadius: 10, padding: '10px 12px' }}>
            {[
              { icon: 'ð', text: 'ConfirmaciÃ³n de reservas al instante' },
              { icon: 'ð', text: 'Novedades de tus torneos' },
              { icon: 'â­', text: 'Puntos y promociones del club' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-2 py-1" style={{ fontSize: 12, color: '#555' }}>
                <span style={{ fontSize: 14 }}>{icon}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
            <p className="text-red-600 text-sm font-medium">{error}</p>
          </div>
        )}
        {success && (
          <div className="rounded-2xl px-4 py-3" style={{ background: '#f0f9e8', border: '1px solid #c5e68c' }}>
            <p className="text-sm font-medium" style={{ color: '#5a8a00' }}>â {success}</p>
          </div>
        )}

        {permission === 'unsupported' ? (
     0    <div className="card text-center py-4">
            <p className="text-gray-400 text-sm">Tu dispositivo no soporta notificaciones push.</p>
          </div>
        ) : permission === 'denied' ? (
          <div className="card text-center py-4 flex flex-col gap-2">
            <p className="text-gray-500 text-sm font-medium">Permiso bloqueado</p>
            <p className="text-gray-400 text-xs">Ve a ConfiguraciÃ³n â Safari / Chrome â Notificaciones y actÃ­valas para Sierra PÃ¡del.</p>
          </div>
        ) : isActive ? (
          <button
            onClick={handleDeactivate}
            disabled={loading}
            className="w-full py-3 rounded-2xl font-bold text-sm border border-red-200 text-red-500 bg-red-50 active:bg-red-100 transition-all"
          >
            {loading ? 'Desactivandoâ¦' : 'Desactivar notificaciones'}
          </button>
        ) : (
          <button
            onClick={handleActivate}
            disabled={loading}
            className="w-full py-3 rounded-2xl font-black text-base transition-all"
            style={{ background: loading ? '#c8e87a' : '#96C800', color: '#111' }}
          >
            {loading ? 'Activandoâ¦' : 'Activar notificaciones'}
          </button>
        )}
      </div>
    </div>
  );
}

// ââ Pantalla principal: Perfil ââââââââââââââââââââââââââââââââââââââââââââââââ
export default function Perfil() {
  const { user, logout, updateUser } = useAuth();
  const { apiFetch }                 = useApi();
  const navigate                     = useNavigate();
  const [subScreen, setSubScreen]    = useState(null);

  const pushPermission = isPushSupported() ? Notification.permission : 'unsupported';
  const pushSubscribed = Boolean(localStorage.getItem('pushSubscribed'));
  const notifStatus = pushPermission === 'granted' && pushSubscribed
    ? 'on'
    : pushPermission === 'denied'
    ? 'off'
    : 'none';

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
  if (subScreen === 'notif') {
    return (
      <Notificaciones
        apiFetch={apiFetch}
        onBack={() => setSubScreen(null)}
      />
    );
  }

  const inicial = (user?.nombre || '?').charAt(0).toUpperCase();

  return (
    <div className="page safe-bottom">
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

      <div className="px-4 py-4 flex flex-col gap-2">
        <div className="card p-0 overflow-hidden">
          <button
            onClick={() => setSubScreen('info')}
            className="w-full flex items-center justify-between px-4 py-4 border-b border-gray-50 active:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <Icon d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" />
              <span className="text-sp-gray font-semibold text-sm">Mi informaciÃ³n</span>
            </div>
            <ChevronRight />
          </button>

          <button
            onClick={() => setSubScreen('pin')}
            className="w-full flex items-center justify-between px-4 py-4 border-b border-gray-50 active:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        2        <span className="text-sp-gray font-semibold text-sm">Cambiar PIN</span>
            </div>
            <ChevronRight />
          </button>

          <button
            onClick={() => setSubScreen('notif')}
               className="w-full flex items-center justify-between px-4 py-4 active:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <Icon d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
              <span className="text-sp-gray font-semibold text-sm">Notificaciones</span>
            </div>
            <div className="flex items-center gap-2">
              {notifStatus === 'on' && (
 2              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: '#f0f9e8', color: '#5a8a00' }}>Activas</span>
              )}
              {notifStatus === 'off' && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-400">Bloqueadas</span>
              )}
              <ChevronRight />
            </div>
          </button>
        </div>

        <button
   2      onClick={handleLogout}
          className="card flex items-center gap-3 px-4 py-4 w-full text-left active:bg-red-50"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          <span className="text-red-500 font-semibold text-sm">Cerrar sesiÃ³n</span>
        </button>
      </div>

      <p className="text-center text-xs text-gray-300 mt-4">Sierra PÃ¡del v1.0</p>
    </div>
  );
}
