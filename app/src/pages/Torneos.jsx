import { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi';

export default function Torneos() {
  const { apiFetch } = useApi();
  const [torneos, setTorneos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/torneos').then(d => {
      if (d.ok) setTorneos(d.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="page safe-bottom">
      <div className="bg-sp-green px-5 pt-[env(safe-area-inset-top)] pb-4">
        <p className="text-white font-black text-lg pt-3">Torneos</p>
      </div>

      <div className="px-4 py-4 flex flex-col gap-3">
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-sp-green border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && torneos.length === 0 && (
          <div className="card text-center py-12">
            <p className="text-gray-400 font-medium">No hay torneos activos por el momento</p>
            <p className="text-gray-300 text-sm mt-1">Activa las notificaciones para enterarte primero</p>
          </div>
        )}

        {torneos.map(t => (
          <div key={t.id} className="card">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-sp-gray">{t.nombre}</p>
                <p className="text-sm text-gray-400 mt-0.5">{t.fecha_inicio}</p>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                t.estado === 'inscripciones' ? 'bg-sp-green-light text-sp-green-dark' :
                t.estado === 'en_curso' ? 'bg-blue-50 text-blue-600' :
                'bg-gray-100 text-gray-400'
              }`}>
                {t.estado === 'inscripciones' ? 'Inscripciones' :
                 t.estado === 'en_curso' ? 'En curso' : 'Finalizado'}
              </span>
            </div>
            {t.estado === 'inscripciones' && (
              <button className="btn-green mt-3 py-2 text-sm">Inscribirme — $1,000</button>
            )}
            {t.estado === 'en_curso' && (
              <button className="btn-outline mt-3 py-2 text-sm">Ver resultados</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
