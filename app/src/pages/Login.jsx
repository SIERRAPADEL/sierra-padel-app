import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Isotipo from '../components/Isotipo';
import PinInput from '../components/PinInput';

export default function Login() {
  const [step, setStep] = useState(1);
  const [telefono, setTelefono] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleTelefono(e) {
    e.preventDefault();
    if (telefono.length < 10) return setError('Ingresa tu número de 10 dígitos');
    setError('');
    setStep(2);
  }

  async function handlePin(e) {
    e.preventDefault();
    if (pin.length < 4) return setError('Ingresa tu PIN de 4 dígitos');
    setLoading(true);
    setError('');
    try {
      await login(telefono, pin);
      navigate('/home');
    } catch (err) {
      setError(err.message);
      setPin('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="w-full max-w-xs flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-3 mb-4">
          <Isotipo size={64} />
          <div className="text-center leading-tight">
            <div className="text-2xl font-black text-sp-gray tracking-widest">SIERRA</div>
            <div className="text-2xl font-black text-sp-gray tracking-widest">PADEL</div>
          </div>
        </div>

        {step === 1 ? (
          <form onSubmit={handleTelefono} className="w-full flex flex-col gap-4">
            <div>
              <label className="text-sm text-gray-500 font-medium mb-1 block">Teléfono</label>
              <input
                className="input-field"
                type="tel"
                placeholder="664 123 4567"
                value={telefono}
                onChange={e => setTelefono(e.target.value.replace(/\D/g, '').slice(0, 10))}
                autoFocus
              />
            </div>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button type="submit" className="btn-green">Continuar</button>
            <Link to="/registro" className="text-center text-sp-green text-sm font-medium">
              ¿Primera vez? Crear cuenta
            </Link>
          </form>
        ) : (
          <form onSubmit={handlePin} className="w-full flex flex-col gap-6">
            <div className="text-center">
              <p className="text-gray-500 text-sm">Ingresa tu PIN para</p>
              <p className="font-bold text-sp-gray">{telefono}</p>
            </div>
            <PinInput value={pin} onChange={setPin} />
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button type="submit" disabled={pin.length < 4 || loading} className="btn-green disabled:opacity-50">
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
            <button type="button" onClick={() => { setStep(1); setPin(''); setError(''); }} className="text-center text-gray-400 text-sm">
              Cambiar número
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
