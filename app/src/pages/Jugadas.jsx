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
// 🏆 Jugada del mes: subirla a redes etiquetando al club; las de más movimiento ganan.
//
// Cada clip ya llega ligado a su renta y a sus jugadores (trigger replay_resolver en la base):
// GET /replays/mias → { ahora: { cancha, hasta } | null, dias_nube: 7, clips: [...] }

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
const quedan = (iso, dias) => Math.max(0, Math.ceil((new Date(iso).getTime() + dias * 864e5 - Date.now()) / 864e5));
const hasta = (iso, dias) => {
  const s = new Date(new Date(iso).getTime() + dias * 864e5).toLocaleDateString(locale(), { ...TZ, weekday: 'short', day: 'numeric', month: 'short' });
  return s.replace(/\./g, '');
};

function Clip({ c, dias, onAbrir }) {
  const q = quedan(c.iniciado_en, dias);
  return (
    <button onClick={() => onAbrir(c)} className="text-left active:scale-[0.98] transition-transform">
      <div className="relative rounded-xl overflow-hidden bg-black" style={{ aspectRatio: '3/4' }}>
        <img src={c.thumb} alt="" className="w-full h-full object-cover" />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="w-11 h-11 rounded-full bg-white/90 flex items-center justify-center text-[18px] pl-0.5">▶</span>
        </span>
        <span className="absolute bottom-1.5 right-1.5 text-[11px] font-black text-white bg-black/60 rounded px-1.5 py-0.5">{dur(c.duracion_seg)}</span>
        {c.nueva && <span className="absolute top-1.5 left-1.5 text-[10px] font-black text-white bg-sp-green rounded px-1.5 py-0.5">{t('NUEVA')}</span>}
      </div>
      <p className="text-sp-gray font-bold text-[13.5px] mt-1.5">{t('Cancha {n}', { n: c.cancha })} · {fmtHora(c.iniciado_en)}</p>
      <p className={`text-[12px] font-semibold ${q <= 2 ? 'text-[#b45309]' : 'text-gray-400'}`}>
        {q <= 0 ? t('Se borra hoy') : q === 1 ? t('⏳ Se borra mañana') : t('Se borra en {n} días', { n: q })}
      </p>
    </button>
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
  const [viendo, setViendo] = useState(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { apiFetch('/replays/mias').then(d => { if (d.ok) setData(d.data); }); }, []);

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

  return (
    <div className="pb-24">
      <div className="bg-sp-green px-5 pt-5 pb-4">
        <button onClick={() => navigate('/home')} className="text-white/80 text-sm mb-1">‹ {t('Inicio')}</button>
        <h1 className="text-white font-black text-2xl">🎥 {t('Mis jugadas')}</h1>
        <p className="text-white/85 text-[13px] mt-1">{t('Las repeticiones de tus partidos, grabadas por las cámaras del club.')}</p>
      </div>

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

        {clips.length > 0 && data?.concurso && (
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
              {g.clips.map(c => <Clip key={c.id} c={c} dias={dias} onAbrir={setViendo} />)}
            </div>
          </div>
        ))}
      </div>

      {/* El reproductor rueda si el teléfono es chico y respeta el área segura de abajo (iPhone). */}
      {viendo && (
        <div className="fixed inset-0 z-[70] bg-black flex flex-col overflow-y-auto overscroll-contain" onClick={() => setViendo(null)}
             style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <div className="flex items-center justify-between px-4 pt-4 pb-2 text-white">
            <div>
              <p className="font-black text-[16px]">{t('Cancha {n}', { n: viendo.cancha })}</p>
              <p className="text-white/60 text-[12.5px]">{fmtDia(viendo.iniciado_en)} · {fmtHora(viendo.iniciado_en)}</p>
            </div>
            <button className="text-white/80 text-[26px] leading-none px-2">✕</button>
          </div>
          <div className="flex-1 min-h-0 flex items-center justify-center" onClick={e => e.stopPropagation()}>
            <video src={viendo.url} poster={viendo.thumb} controls playsInline className="max-h-full max-w-full" />
          </div>
          <div className="px-4 pb-8 pt-3 flex flex-col gap-2" onClick={e => e.stopPropagation()}>
            <p className="text-amber-300 text-[13px] font-bold text-center">⏳ {t('Disponible hasta el {fecha} · descárgala para no perderla', { fecha: hasta(viendo.iniciado_en, dias) })}</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => descargar(viendo)} className="py-3.5 rounded-xl bg-white text-sp-gray font-black text-[15px]">⬇ {t('Descargar')}</button>
              <button onClick={() => compartir(viendo)} className="py-3.5 rounded-xl bg-sp-green text-white font-black text-[15px]">↗ {t('Compartir')}</button>
            </div>
            {data?.concurso && <p className="text-white/55 text-[12px] text-center">{esSemana ? t('Etiqueta a @sierra.padel y entra a la Jugada de la semana') : t('Etiqueta a @sierra.padel y entra a la Jugada de la quincena')} 🏆</p>}
          </div>
        </div>
      )}
    </div>
  );
}
