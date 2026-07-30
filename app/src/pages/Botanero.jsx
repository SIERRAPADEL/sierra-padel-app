import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';

// Liga Viernes Botanero — Fase 1: apuntarse a la lista semanal (cupo + lista de espera).
// Liga individual perpetua: 3 sets rotando pareja; el récord te va acomodando de cancha.
export default function Botanero() {
  const navigate = useNavigate();
  const { apiFetch } = useApi();
  const [data, setData] = useState(null);
  const [ranking, setRanking] = useState([]);
  const [juegos, setJuegos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accion, setAccion] = useState(false);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    const [d, r, j] = await Promise.all([
      apiFetch('/botanero/estado'), apiFetch('/botanero/ranking'), apiFetch('/botanero/juegos'),
    ]);
    if (d.ok) setData(d.data);
    if (r.ok) setRanking(r.data || []);
    if (j.ok) setJuegos(j.data);
    setLoading(false);
  }, [apiFetch]);

  useEffect(() => { cargar(); }, [cargar]);

  async function apuntarse(turno) {
    if (accion) return;
    setAccion(true); setError('');
    const d = await apiFetch('/botanero/apuntarse', { method: 'POST', body: JSON.stringify({ turno }) });
    if (!d.ok) setError(d.error || 'No se pudo. Intenta de nuevo.');
    await cargar();
    setAccion(false);
  }

  async function bajarse(turno) {
    if (accion) return;
    if (!window.confirm('¿Seguro que te bajas de este viernes? Tu lugar se le da al primero de la lista de espera.')) return;
    setAccion(true); setError('');
    const d = await apiFetch('/botanero/bajarse', { method: 'POST', body: JSON.stringify({ turno }) });
    if (!d.ok) setError(d.error || 'No se pudo. Intenta de nuevo.');
    await cargar();
    setAccion(false);
  }

  const fechaBonita = data?.fecha
    ? new Date(data.fecha + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
    : '';

  return (
    <div className="pb-24">
      <div className="bg-sp-green px-5 pt-5 pb-4">
        <button onClick={() => navigate('/home')} className="text-white/80 text-sm mb-1">‹ Inicio</button>
        <h1 className="text-white font-black text-2xl">🍻 Viernes Botanero</h1>
        <p className="text-white/85 text-[13px] mt-1 capitalize">{fechaBonita}</p>
      </div>

      <div className="px-4 mt-4 flex flex-col gap-3">
        <div className="card py-4">
          <p className="text-sp-gray font-bold text-[15px]">La liga de los viernes 🎾⚽</p>
          <p className="text-gray-500 text-[13px] mt-1 leading-relaxed">
            Juegas <b>individual</b>: 3 sets rotando de pareja, y tu récord te va subiendo de cancha semana a semana.
            Michelob <b>2x1 de 8 a 10pm</b> solo para jugadores de la liga, y el futbol en las pantallas.
            No es inscripción: cada semana te apuntas si quieres jugar. Cupo limitado.
          </p>
        </div>

        {ranking.length === 0 && data?.fecha && (
          <div className="rounded-2xl px-4 py-3 text-center" style={{ background: '#2e1b06' }}>
            <p className="text-white font-black text-[15px]">🚀 ¡La liga arranca el {fechaBonita}!</p>
            <p className="text-amber-200/90 text-[12px] mt-0.5">Cuotas con precio de lanzamiento — apúntate y estrena el ranking.</p>
          </div>
        )}

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        {loading ? (
          <div className="card py-8 text-center text-gray-400 text-sm">Cargando…</div>
        ) : (data?.turnos || []).map(t => {
          const lleno = t.apuntados >= t.cupo;
          return (
            <div key={t.turno} className="card py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sp-gray font-black text-lg">{t.hora}</p>
                  <p className="text-gray-400 text-[12px]">
                    {t.turno === '1830' ? 'Aprovechas TODO el 2x1' : 'Entras directo al 2x1'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sp-green-dark font-black text-xl">${t.precio}</p>
                  <p className="text-gray-400 text-[12px]">por jugador</p>
                  <p className="text-amber-600 text-[11px] font-bold">precio de lanzamiento</p>
                </div>
              </div>

              <div className="mt-3">
                <div className="flex justify-between text-[12px] text-gray-400 mb-1">
                  <span>{t.apuntados}/{t.cupo} lugares{t.en_espera > 0 ? ` · ${t.en_espera} en espera` : ''}</span>
                  <span>{t.estado === 'cerrada' ? 'Lista cerrada' : (lleno ? 'Lleno' : 'Lista abierta')}</span>
                </div>
                <div style={{ height: 8, borderRadius: 6, background: '#eef2e6', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, (t.apuntados / t.cupo) * 100)}%`, background: lleno ? '#e0a800' : '#84cc16', transition: 'width .3s' }} />
                </div>
              </div>

              {t.nombres?.length > 0 && (
                <p className="text-gray-400 text-[12px] mt-2 leading-relaxed">
                  Van: {t.nombres.join(', ')}
                </p>
              )}

              <div className="mt-3">
                {t.mi_estado === 'apuntado' && (
                  <div className="flex items-center gap-2">
                    <span className="flex-1 text-center text-[14px] font-bold text-green-600 bg-green-50 rounded-xl py-2.5">
                      {t.mi_cancha ? `✓ ¡Vas! Te toca la Cancha ${t.mi_cancha}` : '✓ ¡Vas! Nos vemos el viernes'}
                    </span>
                    <button onClick={() => bajarse(t.turno)} disabled={accion} className="text-[13px] text-gray-400 underline px-2">Bajarme</button>
                  </div>
                )}
                {t.mi_estado === 'espera' && (
                  <div className="flex items-center gap-2">
                    <span className="flex-1 text-center text-[14px] font-bold text-amber-600 bg-amber-50 rounded-xl py-2.5">⏳ En espera · lugar #{t.mi_posicion_espera}</span>
                    <button onClick={() => bajarse(t.turno)} disabled={accion} className="text-[13px] text-gray-400 underline px-2">Salirme</button>
                  </div>
                )}
                {!t.mi_estado && (
                  <button onClick={() => apuntarse(t.turno)} disabled={accion} className="btn-green w-full disabled:opacity-50">
                    {lleno || t.estado === 'cerrada' ? 'Anotarme en la espera' : '¡Me apunto!'}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {ranking.length > 0 && (
          <div className="card py-4">
            <p className="text-sp-gray font-bold text-[15px] mb-2">🏆 Ranking de la liga</p>
            <div className="flex flex-col">
              {ranking.slice(0, 10).map(r => (
                <div key={r.cliente_id} className="flex items-center gap-2 py-1.5 border-b border-gray-100 last:border-0">
                  <span className="w-7 text-center font-black text-[14px]">
                    {r.pos === 1 ? '🥇' : r.pos === 2 ? '🥈' : r.pos === 3 ? '🥉' : r.pos}
                  </span>
                  <span className="flex-1 text-sp-gray text-[14px] font-semibold truncate">{r.nombre}</span>
                  <span className="text-gray-400 text-[12px]">{r.sets_g}-{r.sets_p}</span>
                  <span className="text-gray-400 text-[11px] w-8 text-right">{r.dif_games > 0 ? '+' : ''}{r.dif_games ?? 0}</span>
                  <span className="text-sp-green-dark font-black text-[14px] w-9 text-right">{r.puntos}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-400 text-[11px] mt-2">2 pts por set ganado + 1 por venir a jugar. Tu récord decide tu cancha.</p>
          </div>
        )}

        {juegos?.turnos?.length > 0 && (
          <div className="card py-4">
            <p className="text-sp-gray font-bold text-[15px]">🎾 Juegos de la última jornada</p>
            <p className="text-gray-400 text-[12px] mb-2 capitalize">
              {new Date(juegos.fecha + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            {juegos.turnos.map(tu => (
              <div key={tu.turno} className="mt-2">
                <p className="text-gray-400 text-[11px] font-bold uppercase tracking-wide">Turno {tu.hora}</p>
                {tu.canchas.map(c => (
                  <div key={c.cancha} className="mt-1.5 rounded-xl bg-gray-50 px-3 py-2">
                    <p className="text-[12px] font-bold text-sp-gray mb-1">Cancha {c.cancha}</p>
                    {c.sets.map(s => (
                      <div key={s.set} className="flex items-center gap-2 py-0.5 text-[13px]">
                        <span className={`flex-1 truncate text-right ${s.games_a > s.games_b ? 'font-bold text-sp-gray' : 'text-gray-500'}`}>{s.a}</span>
                        <span className="font-black text-sp-green-dark whitespace-nowrap">{s.games_a}–{s.games_b}</span>
                        <span className={`flex-1 truncate ${s.games_b > s.games_a ? 'font-bold text-sp-gray' : 'text-gray-500'}`}>{s.b}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        <p className="text-gray-400 text-[12px] text-center px-4 leading-relaxed">
          La cuota se paga en el club al llegar. Si se libera un lugar y estás en espera, te avisamos con una notificación.
          Si no vas a poder, bájate con tiempo — tu lugar es oro para el que sigue.
        </p>
      </div>
    </div>
  );
}
