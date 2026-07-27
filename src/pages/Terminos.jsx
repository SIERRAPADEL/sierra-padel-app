import { useNavigate } from 'react-router-dom';
import Isotipo from '../components/Isotipo';

// Términos y condiciones de uso de la app. Versión 1.0 (borrador aprobable por el club).
// Si cambian de fondo, subir la versión y volver a pedir aceptación en el registro.
export const TERMINOS_VERSION = '1.0';

const SECCIONES = [
  {
    t: '1. Qué es esta app',
    c: 'La app de Sierra Pádel te permite solicitar reservas de cancha y clases, inscribirte a torneos, pedir al bar, acumular puntos de lealtad y enterarte de avisos y promociones del club Sierra Pádel (Monclova, Coahuila).',
  },
  {
    t: '2. Tu cuenta',
    c: 'Tu cuenta se identifica con tu número de teléfono y un PIN personal de 4 dígitos. El PIN es tuyo: no lo compartas. Eres responsable de lo que se haga desde tu cuenta. Si olvidas tu PIN puedes recuperarlo por WhatsApp.',
  },
  {
    t: '3. Reservas',
    c: 'Las solicitudes de reserva quedan sujetas a confirmación del club. Puedes cancelar desde la app con al menos 4 horas de anticipación; con menos tiempo, comunícate al club. No presentarse a una reserva confirmada (no-show) puede limitar futuras reservas.',
  },
  {
    t: '4. Datos que guardamos',
    c: 'Guardamos tu nombre, teléfono, nivel de juego y tu actividad en el club (reservas, consumos, puntos, torneos) para operar los servicios del club y tu programa de lealtad. No vendemos tus datos a terceros.',
  },
  {
    t: '5. Avisos y notificaciones',
    c: 'Al registrarte aceptas recibir avisos del club (confirmaciones, retas, promociones y novedades) por notificaciones de la app y/o WhatsApp. Puedes desactivarlos cuando quieras desde tu Perfil; los avisos operativos de tus propias reservas y pedidos se mantienen.',
  },
  {
    t: '6. Puntos y promociones',
    c: 'Los puntos de lealtad y las promociones no son dinero, no son transferibles y sus reglas (metas, premios, vigencias) las define el club y pueden cambiar. Cualquier canje se valida en caja.',
  },
  {
    t: '7. Retas y roster de jugadores',
    c: 'Al apuntarte a una reserva o reta, tu nombre (y nivel, si lo compartes) será visible para el organizador y los demás jugadores de esa cancha, y para el personal del club al hacer el check-in.',
  },
  {
    t: '8. Uso aceptable',
    c: 'El club puede suspender cuentas que hagan mal uso de la app (reservas falsas, suplantación de identidad, abuso de promociones).',
  },
  {
    t: '9. Cambios',
    c: 'El club puede actualizar estos términos; si el cambio es importante te lo avisaremos en la app. Dudas o aclaraciones: en recepción o por el WhatsApp del club.',
  },
];

export default function Terminos() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-sp-gray px-5 pt-[env(safe-area-inset-top)] pb-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-white/70 text-sm mb-2 -ml-1 pt-3">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Volver
        </button>
        <div className="flex items-center gap-3">
          <Isotipo size={28} color="white" />
          <div>
            <p className="text-white font-black text-lg leading-tight">Términos y condiciones</p>
            <p className="text-white/50 text-xs">Sierra Pádel · Versión {TERMINOS_VERSION}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 flex flex-col gap-3">
        {SECCIONES.map(s => (
          <div key={s.t} className="card">
            <p className="font-bold text-sp-gray text-[15px] mb-1">{s.t}</p>
            <p className="text-gray-500 text-sm leading-relaxed">{s.c}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
