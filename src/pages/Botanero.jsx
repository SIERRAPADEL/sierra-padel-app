import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { isPushSupported } from '../components/NotificationSetup';
import PrenderAvisos from '../components/PrenderAvisos';

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
  const [pideSexo, setPideSexo] = useState(null);      // turno para el que falta declarar H/M
  const [avisoEspera, setAvisoEspera] = useState(null); // quedó en la espera: hay que decírselo

  // ── PRENDER LAS NOTIFICACIONES, A UN TOQUE ─────────────────────────────────
  // German (21-ago): *"necesitamos que tengan acceso al botón de prende tus notificaciones
  // muy fácil, es la única manera que no tengan que buscarlo"*.
  //
  // El aviso automático (NotificationSetup) sólo sale si la app está INSTALADA, sólo si el
  // permiso está sin decidir, y si lo descartan una vez no vuelve nunca: por eso lleva
  // clavado en ~30 personas desde el 31-jul. Aquí el botón vive en la pantalla, siempre
  // visible mientras no las tenga, y en el momento en que el aviso sirve — está apuntado
  // a jugar y quiere saber su cancha.
  const yaTieneAvisos = typeof localStorage !== 'undefined' && localStorage.getItem('pushSubscribed') === '1';
  const faltanAvisos = isPushSupported() && !yaTieneAvisos;
  // Captura del marcador por el propio jugador (como en las retas). 3 sets, games de
  // cada pareja. La rotación de parejas la sabe el servidor: aquí sólo se anotan games.
  const [capturando, setCapturando] = useState(null);      // turno cuyo marcador se está capturando
  const [sets, setSets] = useState([['', ''], ['', ''], ['', '']]);
  const [okMarcador, setOkMarcador] = useState('');

  function setGame(i, lado, v) {
    const limpio = v.replace(/[^0-9]/g, '').slice(0, 1);
    setSets(s => s.map((par, idx) => idx === i ? (lado === 0 ? [limpio, par[1]] : [par[0], limpio]) : par));
  }

  async function enviarMarcador(turno) {
    if (accion) return;
    const nums = sets.map(([a, b]) => [Number(a), Number(b)]);
    if (nums.some(([a, b]) => !(a >= 0 && a <= 9) || !(b >= 0 && b <= 9) || (a === '' && b === '')))
      { setError('Escribe los games de los 3 sets.'); return; }
    if (sets.some(([a, b]) => a === '' || b === '')) { setError('Faltan games por capturar.'); return; }
    if (nums.some(([a, b]) => a === b)) { setError('No puede haber empates: desempaten con punto de oro.'); return; }
    setAccion(true); setError(''); setOkMarcador('');
    // Se manda "los nuestros / los suyos", nunca lado A/B: quién es A y quién es B depende
    // de la posición en la cancha, y el servidor es el único que sabe la rotación. Mandar
    // a/b desde aquí es cómo se invierte un marcador sin que nadie lo note.
    const d = await apiFetch('/botanero/mi-marcador', {
      method: 'POST', body: JSON.stringify({ turno, sets: nums.map(([mios, suyos]) => ({ mios, suyos })) }),
    });
    if (d.ok) {
      setOkMarcador('¡Listo! Tu marcador quedó registrado y el ranking ya se actualizó.');
      setCapturando(null); setSets([['', ''], ['', ''], ['', '']]);
    } else setError(d.error || 'No se pudo guardar el marcador.');
    await cargar();
    setAccion(false);
  }

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

  // Las canchas del Botanero no se mezclan: hay canchas de hombres y canchas de
  // mujeres. Por eso se pide una sola vez; si el cliente ya lo declaró antes
  // (mi_sexo_guardado) se apunta directo y nunca vuelve a ver esta pregunta.
  async function apuntarse(turno, sexo) {
    if (accion) return;
    const yaLoSe = sexo || data?.mi_sexo_guardado;
    if (!yaLoSe) { setPideSexo(turno); return; }
    setAccion(true); setError(''); setAvisoEspera(null); setPideSexo(null);
    const d = await apiFetch('/botanero/apuntarse', { method: 'POST', body: JSON.stringify({ turno, sexo: yaLoSe }) });
    if (!d.ok) setError(d.error || 'No se pudo. Intenta de nuevo.');
    // Quedar en LISTA DE ESPERA no es lo mismo que tener lugar, y hay que decirlo aquí
    // (German, 21-ago). Antes la pantalla sólo recargaba y quien se anotó tarde se podía
    // ir creyendo que ya estaba dentro.
    else if (d.data?.estado === 'espera') setAvisoEspera(d.data);
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
      {avisoEspera && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4"
             onClick={() => setAvisoEspera(null)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <p className="text-3xl text-center">⏳</p>
            <p className="text-center font-black text-lg text-sp-gray mt-1">
              Estás en lista de espera
            </p>
            <p className="text-center text-[15px] text-amber-700 font-bold mt-1">
              Lugar #{avisoEspera.posicion_espera} · turno de {avisoEspera.hora}
            </p>
            <p className="text-[14px] text-gray-600 mt-3 leading-snug">
              {avisoEspera.motivo_espera === 'cerrado'
                ? <>La lista de este turno cerró a las <b>{avisoEspera.cierra}</b>, media hora antes de empezar.</>
                : <>Este turno ya está lleno.</>}
              {' '}<b>Todavía no tienes lugar.</b> Si alguien no llega o se baja, entras
              automáticamente y te llega una notificación.
            </p>
            {faltanAvisos && (
              <div className="mt-4">
                <PrenderAvisos compacto motivo="Te avisamos en cuanto se libere un lugar." />
              </div>
            )}
            <button onClick={() => setAvisoEspera(null)}
              className={faltanAvisos
                ? 'w-full mt-2 py-2.5 text-[14px] font-bold text-gray-500'
                : 'btn-green w-full mt-4'}>Entendido</button>
          </div>
        </div>
      )}
      <div className="bg-sp-green px-5 pt-5 pb-4">
        <button onClick={() => navigate('/ligas')} className="text-white/80 text-sm mb-1">‹ Ligas</button>
        <h1 className="text-white font-black text-2xl">🍻 Viernes Botanero</h1>
        <p className="text-white/85 text-[13px] mt-1 capitalize">{fechaBonita}</p>
      </div>

      {/* Patrocinador PUNTUAL que encabeza la página de la liga (German 17-ago-2026).
          Puede ser de la temporada completa o de esta jornada: el backend ya resuelve
          cuál manda (la jornada le gana a la liga). */}
      {(data?.media?.sponsor_url || data?.media?.sponsor_nombre) && (
        <div className="mx-4 mt-4 rounded-2xl border border-gray-100 bg-white px-4 py-3 flex items-center gap-3 shadow-sm">
          <span className="text-[10px] font-black tracking-widest text-gray-400 flex-shrink-0">PATROCINA</span>
          {data.media.sponsor_url ? (
            <img
              src={data.media.sponsor_url}
              alt={data.media.sponsor_nombre || 'Patrocinador'}
              loading="lazy"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
              className="h-9 max-w-[60%] object-contain"
            />
          ) : (
            <span className="font-black text-sp-gray text-[15px] truncate">{data.media.sponsor_nombre}</span>
          )}
        </div>
      )}

      <PrenderAvisos motivo="Te avisamos en qué cancha juegas y con quién en cuanto se arman, y si se libera un lugar." />

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

              {t.mixto ? (
                <p className="text-[12px] mt-2 font-bold text-sp-green-dark">
                  👫 Este turno se juega MIXTO — las canchas no se separan
                  <span className="text-gray-400 font-normal"> · ♂ {t.hombres} · ♀ {t.mujeres}</span>
                </p>
              ) : (t.hombres > 0 || t.mujeres > 0) && (
                <p className="text-[12px] mt-2 flex gap-3">
                  <span className="text-blue-600 font-bold">♂ {t.hombres} {t.hombres % 4 ? `· faltan ${4 - (t.hombres % 4)} para otra cancha` : ''}</span>
                  <span className="text-pink-600 font-bold">♀ {t.mujeres} {t.mujeres % 4 ? `· faltan ${4 - (t.mujeres % 4)} para otra cancha` : ''}</span>
                </p>
              )}

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

                {/* Con quién juega cada set, ANTES de capturar: llegando a la cancha ya sabe
                    con quién le toca en cada uno, sin tener que preguntar. */}
                {t.mi_estado === 'apuntado' && t.mis_sets && capturando !== t.turno && (
                  <div className="mt-2 rounded-xl bg-gray-50 border border-gray-200 p-2.5">
                    <div className="text-[11.5px] font-bold text-gray-400 mb-1.5">TUS PAREJAS DE HOY</div>
                    {t.mis_sets.map(s => (
                      <div key={s.set} className="flex items-baseline gap-2 text-[13px] leading-relaxed">
                        <span className="text-gray-400 shrink-0">S{s.set}</span>
                        <span className="text-gray-700">
                          <b className="text-sp-green">Tú y {s.companero}</b>
                          <span className="text-gray-400"> vs </span>
                          {s.rivales.join(' y ')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Al terminar, el propio jugador captura el marcador de SU cancha — igual
                    que en las retas. Antes dependía de que alguien del club fuera cancha por
                    cancha, y si no lo hacía esa noche NO había ranking. */}
                {t.mi_estado === 'apuntado' && t.mi_cancha && capturando !== t.turno && !okMarcador && (
                  <button onClick={() => { setCapturando(t.turno); setError(''); }}
                          className="w-full mt-2 text-[13.5px] font-bold text-sp-green border border-sp-green/40 rounded-xl py-2.5">
                    🏓 Capturar el marcador de mi cancha
                  </button>
                )}

                {capturando === t.turno && (
                  <div className="mt-2 p-3 rounded-xl bg-gray-50 border border-gray-200">
                    <p className="text-[12.5px] text-gray-500 leading-snug mb-2">
                      Games de cada set en tu <b>Cancha {t.mi_cancha}</b>. En cada set cambian
                      las parejas: anota los games <b>de cada lado</b> como aparecen abajo.
                    </p>
                    {/* Con NOMBRES: el jugador tiene que ver de quién es cada marcador. Sin
                        esto captura a ciegas y basta con que vaya en la pareja 3&4 para que
                        el set se lo acredite a sus rivales. */}
                    {sets.map((par, i) => {
                      const ms = t.mis_sets && t.mis_sets[i];
                      return (
                        <div key={i} className="mb-2.5 rounded-lg bg-white border border-gray-200 p-2">
                          <div className="text-[11.5px] font-bold text-gray-400 mb-1">SET {i + 1}</div>
                          {ms ? (
                            <>
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-[13.5px] font-bold text-sp-green truncate">
                                  Tú y {ms.companero}
                                </span>
                                <input inputMode="numeric" value={par[0]} onChange={e => setGame(i, 0, e.target.value)}
                                       className="w-14 shrink-0 text-center text-[17px] font-bold border-2 border-sp-green/40 rounded-lg py-1.5" placeholder="0" />
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[13.5px] text-gray-600 truncate">
                                  {ms.rivales.join(' y ')}
                                </span>
                                <input inputMode="numeric" value={par[1]} onChange={e => setGame(i, 1, e.target.value)}
                                       className="w-14 shrink-0 text-center text-[17px] font-bold border rounded-lg py-1.5" placeholder="0" />
                              </div>
                            </>
                          ) : (
                            // Cancha incompleta: sin los 4 no hay parejas que nombrar.
                            <div className="flex items-center gap-2">
                              <span className="text-[12.5px] text-gray-500 flex-1">Ustedes — Ellos</span>
                              <input inputMode="numeric" value={par[0]} onChange={e => setGame(i, 0, e.target.value)}
                                     className="w-14 text-center text-[16px] font-bold border rounded-lg py-1.5" placeholder="0" />
                              <input inputMode="numeric" value={par[1]} onChange={e => setGame(i, 1, e.target.value)}
                                     className="w-14 text-center text-[16px] font-bold border rounded-lg py-1.5" placeholder="0" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div className="flex gap-2 mt-1">
                      <button onClick={() => { setCapturando(null); setError(''); }}
                              className="flex-1 text-[13px] text-gray-500 py-2">Cancelar</button>
                      <button onClick={() => enviarMarcador(t.turno)} disabled={accion}
                              className="flex-1 btn-green disabled:opacity-50">Guardar marcador</button>
                    </div>
                  </div>
                )}

                {okMarcador && t.mi_estado === 'apuntado' && (
                  <p className="mt-2 text-center text-[13px] font-bold text-green-600">{okMarcador}</p>
                )}
                {t.mi_estado === 'espera' && (
                  <div className="flex items-center gap-2">
                    <span className="flex-1 text-center text-[14px] font-bold text-amber-600 bg-amber-50 rounded-xl py-2.5">⏳ En espera · lugar #{t.mi_posicion_espera}</span>
                    <button onClick={() => bajarse(t.turno)} disabled={accion} className="text-[13px] text-gray-400 underline px-2">Salirme</button>
                  </div>
                )}
                {!t.mi_estado && pideSexo !== t.turno && (
                  <button onClick={() => apuntarse(t.turno)} disabled={accion} className="btn-green w-full disabled:opacity-50">
                    {lleno || t.estado === 'cerrada' ? 'Anotarme en la espera' : '¡Me apunto!'}
                  </button>
                )}
                {!t.mi_estado && pideSexo === t.turno && (
                  <div className="rounded-xl border border-gray-200 p-3">
                    <p className="text-[13px] font-bold text-gray-700 mb-1">¿En qué canchas juegas?</p>
                    <p className="text-[12px] text-gray-400 mb-2.5">Las canchas del Botanero son de hombres o de mujeres, no mixtas. Solo te lo preguntamos esta vez.</p>
                    <div className="flex gap-2">
                      <button onClick={() => apuntarse(t.turno, 'H')} disabled={accion}
                        className="flex-1 rounded-xl py-2.5 font-bold text-[14px] border-2 border-blue-200 text-blue-600 bg-blue-50 disabled:opacity-50">♂ Hombres</button>
                      <button onClick={() => apuntarse(t.turno, 'M')} disabled={accion}
                        className="flex-1 rounded-xl py-2.5 font-bold text-[14px] border-2 border-pink-200 text-pink-600 bg-pink-50 disabled:opacity-50">♀ Mujeres</button>
                    </div>
                    <button onClick={() => setPideSexo(null)} className="text-[12px] text-gray-400 underline mt-2">Cancelar</button>
                  </div>
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
          La cuota se paga en el club al llegar. La lista de cada turno cierra <b>media hora
          antes</b> de empezar; después te puedes anotar, pero quedas en lista de espera.
          Si se libera un lugar, entras y te avisamos con una notificación.
          Si no vas a poder, bájate con tiempo — tu lugar es oro para el que sigue.
        </p>
      </div>
    </div>
  );
}
