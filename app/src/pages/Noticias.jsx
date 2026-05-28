import { useState, useEffect, useRef } from 'react';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'https://sierra-padel-backend-production-a55f.up.railway.app';

// Formatea fecha relativa (hoy, ayer, hace X dias...)
function fmtRelativa(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'Ahora mismo';
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
  if (diff < 172800) return 'Ayer';
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

const TIPO_ICON = { imagen: '🖼', gif: '🎞', video: '🎬', texto: '📝', link: '🔗' };

export default function Noticias() {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeVideo, setActiveVideo] = useState(null);
  const videoRef = useRef(null);

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
    <div className="min-h-screen pb-20" style={{ background: '#080810' }}>
      {/* HEADER */}
      <div className="sticky top-0 z-10 px-4 pt-12 pb-3" style={{ background: 'rgba(8,8,16,.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #1e1e2e' }}>
        <div className="flex items-center justify-between">
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#96C800', textTransform: 'uppercase', marginBottom: 2 }}>Sierra Padel</p>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#eeeef5', letterSpacing: '-0.01em' }}>Noticias</h1>
          </div>
          <button onClick={fetchPromos} style={{ background: 'none', border: '1px solid #27273a', borderRadius: 8, padding: '7px 13px', color: '#9090a8', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Actualizar
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="px-4 pt-4">
        {loading && (
          <div className="flex flex-col gap-3">
            {[1,2,3].map(i => (
              <div key={i} style={{ background: '#0e0e1a', borderRadius: 14, overflow: 'hidden', border: '1px solid #1e1e2e' }}>
                <div style={{ height: 200, background: '#131320', animation: 'pulse 1.5s ease-in-out infinite' }} />
                <div className="p-4">
                  <div style={{ height: 10, background: '#1e1e2e', borderRadius: 5, width: '40%', marginBottom: 8 }} />
                  <div style={{ height: 16, background: '#1e1e2e', borderRadius: 5, width: '80%', marginBottom: 6 }} />
                  <div style={{ height: 12, background: '#1e1e2e', borderRadius: 5, width: '60%' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && !loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📡</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#eeeef5', marginBottom: 6 }}>Sin conexion</div>
            <div style={{ fontSize: 12, color: '#5e5e78', marginBottom: 20 }}>{error}</div>
            <button onClick={fetchPromos} style={{ background: '#96C800', color: '#0a1a00', border: 'none', padding: '10px 24px', borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && promos.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#eeeef5', marginBottom: 6 }}>Sin noticias por ahora</div>
            <div style={{ fontSize: 12, color: '#5e5e78' }}>Vuelve pronto para ver las ultimas novedades del club.</div>
          </div>
        )}

        {!loading && promos.length > 0 && (
          <div className="flex flex-col gap-4">
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
    <div style={{ background: '#0e0e1a', borderRadius: 14, overflow: 'hidden', border: '1px solid #1e1e2e' }}>
      {/* MEDIA */}
      {p.tipo === 'imagen' && p.media_url && (
        <img src={p.media_url} alt={p.titulo} style={{ width: '100%', maxHeight: 280, objectFit: 'cover', display: 'block' }} loading="lazy" />
      )}
      {p.tipo === 'gif' && p.media_url && (
        <img src={p.media_url} alt={p.titulo} style={{ width: '100%', maxHeight: 280, objectFit: 'cover', display: 'block' }} />
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
              style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050508', cursor: 'pointer', position: 'relative' }}
              onClick={handleVideoToggle}
            >
              {p.thumbnail_url
                ? <img src={p.thumbnail_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: .7 }} />
                : null}
              <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'rgba(150,200,0,.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#0a1a00"><path d="M5 3l14 9-14 9V3z" /></svg>
              </div>
            </div>
          )}
        </div>
      )}

      {/* BODY */}
      <div style={{ padding: '14px 16px' }}>
        {/* Meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: '#96C800', textTransform: 'uppercase' }}>
            {TIPO_ICON[p.tipo] || '📄'} Sierra Padel
          </span>
          <span style={{ color: '#2a2a3a' }}>·</span>
          <span style={{ fontSize: 10, color: '#5e5e78', fontFamily: 'monospace' }}>{fmtRelativa(p.fecha_inicio)}</span>
        </div>

        {/* Titulo */}
        <h2 style={{ fontSize: 15, fontWeight: 800, color: '#eeeef5', lineHeight: 1.3, marginBottom: p.descripcion ? 6 : 0 }}>
          {p.titulo}
        </h2>

        {/* Descripcion */}
        {p.descripcion && (
          <p style={{ fontSize: 13, color: '#9090a8', lineHeight: 1.5, marginBottom: p.link_externo ? 12 : 0 }}>
            {p.descripcion}
          </p>
        )}

        {/* Texto solo */}
        {p.tipo === 'texto' && !p.descripcion && (
          <p style={{ fontSize: 14, color: '#9090a8', lineHeight: 1.5 }}>Sierra Padel</p>
        )}

        {/* Link externo */}
        {p.link_externo && (
          <a
            href={p.link_externo}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#131320', border: '1px solid #27273a', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700, color: '#96C800', textDecoration: 'none', marginTop: 10 }}
          >
            Ver mas →
          </a>
        )}
      </div>
    </div>
  );
}
