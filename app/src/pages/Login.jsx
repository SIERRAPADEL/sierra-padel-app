import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Isotipo from '../components/Isotipo';
import PinInput from '../components/PinInput';

const API = 'https://sierra-padel-backend-production-a55f.up.railway.app/api';

// Número de WhatsApp del bot del club (el que los usuarios escriben)
// Cambiar si el número cambia
const WA_BOT_NUMBER = '528662081434'; // WhatsApp del bot Sierra Pádel

// step 1 → teléfono
// step 2 → PIN
// step 3 → forgot: instrucción de WA + solicitar código
// step 4 → forgot: ingresar OTP + nuevo PIN

export default function Login() {
  const [step, setStep]         = useState(1);
  const [telefono, setTelefono] = useState('');
  const [pin, setPin]           = useState('');
  const [otp, setOtp]           = useState('');
  const [nuevoPin, setNuevoPin] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [waAbierto, setWaAbierto] = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  // ── Step 1: validar teléfono ──────────────────────────────────────────────
  function handleTelefono(e) {
    e.preventDefault();
    const digits = telefono.replace(/[^0-9]/g, '');
    if (digits.length < 10) return setError('Ingresa tu número de 10 dígitos');
    setError('');
    setTelefono(digits);
    setStep(2);
  }

  // ── Step 2: login con PIN ─────────────────────────────────────────────────
  async function handlePin(e) {
    e.preventDefault();
    if (pin.length < 4) return setError('Ingresa tu PIN de 4 dígitos');
    setLoading(true);
    setError('');
    try {
      await login(telefono, pin);
      navigate('/home');
    } catch (err) {
      setError(err.message || 'PIN incorrecto. Verifica e intenta de nuevo.');
      setPin('');
    } finally {
      setLoading(false);
    }
  }

  // ── Step 3: instrucción de abrir WA antes de pedir el código ─────────────
  function handleAbrirWA() {
    const link = `https://wa.me/${WA_BOT_NUMBER}?text=Hola`;
    window.open(link, '_blank');
    setWaAbierto(true);
  }

  // ── Step 3→4: solicitar OTP (solo después de que el usuario abrió WA) ───
  async function handleSolicitarOTP() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/auth/forgot-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefono }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'No se pudo enviar el código. Intenta de nuevo.');
      setStep(4);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Step 4: verificar OTP + establecer nuevo PIN ──────────────────────────
  async function handleVerifyOtp(e) {
    e.preventDefault();
    if (otp.replace(/[^0-9]/g, '').length < 6) return setError('Ingresa el código de 6 dígitos que recibiste');
    if (nuevoPin.length < 4) return setError('Ingresa tu nuevo PIN de 4 dígitos');
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefono, otp: otp.trim(), nuevo_pin: nuevoPin }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'El código es incorrecto o ya expiró. Solicita uno nuevo.');
      localStorage.setItem('sp_token', data.data.token);
      localStorage.setItem('sp_user', JSON.stringify(data.data.cliente));
      navigate('/home');
    } catch (err) {
      setError(err.message);
      setOtp('');
    } finally {
      setLoading(false);
    }
  }

  function volverAlPin() {
    setStep(2);
    setOtp('');
    setNuevoPin('');
    setWaAbierto(false);
    setError('');
  }

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-sp-green flex flex-col items-center justify-center px-6 gap-8">
      <Isotipo className="w-16 h-16" />

      {/* ── STEP 1: Teléfono ── */}
      {step === 1 && (
        <form onSubmit={handleTelefono} className="w-full max-w-xs flex flex-col gap-4">
          <div className="text-center">
            <p className="text-white font-black text-2xl">Sierra Pádel</p>
            <p className="text-white/70 text-sm mt-1">Ingresa tu número de WhatsApp</p>
          </div>
          <input
            type="tel"
            inputMode="numeric"
            placeholder="10 dígitos (ej. 6641234567)"
            value={telefono}
            onChange={e => { setTelefono(e.target.value.replace(/[^0-9]/g, '').slice(0, 10)); setError(''); }}
            className="input-field text-center text-lg tracking-widest"
            maxLength={10}
            autoFocus
          />
          {error && <p className="text-yellow-300 text-sm text-center font-medium">{error}</p>}
          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-white text-sp-green font-black text-base"
            disabled={telefono.replace(/[^0-9]/g, '').length < 10}
          >
            Continuar
          </button>
          <p className="text-white/50 text-xs text-center">
            ¿No tienes cuenta?{' '}
            <a href="/registro" className="text-white font-semibold underline">Regístrate aquí</a>
          </p>
        </form>
      )}

      {/* ── STEP 2: PIN ── */}
      {step === 2 && (
        <div className="w-full max-w-xs flex flex-col gap-5">
          <div className="text-center">
            <p className="text-white font-black text-xl">Ingresa tu PIN</p>
            <p className="text-white/60 text-sm mt-1">{telefono}</p>
          </div>
          <form onSubmit={handlePin} className="flex flex-col gap-4">
            <PinInput value={pin} onChange={setPin} onComplete={handlePin} />
            {error && <p className="text-yellow-300 text-sm text-center font-medium">{error}</p>}
            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-white text-sp-green font-black text-base"
              disabled={pin.length < 4 || loading}
            >
              {loading ? 'Verificando…' : 'Entrar'}
            </button>
          </form>
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => { setStep(3); setError(''); setWaAbierto(false); }}
              className="text-white/60 text-sm underline"
            >
              Olvidé mi PIN
            </button>
            <button
              onClick={() => { setStep(1); setPin(''); setError(''); }}
              className="text-white/40 text-xs"
            >
              Cambiar número
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Instrucción WA ── */}
      {step === 3 && (
        <div className="w-full max-w-xs flex flex-col gap-5">
          <div className="text-center">
            <p className="text-white font-black text-xl">Recuperar PIN</p>
            <p className="text-white/60 text-sm mt-1">Te enviaremos un código por WhatsApp</p>
          </div>

          <div className="bg-white/10 rounded-2xl p-4 flex flex-col gap-3">
            <p className="text-white text-sm font-semibold">
              📱 Paso 1: Abre el chat de Sierra Pádel en WhatsApp
            </p>
            <p className="text-white/70 text-xs">
              Para enviarte el código necesitamos que primero nos escribas. Si ya tienes una conversación activa con nosotros, puedes omitir este paso.
            </p>
            <button
              onClick={handleAbrirWA}
              className="w-full py-3 rounded-xl bg-[#25D366] text-white font-bold text-sm flex items-center justify-center gap-2"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.121 1.531 5.847L0 24l6.335-1.654A11.955 11.955 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.87 0-3.628-.49-5.153-1.349L2 22l1.386-4.763A9.953 9.953 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
              </svg>
              Abrir WhatsApp del club
            </button>
            {waAbierto && (
              <p className="text-green-300 text-xs text-center">✓ Listo, ya puedes solicitar tu código</p>
            )}
          </div>

          {error && <p className="text-yellow-300 text-sm text-center font-medium">{error}</p>}

          <button
            onClick={handleSolicitarOTP}
            className={`w-full py-3 rounded-2xl font-black text-base transition-all ${
              waAbierto
                ? 'bg-white text-sp-green'
                : 'bg-white/30 text-white/60'
            }`}
            disabled={loading}
          >
            {loading ? 'Enviando código…' : waAbierto ? 'Enviar código de verificación' : 'Paso 2: Solicitar código'}
          </button>

          <button onClick={volverAlPin} className="text-white/40 text-xs text-center">
            ← Volver a ingresar PIN
          </button>
        </div>
      )}

      {/* ── STEP 4: OTP + nuevo PIN ── */}
      {step === 4 && (
        <form onSubmit={handleVerifyOtp} className="w-full max-w-xs flex flex-col gap-5">
          <div className="text-center">
            <p className="text-white font-black text-xl">Código enviado ✓</p>
            <p className="text-white/60 text-sm mt-1">
              Revisa tu WhatsApp en el número {telefono}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <p className="text-white/80 text-xs font-semibold mb-2 ml-1">Código de 6 dígitos</p>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="_ _ _ _ _ _"
                value={otp}
                onChange={e => { setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6)); setError(''); }}
                className="input-field text-center text-2xl tracking-[0.5em] font-bold"
                maxLength={6}
                autoFocus
              />
            </div>
            <div>
              <p className="text-white/80 text-xs font-semibold mb-2 ml-1">Nuevo PIN de 4 dígitos</p>
              <PinInput value={nuevoPin} onChange={setNuevoPin} />
            </div>
          </div>

          {error && <p className="text-yellow-300 text-sm text-center font-medium">{error}</p>}

          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-white text-sp-green font-black text-base"
            disabled={otp.length < 6 || nuevoPin.length < 4 || loading}
          >
            {loading ? 'Verificando…' : 'Cambiar PIN y entrar'}
          </button>

          <button
            type="button"
            onClick={() => { setStep(3); setWaAbierto(true); setOtp(''); setError(''); }}
            className="text-white/50 text-xs text-center underline"
          >
            No recibí el código — volver a solicitar
          </button>
        </form>
      )}
    </div>
  );
}
