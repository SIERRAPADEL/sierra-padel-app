import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { t, locale } from '../i18n';

// 🎥 MIS JUGADAS — las repeticiones de las cámaras del club, en NUESTRA app (German, 14-oct-2026:
// «ya va llegando el momento de implementar las repeticiones en la app, ya se termina el
// contrato»). Reemplaza a ReplayMe con los MISMOS botones de cancha.
//
// 🔘 Se graba SÓLO con el botón físico al lado de la cancha (German: «el botón de grabar no va
// en la app»). Aquí se ven, se descargan y se comparten.
// ⏳ Cada jugada vive 7 días en la nube (German) → se dice en todos lados y se invita a descargarla.
//
// 🏟️ JUGADAS DEL CLUB (German, 12-nov-2026): «se comparte público en la app, para que todos lo
// vean, y al compartir el video participa en la dinámica de la quincena/mes». Misma pantalla con
// dos pestañas (no una página nueva): «Mías» y «Del club». La pestaña y el botón sólo salen si
// el backend dice que el muro está disponible (migración aplicada) y visible para este usuario.
//
// Cada clip ya llega ligado a su renta y a sus jugadores (trigger replay_resolver en la base):
// GET /replays/mias      → { ahora: { cancha, hasta } | null, dias_nube: 7, clips: [...] }
// GET /replays/club/muro → { disponible, visible, periodo, concurso | null, jugadas, compartidas_mias }

const TZ = { timeZone: 'America/Monterrey' };
const fmtHora = (iso) => new Date(iso).toLocaleTimeString(locale(), { ...TZ, hour: 'numeric', minute: '2-digit' });
const fmtDia = (iso) => {
  const d = new Date(iso);
  const dia = d.toLocaleDateString('en-CA', TZ);
  if (dia === new Date().toLocaleDateString('en-CA', TZ)) return t('Hoy');
  if (dia === new Date(Date.now() - 864e5).toLocaleDateString('en-CA', TZ)) return t('Ayer');
  const s = d.toLocaleDateString(locale(), { ...TZ, weekday: 'long', day: 'numeric', month: 'long' });
  return s[0].toUpperCase() + s.slice(1);
};
const dur = (s) => `0:${String(Math.round(s || 30)).padStart(2, '0')}`;
// Días que le quedan en la nube (se borra a los `dias` de grabada).
const quedan = (iso, dias, conservar) => Math.max(0, Math.ceil((Math.max(new Date(iso).getTime() + dias * 864e5, conservar ? new Date(conservar).getTime() : 0) - Date.now()) / 864e5));
// Compartida en el club: se conserva más (hasta el cierre de su periodo + unos días; lo dice el backend).
const hasta = (iso, dias, conservar) => {
  const s = new Date(Math.max(new Date(iso).getTime() + dias * 864e5, conservar ? new Date(conservar).getTime() : 0)).toLocaleDateString(locale(), { ...TZ, weekday: 'short', day: 'numeric', month: 'short' });
  return s.replace(/\./g, '');
};
// «del 1 al 15 de noviembre» (fechas 'YYYY-MM-DD' del periodo, ya en hora del club).
const fmtRango = (desde, hastaF) => {
  const d = (f) => new Date(`${f}T12:00:00-06:00`);
  return t('del {a} al {b}', { a: d(desde).toLocaleDateString(locale(), { ...TZ, day: 'numeric' }),
    b: d(hastaF).toLocaleDateString(locale(), { ...TZ, day: 'numeric', month: 'long' }) });
};
const nombreDinamica = (tipo) => (tipo === 'mes' ? t('Jugada del mes') : tipo === 'semana' ? t('Jugada de la semana') : t('Jugada de la quincena'));

function Clip({ c, dias, onAbrir, enClub }) {
  const q = quedan(c.iniciado_en, dias, enClub && enClub.conservar_hasta);
  return (
    <button onClick={() => onAbrir(c)} className="text-left active:scale-[0.98] transition-transform">
      <div className="relative rounded-xl overflow-hidden bg-black" style={{ aspectRatio: '3/4' }}>
        <img src={c.thumb} alt="" className="w-full h-full object-cover" />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="w-11 h-11 rounded-full bg-white/90 flex items-center justify-center text-[18px] pl-0.5">▶</span>
        </span>
        <span className="absolute bottom-1.5 right-1.5 text-[11px] font-black text-white bg-black/60 rounded px-1.5 py-0.5">{dur(c.duracion_seg)}</span>
        {c.nueva && <span className="absolute top-1.5 left-1.5 text-[10px] font-black text-white bg-sp-green rounded px-1.5 py-0.5">{t('NUEVA')}</span>}
        {enClub && <span className="absolute top-1.5 right-1.5 text-[10px] font-black text-sp-gray bg-white/90 rounded px-1.5 py-0.5">🏟️ {t('EN EL CLUB')}</span>}
      </div>
      <p className="text-sp-gray font-bold text-[13.5px] mt-1.5">{t('Cancha {n}', { n: c.cancha })} · {fmtHora(c.iniciado_en)}</p>
      <p className={`text-[12px] font-semibold ${q <= 2 ? 'text-[#b45309]' : 'text-gray-400'}`}>
        {q <= 0 ? t('Se borra hoy') : q === 1 ? t('⏳ Se borra mañana') : t('Se borra en {n} días', { n: q })}
      </p>
    </button>
  );
}

// Una jugada del muro: miniatura con el nombre de quien la compartió, y el ❤️ a la mano.
function ClipClub({ j, onAbrir, onLike }) {
  return (
    <div>
      <button onClick={() => onAbrir(j)} className="block w-full text-left active:scale-[0.98] transition-transform">
        <div className="relative rounded-xl overflow-hidden bg-black" style={{ aspectRatio: '3/4' }}>
          <img src={j.thumb} alt="" className="w-full h-full object-cover" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="w-11 h-11 rounded-full bg-white/90 flex items-center justify-center text-[18px] pl-0.5">▶</span>
          </span>
          <span className="absolute top-1.5 left-1.5 right-1.5 text-[11.5px] font-black text-white truncate" style={{ textShadow: '0 1px 3px rgba(0,0,0,.8)' }}>{j.nombre}</span>
          <span className="absolute bottom-1.5 right-1.5 text-[11px] font-black text-white bg-black/60 rounded px-1.5 py-0.5">{dur(j.duracion_seg)}</span>
        </div>
      </button>
      <div className="flex items-center justify-between mt-1.5 gap-1">
        <p className="text-sp-gray font-bold text-[12.5px] leading-tight min-w-0">
          {t('Cancha {n}', { n: j.cancha })}<br /><span className="text-gray-400 font-semibold">{fmtDia(j.iniciado_en)} · {fmtHora(j.iniciado_en)}</span>
        </p>
        <BotonLike j={j} onLike={onLike} chico />
      </div>
    </div>
  );
}
function BotonLike({ j, onLike, chico }) {
  // Mi propia jugada: se ve cuántos ❤️ lleva, pero no me los doy.
  const base = chico ? 'px-2.5 py-1.5 rounded-full text-[13px]' : 'w-full py-3.5 rounded-xl text-[15px]';
  if (j.mia) return <span className={`${base} font-black flex-shrink-0 bg-gray-100 text-gray-500 text-center`}>❤️ {j.likes}</span>;
  return (
    <button onClick={(e) => { e.stopPropagation(); onLike(j); }}
      className={`${base} font-black flex-shrink-0 active:scale-95 transition-transform ${j.yo_like ? 'bg-red-50 text-red-600 border-2 border-red-200' : 'bg-white text-sp-gray border-2 border-gray-200'}`}>
      {j.yo_like ? '❤️' : '🤍'} {chico ? j.likes : (j.yo_like ? t('Te gusta · {n}', { n: j.likes }) : t('Me gusta · {n}', { n: j.likes }))}
    </button>
  );
}

// 🏆 La jugada del periodo: sólo con el concurso PRENDIDO (club_config replays.concurso.activo).
function Ranking({ c }) {
  const top = (c.ranking || []).slice(0, 5);
  const premio = Object.fromEntries((c.ganadores || []).map(g => [g.clip_id, g.premio]));
  return (
    <div className="rounded-2xl px-4 py-3.5 text-white" style={{ background: 'linear-gradient(135deg,#13201a,#0a0f0c)' }}>
      <p className="font-black text-[14.5px] uppercase" style={{ color: '#8dc63f' }}>🏆 {nombreDinamica(c.periodo)}</p>
      <p className="text-[13px] mt-0.5 text-white/80 leading-snug">
        {fmtRango(c.desde, c.hasta)} · {t('gana la de más ❤️ (mínimo {n})', { n: c.min_likes })}
      </p>
      {top.length ? (
        <div className="mt-2.5 flex flex-col gap-1.5">
          {top.map((r, i) => (
            <div key={r.clip_id} className="flex items-center gap-2.5">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-black flex-shrink-0 ${i === 0 ? 'bg-[#8dc63f] text-[#13201a]' : 'bg-white/15'}`}>{i + 1}</span>
              <span className="flex-1 min-w-0">
                <span className="block truncate font-bold text-[14px]">{r.nombre}</span>
                {premio[r.clip_id] && <span className="block truncate text-[11.5px] font-bold" style={{ color: '#8dc63f' }}>🎁 {premio[r.clip_id]}</span>}
              </span>
              <span className={`font-black text-[14px] ${r.cuenta ? '' : 'text-white/50'}`}>{r.likes} ❤️</span>
            </div>
          ))}
        </div>
      ) : <p className="text-[13px] mt-2 text-white/60">{t('Todavía nadie entra. Comparte tu mejor jugada.')}</p>}
      {(c.premios || []).length > 0 && !(c.ganadores || []).length && (
        <p className="text-[12.5px] mt-2.5 text-white/70">{c.premios.map((pr, i) => t('{n}º {premio}', { n: i + 1, premio: pr })).join(' · ')}</p>
      )}
    </div>
  );
}

// Descargar: se baja el MP4 y se guarda con nombre propio (en iPhone abre el video para «Guardar»).
async function bajarArchivo(c) {
  const r = await fetch(c.url); const b = await r.blob();
  return new File([b], `SierraPadel-cancha${c.cancha}-${(c.slug || c.id)}.mp4`, { type: 'video/mp4' });
}
async function descargar(c) {
  try {
    const f = await bajarArchivo(c);
    const u = URL.createObjectURL(f), a = document.createElement('a');
    a.href = u; a.download = f.name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 10000);
  } catch { window.open(c.url, '_blank'); }
}
// Compartir: el menú del teléfono (WhatsApp, Instagram…) con el video como archivo.
async function compartir(c) {
  try {
    const f = await bajarArchivo(c);
    if (navigator.canShare && navigator.canShare({ files: [f] })) {
      await navigator.share({ files: [f], title: t('Mi jugada en Sierra Pádel'), text: t('🎾 Mi jugada en @sierra.padel') });
      return;
    }
  } catch { /* cancelado o no soportado */ }
  descargar(c);
}

export default function Jugadas() {
  const navigate = useNavigate();
  const { apiFetch } = useApi();
  const [data, setData] = useState(null);
  const [muro, setMuro] = useState(null);
  const [tab, setTab] = useState('mias');
  const [viendo, setViendo] = useState(null);          // { ...clip, origen: 'mias' | 'club' }
  const [pregunta, setPregunta] = useState(null);      // { modo: 'compartir' | 'quitar', clipId }
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState('');

  const cargarMuro = () => apiFetch('/replays/club/muro').then(d => { if (d?.ok) setMuro(d.data); }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { apiFetch('/replays/mias').then(d => { if (d.ok) setData(d.data); }); cargarMuro(); }, []);

  const dias = data?.dias_nube || 7;
  const esSemana = data?.concurso?.periodo === 'semana';
  const nombreConcurso = esSemana ? t('JUGADA DE LA SEMANA') : t('JUGADA DE LA QUINCENA');
  const clips = data?.clips || [];
  const grupos = [];
  for (const c of clips) {
    const k = fmtDia(c.iniciado_en);
    const g = grupos.find(x => x.dia === k);
    if (g) g.clips.push(c); else grupos.push({ dia: k, clips: [c] });
  }
  // El muro del club existe (migración aplicada) y está abierto para mí (visible_app o probador).
  const clubOn = !!(muro?.disponible && muro?.visible);
  const enClub = Object.fromEntries((muro?.compartidas_mias || []).map(s => [s.clip_id, s]));
  const concursoClub = muro?.concurso || null;
  const tipoPer = muro?.periodo?.tipo || 'quincena';

  async function confirmar() {
    if (!pregunta) return;
    setOcupado(true);
    const r = await apiFetch(`/replays/club/${pregunta.clipId}/compartir`, { method: pregunta.modo === 'quitar' ? 'DELETE' : 'POST' });
    setOcupado(false); setPregunta(null);
    if (!r?.ok) { setAviso(r?.error || t('No se pudo. Intenta de nuevo.')); return; }
    setAviso(pregunta.modo === 'quitar' ? t('Listo: tu jugada ya no está en el muro del club.') : t('¡Listo! Tu jugada ya está en el muro del club.'));
    if (pregunta.modo === 'quitar' && viendo?.origen === 'club') setViendo(null);
    cargarMuro();
  }
  async function darLike(j) {
    const quitar = j.yo_like;
    const cambiar = (x) => (x.clip_id === j.clip_id ? { ...x, yo_like: !quitar, likes: x.likes + (quitar ? -1 : 1) } : x);
    setMuro(m => ({ ...m, jugadas: m.jugadas.map(cambiar) }));
    setViendo(v => (v && v.clip_id === j.clip_id ? cambiar(v) : v));
    const r = await apiFetch(`/replays/club/${j.clip_id}/like`, { method: quitar ? 'DELETE' : 'POST' });
    if (!r?.ok) setAviso(r?.error || t('No se pudo. Intenta de nuevo.'));
    cargarMuro();
  }
  const textoCompartir = concursoClub
    ? t('Tu jugada se verá en la app para todos los del club y entra a la {dinamica}.', { dinamica: nombreDinamica(tipoPer) })
    : t('Tu jugada se verá en la app para todos los del club.');

  return (
    <div className="pb-24">
      <div className="bg-sp-green px-5 pt-5 pb-4">
        <button onClick={() => navigate('/home')} className="text-white/80 text-sm mb-1">‹ {t('Inicio')}</button>
        <h1 className="text-white font-black text-2xl">🎥 {tab === 'club' && clubOn ? t('Jugadas del club') : t('Mis jugadas')}</h1>
        <p className="text-white/85 text-[13px] mt-1">{tab === 'club' ? t('Las mejores jugadas que comparten los del club.') : t('Las repeticiones de tus partidos, grabadas por las cámaras del club.')}</p>
        {clubOn && (
          <div className="mt-3 grid grid-cols-2 gap-1 p-1 rounded-xl bg-black/15">
            {[['mias', t('Mías')], ['club', t('Del club')]].map(([k, txt]) => (
              <button key={k} onClick={() => setTab(k)}
                className={`py-2 rounded-lg font-black text-[14px] ${tab === k ? 'bg-white text-sp-gray shadow' : 'text-white/85'}`}>{txt}</button>
            ))}
          </div>
        )}
      </div>

      {aviso && (
        <div className="mx-4 mt-3 rounded-xl px-4 py-2.5 bg-gray-900 text-white text-[13.5px] font-bold flex items-center justify-between gap-3" onClick={() => setAviso('')}>
          <span>{aviso}</span><span className="text-white/60">✕</span>
        </div>
      )}

      {tab === 'mias' || !clubOn ? (
        <div className="px-4 mt-4 flex flex-col gap-4">
          {data?.ahora && (
            <div className="rounded-2xl p-4 text-white" style={{ background: '#111827' }}>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[12px] font-black tracking-widest text-white/70">{t('ESTÁS EN LA CANCHA {n}', { n: data.ahora.cancha })}</span>
              </div>
              <p className="font-black text-[19px] mt-1.5 leading-snug">{t('¿Buen punto? Aprieta el botón que está a un lado de la cancha')}</p>
              <p className="text-white/60 text-[13px] mt-1">{t('Tu renta es hasta las {hora} · se guardan los últimos 30 segundos y aparecen aquí en un minuto', { hora: data.ahora.hasta })}</p>
            </div>
          )}

          {clips.length > 0 && (
            <div className="rounded-2xl px-4 py-3 bg-amber-50 border-2 border-amber-300">
              <p className="text-amber-900 font-black text-[14.5px]">⏳ {t('Tus jugadas se guardan {n} días', { n: dias })}</p>
              <p className="text-amber-900 text-[13px] mt-0.5 leading-snug">{t('Después se borran de la nube.')} <b>{t('Descarga las que quieras conservar.')}</b></p>
            </div>
          )}

          {/* La dinámica ya vive en la app: con el muro abierto se invita a compartir aquí, no en Instagram. */}
          {clips.length > 0 && clubOn && concursoClub && (
            <div className="rounded-2xl px-4 py-3 text-white" style={{ background: 'linear-gradient(135deg,#13201a,#0a0f0c)' }}>
              <p className="font-black text-[14.5px] uppercase" style={{ color: '#8dc63f' }}>🏆 {nombreDinamica(tipoPer)}</p>
              <p className="text-[13.5px] mt-0.5 leading-snug">{t('Abre tu mejor jugada y tócale «Compartir en el club». Gana la de más ❤️ (mínimo {n}).', { n: concursoClub.min_likes })}</p>
            </div>
          )}
          {clips.length > 0 && !clubOn && data?.concurso && (
            <div className="rounded-2xl px-4 py-3 text-white" style={{ background: 'linear-gradient(135deg,#13201a,#0a0f0c)' }}>
              <p className="font-black text-[14.5px]" style={{ color: '#8dc63f' }}>🏆 {nombreConcurso}</p>
              <p className="text-[13.5px] mt-0.5 leading-snug">{t('Súbela a Instagram y etiqueta a @sierra.padel. Gana la de más likes y comentarios (mínimo {n} likes).', { n: data.concurso.min_likes })}</p>
              {(data.concurso.premios || []).length > 0 && (
                <p className="text-[12.5px] mt-1 text-white/70">{data.concurso.premios.map((pr, i) => t('{n}º {premio}', { n: i + 1, premio: pr })).join(' · ')}</p>
              )}
            </div>
          )}

          {data && !clips.length && (
            <div className="card text-center py-8">
              <p className="text-3xl">🎾</p>
              <p className="text-sp-gray font-black text-[16px] mt-1">{t('Todavía no tienes jugadas')}</p>
              <p className="text-gray-400 text-[13px] mt-1 max-w-[30ch] mx-auto">{t('Cuando juegues, aprieta el botón que está a un lado de tu cancha después de un buen punto y la repetición aparece aquí.')}</p>
            </div>
          )}

          {grupos.map(g => (
            <div key={g.dia}>
              <p className="text-sp-gray font-black text-[15px] mb-2">{g.dia}</p>
              <div className="grid grid-cols-2 gap-3">
                {g.clips.map(c => <Clip key={c.id} c={c} dias={dias} enClub={clubOn && enClub[c.id] && !enClub[c.id].oculto ? enClub[c.id] : null} onAbrir={(x) => setViendo({ ...x, origen: 'mias' })} />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4 mt-4 flex flex-col gap-4">
          {concursoClub && <Ranking c={concursoClub} />}
          {!(muro.jugadas || []).length ? (
            <div className="card text-center py-8">
              <p className="text-3xl">🏟️</p>
              <p className="text-sp-gray font-black text-[16px] mt-1">{t('Todavía nadie comparte jugadas')}</p>
              <p className="text-gray-400 text-[13px] mt-1 max-w-[32ch] mx-auto">{t('Sé el primero: abre una de tus jugadas y toca «Compartir en el club».')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-4">
              {muro.jugadas.map(j => <ClipClub key={j.clip_id} j={j} onLike={darLike} onAbrir={(x) => setViendo({ ...x, origen: 'club' })} />)}
            </div>
          )}
        </div>
      )}

      {/* El reproductor rueda si el teléfono es chico y respeta el área segura de abajo (iPhone). */}
      {viendo && (
        <div className="fixed inset-0 z-[70] bg-black flex flex-col overflow-y-auto overscroll-contain" onClick={() => setViendo(null)}
             style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <div className="flex items-center justify-between px-4 pt-4 pb-2 text-white">
            <div>
              <p className="font-black text-[16px]">{viendo.origen === 'club' ? `${viendo.nombre} · ` : ''}{t('Cancha {n}', { n: viendo.cancha })}</p>
              <p className="text-white/60 text-[12.5px]">{fmtDia(viendo.iniciado_en)} · {fmtHora(viendo.iniciado_en)}</p>
            </div>
            <button className="text-white/80 text-[26px] leading-none px-2">✕</button>
          </div>
          <div className="flex-1 min-h-0 flex items-center justify-center" onClick={e => e.stopPropagation()}>
            <video src={viendo.url} poster={viendo.thumb} controls playsInline className="max-h-full max-w-full" />
          </div>
          {viendo.origen === 'club' ? (
            <div className="px-4 pb-8 pt-3 flex flex-col gap-2" onClick={e => e.stopPropagation()}>
              <BotonLike j={viendo} onLike={darLike} />
              {viendo.mia && <button onClick={() => setPregunta({ modo: 'quitar', clipId: viendo.clip_id })} className="py-2 text-white/70 font-bold text-[14px] underline">{t('Dejar de compartir')}</button>}
            </div>
          ) : (
            <div className="px-4 pb-8 pt-3 flex flex-col gap-2" onClick={e => e.stopPropagation()}>
              <p className="text-amber-300 text-[13px] font-bold text-center">⏳ {t('Disponible hasta el {fecha} · descárgala para no perderla', { fecha: hasta(viendo.iniciado_en, dias, enClub[viendo.id] && !enClub[viendo.id].oculto && enClub[viendo.id].conservar_hasta) })}</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => descargar(viendo)} className="py-3.5 rounded-xl bg-white text-sp-gray font-black text-[15px]">⬇ {t('Descargar')}</button>
                <button onClick={() => compartir(viendo)} className="py-3.5 rounded-xl bg-sp-green text-white font-black text-[15px]">↗ {t('Compartir')}</button>
              </div>
              {clubOn && (enClub[viendo.id]?.oculto ? (
                <p className="text-white/55 text-[12.5px] text-center">{t('El club quitó esta jugada del muro.')}</p>
              ) : enClub[viendo.id] ? (
                <div className="rounded-xl border-2 border-white/25 px-4 py-2.5 flex items-center justify-between gap-3">
                  <span className="text-white font-black text-[14px]">✓ {t('Está en el muro del club')}</span>
                  <button onClick={() => setPregunta({ modo: 'quitar', clipId: viendo.id })} className="text-white/70 font-bold text-[13px] underline flex-shrink-0">{t('Dejar de compartir')}</button>
                </div>
              ) : (
                <button onClick={() => setPregunta({ modo: 'compartir', clipId: viendo.id })}
                  className="py-3.5 rounded-xl font-black text-[15px] border-2" style={{ background: '#13201a', color: '#8dc63f', borderColor: '#8dc63f' }}>
                  🏟️ {t('Compartir en el club')}
                </button>
              ))}
              {clubOn && concursoClub && !enClub[viendo.id] && <p className="text-white/55 text-[12px] text-center">{t('Entra a la {dinamica}: gana la de más ❤️', { dinamica: nombreDinamica(tipoPer) })} 🏆</p>}
              {!clubOn && data?.concurso && <p className="text-white/55 text-[12px] text-center">{esSemana ? t('Etiqueta a @sierra.padel y entra a la Jugada de la semana') : t('Etiqueta a @sierra.padel y entra a la Jugada de la quincena')} 🏆</p>}
            </div>
          )}
        </div>
      )}

      {/* Confirmación antes de publicar (o de quitar). */}
      {pregunta && (
        <div className="fixed inset-0 z-[80] bg-black/60 flex items-end" onClick={() => !ocupado && setPregunta(null)}>
          <div className="w-full bg-white rounded-t-3xl px-5 pt-5 pb-8" onClick={e => e.stopPropagation()} style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}>
            <p className="text-[28px] leading-none">{pregunta.modo === 'quitar' ? '🙈' : '🏟️'}</p>
            <p className="text-sp-gray font-black text-[19px] mt-2">{pregunta.modo === 'quitar' ? t('¿Dejar de compartir?') : t('¿Compartir en el club?')}</p>
            <p className="text-gray-600 text-[14.5px] mt-1.5 leading-snug">
              {pregunta.modo === 'quitar' ? t('Tu jugada ya no se verá en el muro del club y sale de la dinámica.') : textoCompartir}
            </p>
            {pregunta.modo !== 'quitar' && <p className="text-gray-400 text-[13px] mt-1.5">{t('Se ve tu nombre y la inicial de tu apellido. Puedes dejar de compartirla cuando quieras.')}</p>}
            <div className="grid grid-cols-2 gap-3 mt-5">
              <button disabled={ocupado} onClick={() => setPregunta(null)} className="py-3.5 rounded-xl bg-gray-100 text-sp-gray font-black text-[15px]">{t('Cancelar')}</button>
              <button disabled={ocupado} onClick={confirmar} className={`py-3.5 rounded-xl font-black text-[15px] text-white ${pregunta.modo === 'quitar' ? 'bg-gray-800' : 'bg-sp-green'}`}>
                {ocupado ? '…' : pregunta.modo === 'quitar' ? t('Sí, quitarla') : t('Sí, compartir')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
