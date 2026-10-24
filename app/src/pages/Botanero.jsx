import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { isPushSupported } from '../components/NotificationSetup';
import PrenderAvisos from '../components/PrenderAvisos';
import { fondoPatro, PatrocinioArco, KANIT } from '../components/PatrocinioJornada';
import { infoNoche } from '../lib/noche';
import { t, locale } from '../i18n';

// Liga Viernes Botanero — Fase 1: apuntarse a la lista semanal (cupo + lista de espera).
// Liga individual perpetua: 3 sets rotando pareja; el récord te va acomodando de cancha.
// 👑 UNA PÁGINA, DOS NOCHES (German, 29-sep-2026): el Ladies Night de los jueves es el mismo
// motor que el Botanero (backend: crearLigaNoche). Aquí cambian la API, los textos y que no se
// pregunta hombre/mujer: la noche es sólo de mujeres.
// 🌐 Los textos van como funciones: t() se llama al pintar, no al importar. `titulo` es nombre
// propio (no se traduce); `dia` es dato interno.
export const NOCHES_APP = {
  botanero: { api: '/botanero', titulo: '🍻 Viernes Botanero', dia: 'viernes', soloMujeres: false, dosPorUno: true, exigeResultado: true,
    lema: () => t('La liga de los viernes 🎾⚽'),
    confirmaBaja: () => t('¿Seguro que te bajas de este viernes? Tu lugar se le da a la primera de la lista de espera.'),
    nosVemos: () => t('✓ ¡Vas! Nos vemos el viernes') },
  ladies:   { api: '/ladies',   titulo: '👑 Ladies Night',     dia: 'jueves', soloMujeres: true, dosPorUno: false,
    lema: () => t('La noche de los jueves, sólo para ellas 👑🎾'),
    confirmaBaja: () => t('¿Seguro que te bajas de este jueves? Tu lugar se le da a la primera de la lista de espera.'),
    nosVemos: () => t('✓ ¡Vas! Nos vemos el jueves') },
};

export default function Botanero({ liga = 'botanero' }) {
  const L = NOCHES_APP[liga] || NOCHES_APP.botanero;
  const navigate = useNavigate();
  const { apiFetch } = useApi();
  const [data, setData] = useState(null);
  const [ranking, setRanking] = useState({ hombres: [], mujeres: [] });
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
      { setError(t('Escribe los games de los 3 sets.')); return; }
    if (sets.some(([a, b]) => a === '' || b === '')) { setError(t('Faltan games por capturar.')); return; }
    if (nums.some(([a, b]) => a === b)) { setError(t('No puede haber empates: desempaten con punto de oro.')); return; }
    setAccion(true); setError(''); setOkMarcador('');
    // Se manda "los nuestros / los suyos", nunca lado A/B: quién es A y quién es B depende
    // de la posición en la cancha, y el servidor es el único que sabe la rotación. Mandar
    // a/b desde aquí es cómo se invierte un marcador sin que nadie lo note.
    const d = await apiFetch(L.api + '/mi-marcador', {
      method: 'POST', body: JSON.stringify({ turno, sets: nums.map(([mios, suyos]) => ({ mios, suyos })) }),
    });
    if (d.ok) {
      setOkMarcador(t('¡Listo! Tu marcador quedó registrado y el ranking ya se actualizó.'));
      setCapturando(null); setSets([['', ''], ['', ''], ['', '']]);
    } else setError(d.error || t('No se pudo guardar el marcador.'));
    await cargar();
    setAccion(false);
  }

  const cargar = useCallback(async () => {
    const [d, r, j] = await Promise.all([
      apiFetch(L.api + '/estado'), apiFetch(L.api + '/ranking'), apiFetch(L.api + '/juegos'),
    ]);
    if (d.ok) setData(d.data);
    // Dos rankings, no uno (German, 25-ago): las canchas no se mezclan, así que comparar
    // a todos en una tabla es comparar a gente que nunca se enfrentó. Si el backend fuera
    // viejo y no mandara las listas separadas, se cae al ranking completo como hombres —
    // más vale una tabla de más que una pantalla vacía.
    if (r.ok) setRanking({ hombres: r.hombres || r.data || [], mujeres: r.mujeres || [] });
    if (j.ok) setJuegos(j.data);
    setLoading(false);
  }, [apiFetch, L.api]);

  useEffect(() => { cargar(); }, [cargar]);

  // Las canchas del Botanero no se mezclan: hay canchas de hombres y canchas de
  // mujeres. Por eso se pide una sola vez; si el cliente ya lo declaró antes
  // (mi_sexo_guardado) se apunta directo y nunca vuelve a ver esta pregunta.
  async function apuntarse(turno, sexo) {
    if (accion) return;
    // Noche sólo de mujeres: no se pregunta ni se manda el sexo — el servidor lo toma del NIVEL
    // de su ficha (rama Femenil) y rechaza a quien no lo tenga, diciéndole qué hacer.
    const yaLoSe = L.soloMujeres ? null : (sexo || data?.mi_sexo_guardado);
    if (!yaLoSe && !L.soloMujeres) { setPideSexo(turno); return; }
    setAccion(true); setError(''); setAvisoEspera(null); setPideSexo(null);
    const d = await apiFetch(L.api + '/apuntarse', { method: 'POST', body: JSON.stringify(L.soloMujeres ? { turno } : { turno, sexo: yaLoSe }) });
    if (!d.ok) setError(d.error || t('No se pudo. Intenta de nuevo.'));
    // Quedar en LISTA DE ESPERA no es lo mismo que tener lugar, y hay que decirlo aquí
    // (German, 21-ago). Antes la pantalla sólo recargaba y quien se anotó tarde se podía
    // ir creyendo que ya estaba dentro.
    else if (d.data?.estado === 'espera') setAvisoEspera(d.data);
    await cargar();
    setAccion(false);
  }

  async function bajarse(turno) {
    if (accion) return;
    if (!window.confirm(L.confirmaBaja())) return;
    setAccion(true); setError('');
    const d = await apiFetch(L.api + '/bajarse', { method: 'POST', body: JSON.stringify({ turno }) });
    if (!d.ok) setError(d.error || t('No se pudo. Intenta de nuevo.'));
    await cargar();
    setAccion(false);
  }

  // 📅 La fecha va en GRANDE y, si esta semana no hay noche, se dice (German 13-oct-2026). Ver lib/noche.js.
  const fn = infoNoche(data?.fecha);
  const nombreCorto = L.titulo.replace(/^[^A-Za-zÁÉÍÓÚÑáéíóúñ]+/, '');
  const fechaBonita = data?.fecha
    ? new Date(data.fecha + 'T12:00:00').toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' })
    : '';

  // 🍟 Noche patrocinada (German 6-oct-2026, Chip's en el Botanero): con la paleta de la marca la
  // página entera se pinta como las ligas patrocinadas (tema-patro). La clase `noche` agrega lo
  // que sólo esta página tiene (cajas grises, botón verde, captura del marcador) sin tocar las
  // pantallas de la escalera.
  const pc = data?.media?.colores?.a ? data.media.colores : null;
  // «🍻 Viernes Botanero» → ['Viernes', 'Botanero']: sin el emoji, en dos renglones.
  const nombreNoche = L.titulo.replace(/^[^A-Za-zÁÉÍÓÚÑáéíóúñ]+/, '').split(' ');

  return (
    <div className={`pb-24${pc ? ' tema-patro noche min-h-screen' : ''}`}
         style={pc ? { background: fondoPatro(pc), '--patro-a': pc.a, '--patro-tinte': pc.tinte } : undefined}>
      {avisoEspera && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-4"
             style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
             onClick={() => setAvisoEspera(null)}>
          {/* Tope de altura + scroll: sin esto, en un teléfono chico el bloque de avisos
              empuja el botón fuera de la pantalla y no se puede cerrar (24-ago-2026). */}
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm overflow-y-auto overscroll-contain"
               style={{ maxHeight: "min(85dvh, calc(100vh - 32px))" }}
               onClick={(e) => e.stopPropagation()}>
            <p className="text-3xl text-center">⏳</p>
            <p className="text-center font-black text-lg text-sp-gray mt-1">
              {t('Estás en lista de espera')}
            </p>
            <p className="text-center text-[15px] text-amber-700 font-bold mt-1">
              {t('Lugar #{n} · turno de {hora}', { n: avisoEspera.posicion_espera, hora: avisoEspera.hora })}
            </p>
            <p className="text-[14px] text-gray-600 mt-3 leading-snug">
              {avisoEspera.motivo_espera === 'cerrado'
                ? t('La lista de este turno cerró a las {hora}, media hora antes de empezar.', { hora: avisoEspera.cierra })
                : t('Este turno ya está lleno.')}
              {' '}<b>{t('Todavía no tienes lugar.')}</b> {t('Si alguien no llega o se baja, entras automáticamente y te llega una notificación.')}
            </p>
            {faltanAvisos && (
              <div className="mt-4">
                <PrenderAvisos compacto motivo={t('Te avisamos en cuanto se libere un lugar.')} />
              </div>
            )}
            <button onClick={() => setAvisoEspera(null)}
              className={faltanAvisos
                ? 'w-full mt-2 py-2.5 text-[14px] font-bold text-gray-500'
                : 'btn-green w-full mt-4'}>{t('Entendido')}</button>
          </div>
        </div>
      )}
      {pc ? (
        <div className="px-5 pt-5" style={{ fontFamily: KANIT }}>
          <button onClick={() => navigate('/ligas')} className="text-white/80 text-sm mb-1">‹ {t('Ligas')}</button>
          <div className="flex items-end gap-2">
            <div className="flex-1 min-w-0 pb-4">
              <h1 className="font-extrabold text-[34px] leading-[.95] uppercase">
                {nombreNoche[0]}<br />
                <span style={{ color: pc.tinte }}>{nombreNoche.slice(1).join(' ')}</span>
              </h1>
              <p className="text-white/85 text-[15px] mt-2 capitalize">{fechaBonita}</p>
            </div>
            {data.media.mascota_url && (
              <img src={data.media.mascota_url} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }}
                   className="w-[38%] max-w-[170px] object-contain -mr-1" />
            )}
          </div>
          <PatrocinioArco m={data.media} ancho="56%" />
        </div>
      ) : (
        <div className="bg-sp-green px-5 pt-5 pb-4">
          <button onClick={() => navigate('/ligas')} className="text-white/80 text-sm mb-1">‹ {t('Ligas')}</button>
          <h1 className="text-white font-black text-2xl">{L.titulo}</h1>
          <p className="text-white/85 text-[13px] mt-1 capitalize">{fechaBonita}</p>
        </div>
      )}

      {fn && (
        <div className="mx-4 mt-4 rounded-2xl border-2 border-sp-green bg-white px-4 py-3 text-center shadow-sm">
          <p className="text-[11px] font-black tracking-widest text-gray-400">
            {fn.saltaSemana ? t('PRÓXIMA FECHA') : t('FECHA DE ESTA SEMANA')}
          </p>
          <p className="text-sp-gray font-black text-[24px] leading-tight mt-0.5">📅 {fn.larga}</p>
          {fn.cuando && <p className="text-[13px] font-bold text-sp-green-dark mt-0.5">{fn.cuando}</p>}
        </div>
      )}
      {fn?.saltaSemana && (
        <div className="mx-4 mt-2 rounded-2xl bg-amber-50 border-2 border-amber-300 px-4 py-3">
          <p className="text-amber-800 font-black text-[15px]">⚠️ {t('Esta semana NO hay {noche}', { noche: nombreCorto })}</p>
          <p className="text-amber-800 text-[13px] mt-0.5 leading-snug">
            {t('Si te apuntas, tu lugar es para el {fecha}.', { fecha: fn.larga })}
          </p>
        </div>
      )}

      {/* Patrocinador PUNTUAL que encabeza la página de la liga (German 17-ago-2026).
          Puede ser de la temporada completa o de esta jornada: el backend ya resuelve
          cuál manda (la jornada le gana a la liga). */}
      {!pc && (data?.media?.sponsor_url || data?.media?.sponsor_nombre) && (
        <div className="mx-4 mt-4 rounded-2xl border border-gray-100 bg-white px-4 py-3 flex items-center gap-3 shadow-sm">
          <span className="text-[10px] font-black tracking-widest text-gray-400 flex-shrink-0">{t('PATROCINA')}</span>
          {data.media.sponsor_url ? (
            <img
              src={data.media.sponsor_url}
              alt={data.media.sponsor_nombre || t('Patrocinador')}
              loading="lazy"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
              className="h-9 max-w-[60%] object-contain"
            />
          ) : (
            <span className="font-black text-sp-gray text-[15px] truncate">{data.media.sponsor_nombre}</span>
          )}
        </div>
      )}

      <PrenderAvisos motivo={t('Te avisamos en qué cancha juegas y con quién en cuanto se arman, y si se libera un lugar.')} />

      <div className="px-4 mt-4 flex flex-col gap-3">
        <div className="card py-4">
          <p className="text-sp-gray font-bold text-[15px]">{L.lema()}</p>
          <p className="text-gray-500 text-[13px] mt-1 leading-relaxed">
            {t('Juegas individual: 3 sets rotando de pareja, y tu récord te va subiendo de cancha semana a semana.')}{' '}
            {L.dosPorUno
              ? t('Michelob 2x1 de 8 a 10pm solo para jugadores de la liga, y el futbol en las pantallas.')
              : t('Canchas sólo de mujeres. Y los jueves aplica la promo del club.')}{' '}
            {t('No es inscripción: cada semana te apuntas si quieres jugar. Cupo limitado*.')}
          </p>
          {/* German 19-oct-2026: la condición va ESCRITA, para que nadie se sienta engañado. */}
          {L.exigeResultado && (
            <p className="mt-2 text-[13px] leading-relaxed rounded-xl px-3 py-2 bg-amber-50 text-amber-900">
              📝 <b>{t('El precio del Botanero y el 2x1 son sólo si tu cancha captura su resultado en la app al terminar.')}</b>{' '}
              {t('Sin resultado, cada quien paga la renta normal ($200) y no hay 2x1.')}
            </p>
          )}
          {/* Anotación de precios por cancha extra (German 25-sep). Escala de club_config.botanero:
              canchas 1–4 al precio del turno; 5ª +$50, 6ª +$100, 7ª +$150; tope $200 por lugar. */}
          {(data?.turnos || []).some(tu => tu.precio != null) && (
            <p className="text-gray-400 text-[12px] mt-2 leading-relaxed">
              * {t('Precio por lugar, por orden de llegada. Después de la 4ª cancha el lugar sube:')}
              {(data?.turnos || []).filter(tu => tu.precio != null).map(tu => {
                const p = Number(tu.precio), x = (r) => Math.min(p + r, 200);
                return <span key={tu.turno} className="block"><b>{tu.hora}</b>: {t('canchas 1–4 ${a} · 5ª ${b} · 6ª ${c} · 7ª ${d}', { a: p, b: x(50), c: x(100), d: x(150) })}</span>;
              })}
            </p>
          )}
        </div>

        {/* ⚠️ Al partir el ranking en dos, `ranking` dejó de ser un arreglo: si esto siguiera
            preguntando por `.length` daría `undefined` y el banner de arranque NO volvería a
            salir nunca — un cambio de forma que se lleva por delante otra pantalla en
            silencio. Se pregunta por las dos listas. */}
        {ranking.hombres.length === 0 && ranking.mujeres.length === 0 && data?.fecha && (
          <div className="rounded-2xl px-4 py-3 text-center" style={{ background: '#2e1b06' }}>
            <p className="text-white font-black text-[15px]">🚀 {t('¡La liga arranca el {fecha}!', { fecha: fechaBonita })}</p>
            <p className="text-amber-200/90 text-[12px] mt-0.5">{t('Cuotas con precio de lanzamiento — apúntate y estrena el ranking.')}</p>
          </div>
        )}

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        {loading ? (
          <div className="card py-8 text-center text-gray-400 text-sm">{t('Cargando…')}</div>
        ) : (data?.turnos || []).map(tu => {
          const lleno = tu.apuntados >= tu.cupo;
          return (
            <div key={tu.turno} className="card py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sp-gray font-black text-lg">{tu.hora}</p>
                  <p className="text-gray-400 text-[12px]">
                    {!L.dosPorUno ? t('sólo mujeres') : tu.turno === '1830' ? t('Aprovechas TODO el 2x1') : t('Entras directo al 2x1')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sp-green-dark font-black text-xl">${tu.precio}</p>
                  <p className="text-gray-400 text-[12px]">{L.exigeResultado ? t('por jugador · con resultado') : t('por jugador')}</p>
                  <p className="text-amber-600 text-[11px] font-bold">{t('precio de lanzamiento')}</p>
                </div>
              </div>

              <div className="mt-3">
                <div className="flex justify-between text-[12px] text-gray-400 mb-1">
                  <span>{t('{a}/{c} lugares', { a: tu.apuntados, c: tu.cupo })}{tu.en_espera > 0 ? ' · ' + t('{n} en espera', { n: tu.en_espera }) : ''}</span>
                  <span>{tu.estado === 'cerrada' ? t('Lista cerrada') : (lleno ? t('Lleno') : t('Lista abierta'))}</span>
                </div>
                <div style={{ height: 8, borderRadius: 6, background: pc ? 'rgba(255,255,255,.2)' : '#eef2e6', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, (tu.apuntados / tu.cupo) * 100)}%`, background: lleno ? '#e0a800' : (pc ? pc.tinte : '#84cc16'), transition: 'width .3s' }} />
                </div>
              </div>

              {tu.mixto ? (
                <p className="text-[12px] mt-2 font-bold text-sp-green-dark">
                  👫 {t('Este turno se juega MIXTO — las canchas no se separan')}
                  <span className="text-gray-400 font-normal"> · ♂ {tu.hombres} · ♀ {tu.mujeres}</span>
                </p>
              ) : (tu.hombres > 0 || tu.mujeres > 0) && (
                <p className="text-[12px] mt-2 flex gap-3">
                  <span className="text-blue-600 font-bold">♂ {tu.hombres} {tu.hombres % 4 ? '· ' + t('faltan {n} para otra cancha', { n: 4 - (tu.hombres % 4) }) : ''}</span>
                  <span className="text-pink-600 font-bold">♀ {tu.mujeres} {tu.mujeres % 4 ? '· ' + t('faltan {n} para otra cancha', { n: 4 - (tu.mujeres % 4) }) : ''}</span>
                </p>
              )}

              {tu.nombres?.length > 0 && (
                <p className="text-gray-400 text-[12px] mt-2 leading-relaxed">
                  {t('Van: {nombres}', { nombres: tu.nombres.join(', ') })}
                </p>
              )}

              <div className="mt-3">
                {tu.mi_estado === 'apuntado' && (
                  <div className="flex items-center gap-2">
                    <span className="flex-1 text-center text-[14px] font-bold text-green-600 bg-green-50 rounded-xl py-2.5">
                      {tu.mi_cancha ? t('✓ ¡Vas! Te toca la Cancha {n}', { n: tu.mi_cancha }) : L.nosVemos()}
                    </span>
                    <button onClick={() => bajarse(tu.turno)} disabled={accion} className="text-[13px] text-gray-400 underline px-2">{t('Bajarme')}</button>
                  </div>
                )}

                {/* Con quién juega cada set, ANTES de capturar: llegando a la cancha ya sabe
                    con quién le toca en cada uno, sin tener que preguntar. */}
                {tu.mi_estado === 'apuntado' && tu.mis_sets && capturando !== tu.turno && (
                  <div className="mt-2 rounded-xl bg-gray-50 border border-gray-200 p-2.5">
                    <div className="text-[11.5px] font-bold text-gray-400 mb-1.5">{t('TUS PAREJAS DE HOY')}</div>
                    {tu.mis_sets.map(s => (
                      <div key={s.set} className="flex items-baseline gap-2 text-[13px] leading-relaxed">
                        <span className="text-gray-400 shrink-0">S{s.set}</span>
                        <span className="text-gray-700">
                          <b className="text-sp-green">{t('Tú y {nombre}', { nombre: s.companero })}</b>
                          <span className="text-gray-400"> vs </span>
                          {s.rivales.join(' ' + t('y') + ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Al terminar, el propio jugador captura el marcador de SU cancha — igual
                    que en las retas. Antes dependía de que alguien del club fuera cancha por
                    cancha, y si no lo hacía esa noche NO había ranking. */}
                {tu.mi_estado === 'apuntado' && tu.mi_cancha && capturando !== tu.turno && !okMarcador && (
                  <button onClick={() => { setCapturando(tu.turno); setError(''); }}
                          className="w-full mt-2 text-[13.5px] font-bold text-sp-green border border-sp-green/40 rounded-xl py-2.5">
                    🏓 {L.exigeResultado ? t('Capturar el marcador de mi cancha (activa tu precio y el 2x1)') : t('Capturar el marcador de mi cancha')}
                  </button>
                )}

                {capturando === tu.turno && (
                  <div className="mt-2 p-3 rounded-xl bg-gray-50 border border-gray-200">
                    <p className="text-[12.5px] text-gray-500 leading-snug mb-2">
                      {t('Games de cada set en tu Cancha {n}. En cada set cambian las parejas: anota los games de cada lado como aparecen abajo.', { n: tu.mi_cancha })}
                    </p>
                    {/* Con NOMBRES: el jugador tiene que ver de quién es cada marcador. Sin
                        esto captura a ciegas y basta con que vaya en la pareja 3&4 para que
                        el set se lo acredite a sus rivales. */}
                    {sets.map((par, i) => {
                      const ms = tu.mis_sets && tu.mis_sets[i];
                      return (
                        <div key={i} className="mb-2.5 rounded-lg bg-white border border-gray-200 p-2">
                          <div className="text-[11.5px] font-bold text-gray-400 mb-1">{t('SET {n}', { n: i + 1 })}</div>
                          {ms ? (
                            <>
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-[13.5px] font-bold text-sp-green truncate">
                                  {t('Tú y {nombre}', { nombre: ms.companero })}
                                </span>
                                <input inputMode="numeric" value={par[0]} onChange={e => setGame(i, 0, e.target.value)}
                                       className="w-14 shrink-0 text-center text-[17px] font-bold border-2 border-sp-green/40 rounded-lg py-1.5" placeholder="0" />
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[13.5px] text-gray-600 truncate">
                                  {ms.rivales.join(' ' + t('y') + ' ')}
                                </span>
                                <input inputMode="numeric" value={par[1]} onChange={e => setGame(i, 1, e.target.value)}
                                       className="w-14 shrink-0 text-center text-[17px] font-bold border rounded-lg py-1.5" placeholder="0" />
                              </div>
                            </>
                          ) : (
                            // Cancha incompleta: sin los 4 no hay parejas que nombrar.
                            <div className="flex items-center gap-2">
                              <span className="text-[12.5px] text-gray-500 flex-1">{t('Ustedes — Ellos')}</span>
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
                              className="flex-1 text-[13px] text-gray-500 py-2">{t('Cancelar')}</button>
                      <button onClick={() => enviarMarcador(tu.turno)} disabled={accion}
                              className="flex-1 btn-green disabled:opacity-50">{t('Guardar marcador')}</button>
                    </div>
                  </div>
                )}

                {okMarcador && tu.mi_estado === 'apuntado' && (
                  <p className="mt-2 text-center text-[13px] font-bold text-green-600">{okMarcador}</p>
                )}
                {tu.mi_estado === 'espera' && (
                  <div className="flex items-center gap-2">
                    <span className="flex-1 text-center text-[14px] font-bold text-amber-600 bg-amber-50 rounded-xl py-2.5">⏳ {t('En espera · lugar #{n}', { n: tu.mi_posicion_espera })}</span>
                    <button onClick={() => bajarse(tu.turno)} disabled={accion} className="text-[13px] text-gray-400 underline px-2">{t('Salirme')}</button>
                  </div>
                )}
                {!tu.mi_estado && pideSexo !== tu.turno && (
                  <button onClick={() => apuntarse(tu.turno)} disabled={accion} className="btn-green w-full disabled:opacity-50">
                    {lleno || tu.estado === 'cerrada' ? t('Anotarme en la espera') : (fn ? t('¡Me apunto el {fecha}!', { fecha: fn.corta }) : t('¡Me apunto!'))}
                  </button>
                )}
                {!tu.mi_estado && pideSexo === tu.turno && (
                  <div className="rounded-xl border border-gray-200 p-3">
                    <p className="text-[13px] font-bold text-gray-700 mb-1">{t('¿En qué canchas juegas?')}</p>
                    <p className="text-[12px] text-gray-400 mb-2.5">{t('Las canchas del Botanero son de hombres o de mujeres, no mixtas. Solo te lo preguntamos esta vez.')}</p>
                    <div className="flex gap-2">
                      <button onClick={() => apuntarse(tu.turno, 'H')} disabled={accion}
                        className="flex-1 rounded-xl py-2.5 font-bold text-[14px] border-2 border-blue-200 text-blue-600 bg-blue-50 disabled:opacity-50">♂ {t('Hombres')}</button>
                      <button onClick={() => apuntarse(tu.turno, 'M')} disabled={accion}
                        className="flex-1 rounded-xl py-2.5 font-bold text-[14px] border-2 border-pink-200 text-pink-600 bg-pink-50 disabled:opacity-50">♀ {t('Mujeres')}</button>
                    </div>
                    <button onClick={() => setPideSexo(null)} className="text-[12px] text-gray-400 underline mt-2">{t('Cancelar')}</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {(ranking.hombres.length > 0 || ranking.mujeres.length > 0) && (
          <div className="card py-4">
            <p className="text-sp-gray font-bold text-[15px] mb-2">🏆 {t('Ranking de la liga')}</p>
            {/* Dos tablas, cada una con SU numeración: las canchas no se mezclan, así que
                tampoco el ranking. Una lista vacía no se pinta — un encabezado con nada
                debajo se lee como "aquí no juega nadie". */}
            {[[t('Hombres'), ranking.hombres], [t('Mujeres'), ranking.mujeres]].map(([rotulo, filas]) =>
              filas.length === 0 ? null : (
                <div key={rotulo} className="mt-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mt-3 mb-1">{rotulo}</p>
                  <div className="flex flex-col">
                    {filas.slice(0, 10).map(r => (
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
                </div>
              ))}
            <p className="text-gray-400 text-[11px] mt-2">{t('2 pts por set ganado + 1 por venir a jugar. Tu récord decide tu cancha.')}</p>
          </div>
        )}

        {juegos?.turnos?.length > 0 && (
          <div className="card py-4">
            <p className="text-sp-gray font-bold text-[15px]">🎾 {t('Juegos de la última jornada')}</p>
            <p className="text-gray-400 text-[12px] mb-2 capitalize">
              {new Date(juegos.fecha + 'T12:00:00').toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            {juegos.turnos.map(tu => (
              <div key={tu.turno} className="mt-2">
                <p className="text-gray-400 text-[11px] font-bold uppercase tracking-wide">{t('Turno {hora}', { hora: tu.hora })}</p>
                {tu.canchas.map(c => (
                  <div key={c.cancha} className="mt-1.5 rounded-xl bg-gray-50 px-3 py-2">
                    <p className="text-[12px] font-bold text-sp-gray mb-1">{t('Cancha {n}', { n: c.cancha })}</p>
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
          {t('La cuota se paga en el club al llegar. La lista de cada turno cierra media hora antes de empezar; después te puedes anotar, pero quedas en lista de espera. Si se libera un lugar, entras y te avisamos con una notificación. Si no vas a poder, bájate con tiempo — tu lugar es oro para el que sigue.')}
        </p>
      </div>
    </div>
  );
}
