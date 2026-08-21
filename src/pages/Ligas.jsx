import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';

/**
 * Índice de LIGAS del club.
 *
 * Antes esta pantalla tenía el Viernes Botanero ESCRITO A MANO y no preguntaba por las
 * demás: cada liga nueva había que agregarla tocando este archivo. Por eso la Liga
 * Miércoles existía en el sistema, con su convocatoria apuntando aquí, y aquí no
 * aparecía. Ahora las ligas escalera se leen de la base y la lista se llena sola.
 *
 * El Botanero sigue escrito aparte a propósito: no es una escalera, es un apunte
 * semanal con sus propias tablas y su propia pantalla. Meterlo al mismo molde sería
 * fingir que son lo mismo.
 */
export default function Ligas() {
  const navigate = useNavigate();
  const { apiFetch } = useApi();
  const [botanero, setBotanero] = useState(null);
  const [lider, setLider] = useState(null);
  const [escaleras, setEscaleras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [imgFalló, setImgFalló] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch('/botanero/estado'),
      apiFetch('/botanero/ranking'),
      apiFetch('/escalera/abiertas'),
    ])
      .then(([d, r, e]) => {
        if (d?.ok) setBotanero(d.data);
        if (r?.ok && (r.data || []).length) setLider(r.data[0]);
        if (e?.ok) setEscaleras(e.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [apiFetch]);

  const fechaBonita = botanero?.fecha
    ? new Date(botanero.fecha + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
    : '';
  const turnos = botanero?.turnos || [];
  const apuntados = turnos.reduce((s, t) => s + (t.apuntados || 0), 0);
  const cupo = turnos.reduce((s, t) => s + (t.cupo || 0), 0);
  const voy = turnos.some(t => t.mi_estado === 'apuntado');
  const enEspera = turnos.some(t => t.mi_estado === 'espera');

  const dia = (iso) => iso
    ? new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
    : '';

  return (
    <div className="page safe-bottom">
      <div className="bg-sp-green px-5 pt-[env(safe-area-inset-top)] pb-4">
        <p className="text-white font-black text-lg pt-3">Ligas</p>
        <p className="text-white/85 text-[13px] mt-0.5">Juega cada semana, suma récord y sube en el ranking</p>
      </div>

      <div className="px-4 py-4 flex flex-col gap-3 overflow-y-auto">
        {loading && (
          <div className="card py-8 text-center text-gray-400 text-sm">Cargando…</div>
        )}

        {/* Ligas escalera abiertas — se leen de la base, no van escritas aquí */}
        {!loading && escaleras.map((l) => {
          const com = l.comercial;
          const bolsa = com ? Number(com.premio_efectivo || 0) + Number(com.premio_especie_valor || 0) : 0;
          return (
            <button key={l.id} onClick={() => navigate(`/liga/${l.id}`)}
                    className="text-left active:scale-[0.98] transition-transform">
              <div className="card p-0 overflow-hidden">
                <div className="px-4 py-3 flex items-center gap-3" style={{ background: '#1d3009' }}>
                  <span style={{ fontSize: 26 }}>🪜</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-black text-[16px] leading-tight">{l.nombre}</p>
                    <p className="text-lime-200/90 text-[12px]">
                      Escalera por nivel · {l.n_jornadas} jornadas · 3 sets por noche
                    </p>
                  </div>
                  <span className="text-[12px] font-bold px-2 py-1 rounded-lg bg-white/15 text-white flex-shrink-0">
                    Abierta
                  </span>
                </div>
                <div className="px-4 py-3">
                  {com?.fecha_inicio && (
                    <p className="text-sp-gray text-[14px] font-bold capitalize">
                      🚀 Arranca: {dia(com.fecha_inicio)}
                    </p>
                  )}
                  <p className="text-gray-500 text-[13px] mt-0.5">
                    {com?.precio_inscripcion > 0
                      ? <>Inscripción <b>${Number(com.precio_inscripcion).toLocaleString('es-MX')}</b></>
                      : 'Sin costo'}
                    {bolsa > 0 && <> · <span className="text-amber-600 font-bold">
                      ${bolsa.toLocaleString('es-MX')} en premios</span></>}
                  </p>
                  <p className="text-gray-400 text-[12px] mt-1">
                    {l.inscritos === 0
                      ? 'Sé el primero en apuntarte'
                      : `${l.inscritos} ${l.inscritos === 1 ? 'inscrito' : 'inscritos'}`}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[13px] text-gray-400">
                      Te acomodan por nivel · subes jugando
                    </span>
                    <span className="text-[13px] font-bold text-sp-green-dark">Ver liga →</span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}

        {/* El Botanero: otro formato, pantalla propia */}
        {!loading && (
          <button onClick={() => navigate('/botanero')} className="text-left active:scale-[0.98] transition-transform">
            <div className="card p-0 overflow-hidden">
              <div className="px-4 py-3 flex items-center gap-3" style={{ background: '#2e1b06' }}>
                {/* Thumbnail de la liga si está cargado; si no —o si la imagen falla al
                    cargar— el emoji de siempre. Un hueco vacío se ve peor que el emoji. */}
                {botanero?.media?.thumbnail_url && !imgFalló ? (
                  <img
                    src={botanero.media.thumbnail_url}
                    alt=""
                    loading="lazy"
                    onError={() => setImgFalló(true)}
                    style={{ width: 42, height: 42 }}
                    className="rounded-xl object-cover flex-shrink-0"
                  />
                ) : (
                  <span style={{ fontSize: 26 }}>🍻</span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-black text-[16px] leading-tight">Liga Viernes Botanero</p>
                  <p className="text-amber-200/90 text-[12px]">Individual · todos los viernes · futbol en pantallas</p>
                </div>
                <span className="text-[12px] font-bold px-2 py-1 rounded-lg bg-white/15 text-white flex-shrink-0">
                  {lider ? 'En juego' : 'Arranca'}
                </span>
              </div>
              <div className="px-4 py-3">
                {fechaBonita && (
                  <p className="text-sp-gray text-[14px] font-bold capitalize">
                    {lider ? 'Próxima jornada: ' : '🚀 Debut: '}{fechaBonita}
                  </p>
                )}
                <p className="text-gray-500 text-[13px] mt-0.5">
                  {turnos.map(t => `${t.hora} $${t.precio}`).join(' · ')}
                  <span className="text-amber-600 font-bold"> · precio de lanzamiento</span>
                </p>
                {cupo > 0 && (
                  <p className="text-gray-400 text-[12px] mt-1">{apuntados}/{cupo} apuntados este viernes</p>
                )}
                {lider && (
                  <p className="text-gray-500 text-[13px] mt-1">👑 Líder: <b>{lider.nombre}</b> · {lider.puntos} pts</p>
                )}
                <div className="mt-2 flex items-center justify-between">
                  {voy ? (
                    <span className="text-[13px] font-bold text-green-600">✓ Vas este viernes</span>
                  ) : enEspera ? (
                    <span className="text-[13px] font-bold text-amber-600">⏳ Estás en lista de espera</span>
                  ) : (
                    <span className="text-[13px] text-gray-400">Apúntate cada semana, sin inscripción</span>
                  )}
                  <span className="text-[13px] font-bold text-sp-green-dark">Ver liga →</span>
                </div>
              </div>
            </div>
          </button>
        )}

        {!loading && (
          <p className="text-gray-400 text-[12px] text-center px-4">
            Se irán sumando más ligas — aquí las vas a encontrar todas.
          </p>
        )}
      </div>
    </div>
  );
}
