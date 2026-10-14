import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';

// 🎥 MIS JUGADAS — las repeticiones de las cámaras del club, en NUESTRA app (German, 14-oct-2026:
// «ya va llegando el momento de implementar las repeticiones en la app, ya se termina el
// contrato»). Reemplaza a ReplayMe con los MISMOS botones de cancha.
//
// Cada clip ya llega ligado a su renta y a sus jugadores (trigger replay_resolver en la base),
// así que aquí sólo se pide «lo mío»:
//   · ahora  → si estoy jugando: mi cancha y hasta qué hora, con el botón «Guardar jugada»
//   · clips  → las jugadas de MIS rentas (las guardé yo, otro de mi cancha o el botón físico)
// GET  /replays/mias     → { ahora: { cancha, hasta } | null, clips: [...] }
// POST /replays/guardar  → { cancha }   (la PC del club corta los últimos 30 s)

const fmtHora = (iso) => new Date(iso).toLocaleTimeString('es-MX', { timeZone: 'America/Monterrey', hour: 'numeric', minute: '2-digit' });
const fmtDia = (iso) => {
  const d = new Date(iso);
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Monterrey' });
  const dia = d.toLocaleDateString('en-CA', { timeZone: 'America/Monterrey' });
  if (dia === hoy) return 'Hoy';
  const ayer = new Date(Date.now() - 864e5).toLocaleDateString('en-CA', { timeZone: 'America/Monterrey' });
  if (dia === ayer) return 'Ayer';
  const t = d.toLocaleDateString('es-MX', { timeZone: 'America/Monterrey', weekday: 'long', day: 'numeric', month: 'long' });
  return t[0].toUpperCase() + t.slice(1);
};
const dur = (s) => `0:${String(Math.round(s || 30)).padStart(2, '0')}`;

function Clip({ c, onAbrir }) {
  return (
    <button onClick={() => onAbrir(c)} className="text-left active:scale-[0.98] transition-transform">
      <div className="relative rounded-xl overflow-hidden bg-black" style={{ aspectRatio: '16/9' }}>
        <img src={c.thumb} alt="" className="w-full h-full object-cover" />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="w-11 h-11 rounded-full bg-white/90 flex items-center justify-center text-[18px] pl-0.5">▶</span>
        </span>
        <span className="absolute bottom-1.5 right-1.5 text-[11px] font-black text-white bg-black/60 rounded px-1.5 py-0.5">{dur(c.duracion_seg)}</span>
        {c.nueva && <span className="absolute top-1.5 left-1.5 text-[10px] font-black text-white bg-sp-green rounded px-1.5 py-0.5">NUEVA</span>}
      </div>
      <p className="text-sp-gray font-bold text-[13.5px] mt-1.5">Cancha {c.cancha} · {fmtHora(c.iniciado_en)}</p>
      <p className="text-gray-400 text-[12px]">{c.disparo === 'boton' ? 'Botón de la cancha' : c.yo ? 'La guardaste tú' : 'Guardada en tu cancha'}</p>
    </button>
  );
}

export default function Jugadas() {
  const navigate = useNavigate();
  const { apiFetch } = useApi();
  const [data, setData] = useState(null);
  const [viendo, setViendo] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState('');

  async function cargar() {
    const d = await apiFetch('/replays/mias');
    if (d.ok) setData(d.data);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { cargar(); }, []);

  async function guardar() {
    if (guardando || !data?.ahora) return;
    setGuardando(true); setAviso('');
    const d = await apiFetch('/replays/guardar', { method: 'POST', body: JSON.stringify({ cancha: data.ahora.cancha }) });
    setAviso(d.ok ? '✅ ¡Listo! Guardamos los últimos 30 segundos. Aparece aquí en un minuto.' : (d.error || 'No se pudo guardar. Intenta de nuevo.'));
    setGuardando(false);
  }

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
        <button onClick={() => navigate('/home')} className="text-white/80 text-sm mb-1">‹ Inicio</button>
        <h1 className="text-white font-black text-2xl">🎥 Mis jugadas</h1>
        <p className="text-white/85 text-[13px] mt-1">Las repeticiones de tus partidos, grabadas por las cámaras del club.</p>
      </div>

      <div className="px-4 mt-4 flex flex-col gap-4">
        {data?.ahora && (
          <div className="rounded-2xl p-4 text-white" style={{ background: '#111827' }}>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[12px] font-black tracking-widest text-white/70">GRABANDO TU CANCHA</span>
            </div>
            <p className="font-black text-[22px] mt-1">Cancha {data.ahora.cancha}</p>
            <p className="text-white/60 text-[13px]">Tu renta, hasta las {data.ahora.hasta}</p>
            <button onClick={guardar} disabled={guardando}
              className="w-full mt-3 py-4 rounded-xl bg-red-500 text-white font-black text-[17px] flex items-center justify-center gap-2 disabled:opacity-60">
              <span className="w-4 h-4 rounded-full bg-white" /> {guardando ? 'Guardando…' : 'Guardar jugada'}
            </button>
            <p className="text-white/55 text-[12px] mt-2 text-center">Guarda los últimos 30 segundos. También puedes apretar el botón de la cancha.</p>
            {aviso && <p className="text-[13px] font-bold mt-2 text-center">{aviso}</p>}
          </div>
        )}

        {data && !clips.length && (
          <div className="card text-center py-8">
            <p className="text-3xl">🎾</p>
            <p className="text-sp-gray font-black text-[16px] mt-1">Todavía no tienes jugadas</p>
            <p className="text-gray-400 text-[13px] mt-1 max-w-[30ch] mx-auto">Cuando juegues, aprieta el botón de tu cancha después de un buen punto y la repetición aparece aquí.</p>
          </div>
        )}

        {grupos.map(g => (
          <div key={g.dia}>
            <p className="text-sp-gray font-black text-[15px] mb-2">{g.dia}</p>
            <div className="grid grid-cols-2 gap-3">
              {g.clips.map(c => <Clip key={c.id} c={c} onAbrir={setViendo} />)}
            </div>
          </div>
        ))}
      </div>

      {viendo && (
        <div className="fixed inset-0 z-[70] bg-black flex flex-col" onClick={() => setViendo(null)}>
          <div className="flex items-center justify-between px-4 pt-4 pb-2 text-white">
            <div>
              <p className="font-black text-[16px]">Cancha {viendo.cancha}</p>
              <p className="text-white/60 text-[12.5px]">{fmtDia(viendo.iniciado_en)} · {fmtHora(viendo.iniciado_en)}</p>
            </div>
            <button className="text-white/80 text-[26px] leading-none px-2">✕</button>
          </div>
          <div className="flex-1 flex items-center" onClick={e => e.stopPropagation()}>
            <video src={viendo.url} poster={viendo.thumb} controls playsInline className="w-full" />
          </div>
          <div className="grid grid-cols-2 gap-3 px-4 pb-8 pt-3" onClick={e => e.stopPropagation()}>
            <button className="py-3.5 rounded-xl bg-white text-sp-gray font-black text-[15px]">⬇ Descargar</button>
            <button className="py-3.5 rounded-xl bg-sp-green text-white font-black text-[15px]">↗ Compartir</button>
          </div>
        </div>
      )}
    </div>
  );
}
