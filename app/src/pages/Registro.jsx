import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Isotipo from '../components/Isotipo';
import PinInput from '../components/PinInput';

export default function Registro() {
  const [step, setStep] = useState(1);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
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

  async function handlePin(e) {
    e.preventDefault();
    if (pin.length < 4) return setError('Ingresa un PIN de 4 digitos');
    if (pin !== pinConfirm) return setError('Los PINs no coinciden');
    setLoading(true);
    setError('');
    try {
      await registro(nombre.trim(), telefono, pin);
      navigate('/home');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="w-full max-w-xs flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-3 mb-2">
          <Isotipo size={52} />
          <div className="text-center leading-tight">
            <div className="text-xl font-black text-sp-gray tracking-widest">SIERRA PADEL</div>
            <div className="text-sm text-gray-400 mt-1 font-medium">Crear cuenta</div>
          </div>
        </div>

        {step === 1 ? (
          <form onSubmit={handleDatos} className="w-full flex flex-col gap-4">
            <div>
              <label className="text-sm text-gray-500 font-medium mb-1 block">Nombre completo</label>
              <input className="input-field" type="text" placeholder="Tu nombre" value={nombre} onChange={e => setNombre(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="text-sm text-gray-500 font-medium mb-1 block">Telefono</label>
              <input className="input-field" type="tel" placeholder="664 123 4567" value={telefono} onChange={e => setTelefono(e.target.value.replace(/\D/g, '').slice(0, 10))} />
            </div>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button type="submit" className="btn-green">Continuar</button>
            <Link to="/login" className="text-center text-gray-400 text-sm">¿Ya tienes cuenta? Entrar</Link>
          </form>
        ) : (
          <form onSubmit={handlePin} className="w-full flex flex-col gap-5">
            <div>
              <p className="text-center text-sm text-gray-500 mb-4">Crea un PIN de 4 digitos</p>
              <PinInput value={pin} onChange={setPin} />
            </div>
            <div>
              <p className="text-center text-sm text-gray-500 mb-4">Confirma tu PIN</p>
              <PinInput value={pinConfirm} onChange={setPinConfirm} />
            </div>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button type="submit" disabled={pin.length < 4 || pinConfirm.length < 4 || loading} className="btn-green disabled:opacity-50">
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
            <button type="button" onClick={() => { setStep(1); setPin(''); setPinConfirm(''); setError(''); }} className="text-center text-gray-400 text-sm">
              Atras
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
