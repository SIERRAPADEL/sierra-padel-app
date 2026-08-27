import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { destinoTrasEntrar } from '../lib/destino';
import { useAuth } from '../context/AuthContext';
import Isotipo from '../components/Isotipo';
import PinInput from '../components/PinInput';
import NivelSelector from '../components/NivelSelector';

// Registro en 3 pasos: datos → nivel de juego (obligatorio) → PIN + casillas.
// Las DOS casillas (términos y avisos) son obligatorias para crear la cuenta.
export default function Registro() {
  const [step, setStep] = useState(1);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  // 🎂 OPCIONAL a propósito (German 27-ago-2026): un campo obligatorio más en el alta es un
  // motivo más para abandonarla, y al que no la ponga aquí se la pedimos en su Perfil.
  const [cumple, setCumple] = useState('');
  const [nivel, setNivel] = useState(null);
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [aceptaAvisos, setAceptaAvisos] = useState(true); // pre-marcada (se puede desmarcar, pero es requisito)
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { registro } = useAuth();
  const navigate = useNavigate();

  function handleDatos(e) {
    e.preventDefault();
    if (!nombre.trim()) return setError('Ingresa tu nombre');
    if (telefono.length < 10) return setError('Ingresa tu numero de 10 digitos');
    setError('');
    setStep(2);
  }

  function handleNivel() {
    if (!nivel) return setError('Elige tu nivel de juego para continuar');
    setError('');
    setStep(3);
  }

  async function handlePin(e) {
    e.preventDefault();
    if (pin.length < 4) return setError('Ingresa un PIN de 4 digitos');
    if (pin !== pinConfirm) return setError('Los PINs no coinciden');
    if (!aceptaTerminos) return setError('Debes aceptar los terminos y condiciones');
    if (!aceptaAvisos) return setError('Debes aceptar recibir avisos del club');
    setLoading(true);
    setError('');
    try {
      await registro(nombre.trim(), telefono, pin, {
        categoria: nivel,
        acepto_terminos: true,
        acepta_avisos: true,
        fecha_nacimiento: cumple || null,
      });
      // Marca para que la app ofrezca activar notificaciones push de inmediato
      localStorage.setItem('recienRegistrado', '1');
      navigate(destinoTrasEntrar(window.location.search));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full bg-white flex flex-col items-center justify-center px-6 py-8" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="w-full max-w-xs flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-3 mb-1">
          <Isotipo size={52} />
          <div className="text-center leading-tight">
            <div className="text-xl font-black text-sp-gray tracking-widest">SIERRA PADEL</div>
            <div className="text-sm text-gray-400 mt-1 font-medium">Crear cuenta</div>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                s === step ? 'bg-sp-green text-white' :
                s < step  ? 'bg-sp-green/20 text-sp-green' : 'bg-gray-100 text-gray-400'
              }`}>{s < step ? '✓' : s}</div>
              {s < 3 && <div className={`w-8 h-0.5 ${s < step ? 'bg-sp-green/40' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {/* ── Paso 1: Datos ── */}
        {step === 1 && (
          <form onSubmit={handleDatos} className="w-full flex flex-col gap-4">
            <div>
              <label className="text-sm text-gray-500 font-medium mb-1 block">Nombre completo</label>
              <input className="input-field" type="text" placeholder="Tu nombre" value={nombre} onChange={e => setNombre(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="text-sm text-gray-500 font-medium mb-1 block">Telefono (WhatsApp)</label>
              <input className="input-field" type="tel" placeholder="866 123 4567" value={telefono} onChange={e => setTelefono(e.target.value.replace(/\D/g, '').slice(0, 10))} />
            </div>
            <div>
              <label className="text-sm text-gray-500 font-medium mb-1 block">Tu cumpleanos <span className="text-gray-400 font-normal">(opcional)</span></label>
              <input
                className="input-field"
                type="date"
                value={cumple}
                max={new Date(Date.now() - 6 * 3600 * 1000).toISOString().slice(0, 10)}
                onChange={e => setCumple(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">🎉 Para mandarte tu promo de cumpleanos y avisarte con tiempo.</p>
            </div>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button type="submit" className="btn-green">Continuar</button>
            <Link to={`/login${window.location.search}`} className="text-center text-gray-400 text-sm">¿Ya tienes cuenta? Entrar</Link>
          </form>
        )}

        {/* ── Paso 2: Nivel de juego ── */}
        {step === 2 && (
          <div className="w-full flex flex-col gap-4">
            <div className="text-center">
              <p className="text-sp-gray font-black text-lg">¿Cual es tu nivel de juego?</p>
              <p className="text-gray-400 text-sm mt-1">Con esto te avisamos de retas y torneos de tu nivel</p>
            </div>
            <NivelSelector value={nivel} onChange={n => { setNivel(n); setError(''); }} />
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button type="button" onClick={handleNivel} disabled={!nivel} className="btn-green disabled:opacity-50">Continuar</button>
            <button type="button" onClick={() => { setStep(1); setError(''); }} className="text-center text-gray-400 text-sm">Atras</button>
          </div>
        )}

        {/* ── Paso 3: PIN + casillas ── */}
        {step === 3 && (
          <form onSubmit={handlePin} className="w-full flex flex-col gap-5">
            <div>
              <p className="text-center text-sm text-gray-500 mb-4">Crea un PIN de 4 digitos</p>
              <PinInput value={pin} onChange={setPin} />
            </div>
            <div>
              <p className="text-center text-sm text-gray-500 mb-4">Confirma tu PIN</p>
              <PinInput value={pinConfirm} onChange={setPinConfirm} />
            </div>

            {/* Casillas obligatorias */}
            <div className="flex flex-col gap-3">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={aceptaTerminos}
                  onChange={e => { setAceptaTerminos(e.target.checked); setError(''); }}
                  className="mt-0.5 w-4 h-4 accent-[#96C800]"
                />
                <span className="text-[13px] text-gray-600 leading-snug">
                  Acepto los{' '}
                  <Link to="/terminos" className="text-sp-green-dark font-semibold underline">terminos y condiciones</Link>
                  {' '}de Sierra Padel
                </span>
              </label>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={aceptaAvisos}
                  onChange={e => { setAceptaAvisos(e.target.checked); setError(''); }}
                  className="mt-0.5 w-4 h-4 accent-[#96C800]"
                />
                <span className="text-[13px] text-gray-600 leading-snug">
                  Acepto recibir avisos del club: confirmaciones, retas de mi nivel y promociones (puedes desactivarlos despues en tu Perfil)
                </span>
              </label>
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button
              type="submit"
              disabled={pin.length < 4 || pinConfirm.length < 4 || !aceptaTerminos || !aceptaAvisos || loading}
              className="btn-green disabled:opacity-50"
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
            <button type="button" onClick={() => { setStep(2); setPin(''); setPinConfirm(''); setError(''); }} className="text-center text-gray-400 text-sm">
              Atras
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
