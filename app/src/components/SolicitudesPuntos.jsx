import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { textoSolicitud } from '../lib/puntosAut';

// 🔐 «La caja quiere usar tus puntos» (German 22-oct-2026). Si el push no llegó o se cerró sin
// querer, la solicitud se ve aquí (Inicio y Avisos) mientras siga vigente. Tocarla lleva a
// /autorizar-puntos/:id. Vuelve a preguntar al regresar a la app. Si el servidor todavía no
// tiene la ruta (404) o algo falla, no pinta nada.
export default function SolicitudesPuntos() {
  const navigate = useNavigate();
  const { apiFetch } = useApi();
  const [lista, setLista] = useState([]);

  useEffect(() => {
    let vivo = true;
    const cargar = () => {
      apiFetch('/pagos/puntos/autorizaciones')
        .then(r => { if (vivo) setLista(r?.ok && Array.isArray(r.data) ? r.data : []); })
        .catch(() => {});
    };
    cargar();
    const alVolver = () => { if (document.visibilityState === 'visible') cargar(); };
    document.addEventListener('visibilitychange', alVolver);
    const id = setInterval(cargar, 15000);
    return () => { vivo = false; clearInterval(id); document.removeEventListener('visibilitychange', alVolver); };
  }, [apiFetch]);

  if (!lista.length) return null;
  return (
    <div className="flex flex-col gap-2">
      {lista.map(s => (
        <button
          key={s.id}
          onClick={() => navigate(`/autorizar-puntos/${s.id}`)}
          className="w-full text-left rounded-2xl px-4 py-3 bg-violet-600 text-white shadow-md active:scale-[0.99] transition-transform"
        >
          <p className="text-[11px] font-black tracking-[.14em] uppercase text-white/75">¿Autorizas usar tus puntos?</p>
          <p className="font-bold text-[15px] leading-snug mt-0.5">{textoSolicitud(s)}</p>
          <p className="text-[13px] font-black mt-1.5">Revisar y contestar →</p>
        </button>
      ))}
    </div>
  );
}
