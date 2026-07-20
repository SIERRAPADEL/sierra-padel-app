import { useState, useEffect } from 'react';
import PromoExpressBanner from '../components/PromoExpressBanner';
import { BACKEND } from '../lib/constants';
import { fmtRelativa } from '../lib/format';

const TIPO_ICON = { imagen: '🖼', gif: '🎞', video: '🎬', texto: '📝', link: '🔗' };

export default function Noticias() {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeVideo, setActiveVideo] = useState(null);

  useEffect(() => {
    fetchPromos();
  }, []);

  async function fetchPromos() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${BACKEND}/api/media/activas`);
      const d = await r.json();
      if (d.ok) setPromos(d.data || []);
      else setError('No se pudieron cargar las noticias.');
    } catch {
      setError('Sin conexion. Intenta mas tarde.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page safe-bottom">
      {/* Header */}
      <div className="bg-sp-green px-5 pt-[env(safe-area-inset-top)] pb-4">
        <div className="flex items-center justify-between pt-3">
          <p className="text-white font-black text-lg">Novedades del club</p>
          <button
            onClick={fetchPromos}
            className="bg-black/20 rounded-full px-3.5 py-1.5 text-white text-[13px] font-bold active:scale-95 transition-transform"
          >
            Actualizar
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className="px-4 pt-4 flex flex-col gap-3">
        {/* Promo Express activa (aparece si hay una corriendo) */}
        <PromoExpressBanner />

        {loading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="card p-0 overflow-hidden">
                <div style={{ height: 180, background: '#e5e7eb', animation: 'pulse 1.5s ease-in-out infinite' }} />
                <div className="p-4">
                  <div style={{ height: 10, background: '#e5e7eb', borderRadius: 5, width: '40%', marginBottom: 8 }} />
                  <div style={{ height: 16, background: '#e5e7eb', borderRadius: 5, width: '80%', marginBottom: 6 }} />
                  <div style={{ height: 12, background: '#e5e7eb', borderRadius: 5, width: '60%' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-14">
            <div style={{ fontSize: 40, marginBottom: 12 }}>📡</div>
            <p className="text-sp-gray font-bold text-[15px] mb-1">Sin conexion</p>
            <p className="text-gray-400 text-sm mb-5">{error}</p>
            <button onClick={fetchPromos} className="bg-sp-green text-white font-bold text-sm px-6 py-2.5 rounded-xl">
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && promos.length === 0 && (
          <div className="text-center py-14">
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <p className="text-sp-gray font-bold text-[15px] mb-1">Sin noticias por ahora</p>
            <p className="text-gray-400 text-sm">Vuelve pronto para ver las ultimas novedades del club.</p>
          </div>
        )}

        {!loading && promos.length > 0 && (
          <div className="flex flex-col gap-3">
            {promos.map(p => <PromoCard key={p.id} promo={p} activeVideo={activeVideo} setActiveVideo={setActiveVideo} />)}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%,100%{opacity:1} 50%{opacity:.4}
        }
      `}</style>
    </div>
  );
}

function PromoCard({ promo: p, activeVideo, setActiveVideo }) {
  const isVideoActive = activeVideo === p.id;

  function handleVideoToggle() {
    setActiveVideo(isVideoActive ? null : p.id);
  }

  return (
    <div className="card p-0 overflow-hidden">
      {/* Media */}
      {(p.tipo === 'imagen' || p.tipo === 'gif') && p.media_url && (
        <img src={p.media_url} alt={p.titulo} style={{ width: '100%', maxHeight: 280, objectFit: 'cover', display: 'block' }} loading={p.tipo === 'imagen' ? 'lazy' : undefined} />
      )}
      {p.tipo === 'video' && p.media_url && (
        <div style={{ position: 'relative', background: '#000' }}>
          {isVideoActive ? (
            <video
              src={p.media_url}
              controls
              autoPlay
              playsInline
              style={{ width: '100%', maxHeight: 280, display: 'block' }}
            />
          ) : (
            <div
              style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111', cursor: 'pointer', position: 'relative' }}
              onClick={handleVideoToggle}
            >
              {p.thumbnail_url
                ? <img src={p.thumbnail_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: .7 }} />
                : null}
              <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'rgba(150,200,0,.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#0a1a00"><path d="M5 3l14 9-14 9V3z" /></svg>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cuerpo */}
      <div style={{ padding: '14px 16px' }}>
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-sp-green-dark">
            {TIPO_ICON[p.tipo] || '📄'} Sierra Padel
          </span>
          <span className="text-gray-300">·</span>
          <span className="text-xs text-gray-400">{fmtRelativa(p.fecha_inicio)}</span>
        </div>

        <h2 className="text-sp-gray font-black text-base leading-snug" style={{ marginBottom: p.descripcion ? 6 : 0 }}>
          {p.titulo}
        </h2>

        {p.descripcion && (
          <p className="text-gray-500 text-sm leading-relaxed">
            {p.descripcion}
          </p>
        )}

        {p.link_externo && (
          <a
            href={p.link_externo}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-3 bg-sp-green-light text-sp-green-dark text-[13px] font-bold px-3.5 py-2 rounded-lg"
          >
            Ver mas →
          </a>
        )}
      </div>
    </div>
  );
}
