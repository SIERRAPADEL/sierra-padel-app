import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { destinoTrasEntrar } from '../lib/destino';
import { useAuth } from '../context/AuthContext';
import Isotipo from '../components/Isotipo';
import PinInput from '../components/PinInput';

const API = 'https://sierra-padel-backend-production-a55f.up.railway.app/api';

// Numero de WhatsApp del bot del club (el que los usuarios escriben)
// Cambiar si el numero cambia
const WA_BOT_NUMBER = '528662081434'; // WhatsApp del bot Sierra Padel

// step 1 → telefono
// step 2 → PIN
// step 3 → forgot: instruccion de WA + solicitar codigo
// step 4 → forgot: ingresar OTP + nuevo PIN

export default function Login() {
  const [step, setStep]         = useState(1);
  const [telefono, setTelefono] = useState('');
  const [pin, setPin]           = useState('');
  const [otp, setOtp]           = useState('');
  const [nuevoPin, setNuevoPin] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const { login, adoptarSesion } = useAuth();
  const navigate  = useNavigate();

  // ── Step 1: validar telefono ──────────────────────────────────────────────
  function handleTelefono(e) {
    e.preventDefault();
    const digits = telefono.replace(/[^0-9]/g, '');
    if (digits.length < 10) return setError('Ingresa tu numero de 10 digitos');
    setError('');
    setTelefono(digits);
    setStep(2);
  }

  // ── Step 2: login con PIN ─────────────────────────────────────────────────
  // Acepta pinDirecto para el auto-envío al completar los 4 dígitos (el estado
  // `pin` aún no está actualizado en ese momento).
  async function handlePin(e, pinDirecto) {
    e?.preventDefault?.();
    const pinFinal = pinDirecto || pin;
    if (loading) return;
    if (pinFinal.length < 4) return setError('Ingresa tu PIN de 4 digitos');
    setLoading(true);
    setError('');
    try {
      await login(telefono, pinFinal);
      navigate(destinoTrasEntrar(window.location.search));
    } catch (err) {
      setError(err.message || 'PIN incorrecto. Verifica e intenta de nuevo.');
      setPin('');
    } finally {
      setLoading(false);
    }
  }

  // ── Step 3→4: solicitar OTP (el backend lo envia por plantilla, sin necesidad
  // de que el usuario abra WhatsApp primero) ───────────────────────────────
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
      if (!data.ok) throw new Error(data.error || 'No se pudo enviar el codigo. Intenta de nuevo.');
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
    if (otp.replace(/[^0-9]/g, '').length < 6) return setError('Ingresa el codigo de 6 digitos que recibiste');
    if (nuevoPin.length < 4) return setError('Ingresa tu nuevo PIN de 4 digitos');
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefono, otp: otp.trim(), nuevo_pin: nuevoPin }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'El codigo es incorrecto o ya expiro. Solicita uno nuevo.');
      adoptarSesion(data.data.token, data.data.cliente);
      navigate(destinoTrasEntrar(window.location.search));
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
    setError('');
  }

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-sp-green flex flex-col items-center justify-center px-6 gap-8">
      <Isotipo className="w-16 h-16" />

      {/* ── STEP 1: Telefono ── */}
      {step === 1 && (
        <form onSubmit={handleTelefono} className="w-full max-w-xs flex flex-col gap-4">
          <div className="text-center">
            <p className="text-white font-black text-2xl">Sierra Padel</p>
            <p className="text-white/70 text-sm mt-1">Ingresa tu numero de WhatsApp</p>
          </div>
          <input
            type="tel"
            inputMode="numeric"
            placeholder="10 digitos (ej. 6641234567)"
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
            <Link to={`/registro${window.location.search}`} className="text-white font-semibold underline">Registrate aqui</Link>
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
            <PinInput value={pin} onChange={setPin} onComplete={v => handlePin(null, v)} />
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
              onClick={() => { setStep(3); setError(''); }}
              className="text-white/60 text-sm underline"
            >
              Olvide mi PIN
            </button>
            <button
              onClick={() => { setStep(1); setPin(''); setError(''); }}
              className="text-white/40 text-xs"
            >
              Cambiar numero
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Solicitar codigo (envio directo por plantilla) ── */}
      {step === 3 && (
        <div className="w-full max-w-xs flex flex-col gap-5">
          <div className="text-center">
            <p className="text-white font-black text-xl">Recuperar PIN</p>
            <p className="text-white/60 text-sm mt-1">
              Te enviaremos un codigo de 6 digitos por WhatsApp al {telefono}
            </p>
          </div>

          {error && <p className="text-yellow-300 text-sm text-center font-medium">{error}</p>}

          <button
            onClick={handleSolicitarOTP}
            className="w-full py-3 rounded-2xl bg-white text-sp-green font-black text-base"
            disabled={loading}
          >
            {loading ? 'Enviando codigo…' : 'Enviarme el codigo'}
          </button>

          <p className="text-white/40 text-xs text-center">
            ¿Problemas para recibirlo?{' '}
            <a
              href={`https://wa.me/${WA_BOT_NUMBER}?text=Hola`}
              target="_blank"
              rel="noreferrer"
              className="text-white/70 underline"
            >
              Escribenos por WhatsApp
            </a>
          </p>

          <button onClick={volverAlPin} className="text-white/40 text-xs text-center">
            ← Volver a ingresar PIN
          </button>
        </div>
      )}

      {/* ── STEP 4: OTP + nuevo PIN ── */}
      {step === 4 && (
        <form onSubmit={handleVerifyOtp} className="w-full max-w-xs flex flex-col gap-5">
          <div className="text-center">
            <p className="text-white font-black text-xl">Codigo enviado ✓</p>
            <p className="text-white/60 text-sm mt-1">
              Revisa tu WhatsApp en el numero {telefono}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <p className="text-white/80 text-xs font-semibold mb-2 ml-1">Codigo de 6 digitos</p>
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
              <p className="text-white/80 text-xs font-semibold mb-2 ml-1">Nuevo PIN de 4 digitos</p>
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
            onClick={() => { setStep(3); setOtp(''); setError(''); }}
            className="text-white/50 text-xs text-center underline"
          >
            No recibi el codigo — volver a solicitar
          </button>
        </form>
      )}
    </div>
  );
}
