import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { t } from '../i18n';

// 🎟️ RIFA DEL TORNEO (German 14-oct-2026): se escanea el QR de la pantalla del club, OBLIGA a
// entrar con la cuenta de la app y sólo cuentan los jugadores inscritos.
//
// El QR trae un token que cambia cada 30 s (?t=). Lo primero es cambiarlo por un PASE de 20 min
// (?p=), ANTES de mandar a iniciar sesión: así quien tenga que registrarse no pierde su lugar
// a la mitad. Con sesión y pase, se entra. Esta ruta NO va dentro de ProtectedRoute por eso.

export default function RifaTorneo() {
  const { torneoId } = useParams();
  const { search } = useLocation();
  const navigate = useNavigate();
  const { apiFetch } = useApi();
  const { user, loading } = useAuth();
  const [fase, setFase] = useState('cargando');   // cargando | dentro | error
  const [error, setError] = useState('');
  const [yo, setYo] = useState(null);             // { nombre, total }
  const [rifa, setRifa] = useState(null);         // estado público
  const hecho = useRef(false);

  // 1) token → pase → (sesión) → entrar
  useEffect(() => {
    if (hecho.current || loading) return;   // con la sesión aún cargando, no mandar a login
    const qs = new URLSearchParams(search);
    const tk = qs.get('t'), p = qs.get('p');
    (async () => {
      if (tk) {
        hecho.current = true;
        const d = await apiFetch(`/torneos/${torneoId}/rifa/pase`, { method: 'POST', body: JSON.stringify({ t: tk }) });
        if (!d.ok) { setError(d.error || t('No se pudo leer el código.')); setFase('error'); return; }
        navigate(`/rifa/${torneoId}?p=${encodeURIComponent(d.data.pase)}`, { replace: true });
        hecho.current = false;
        return;
      }
      if (!user) {
        const destino = `/rifa/${torneoId}${p ? `?p=${encodeURIComponent(p)}` : ''}`;
        navigate(`/login?next=${encodeURIComponent(destino)}`, { replace: true });
        return;
      }
      hecho.current = true;
      const d = await apiFetch(`/torneos/${torneoId}/rifa/entrar`, { method: 'POST', body: JSON.stringify({ pase: p || '' }) });
      if (!d.ok) {
        setError(p ? (d.error || t('No se pudo entrar a la rifa.')) : t('Para entrar a la rifa, escanea el QR que está en la pantalla del club.'));
        setFase('error'); return;
      }
      setYo(d.data); setFase('dentro');
      if (p) navigate(`/rifa/${torneoId}`, { replace: true });
    })();
  }, [search, user, loading, torneoId, apiFetch, navigate]);

  // 2) ya dentro: ver cómo va la rifa (y si salió su nombre)
  useEffect(() => {
    if (fase !== 'dentro') return;
    let vivo = true;
    const leer = () => apiFetch(`/torneos/${torneoId}/rifa`).then(d => { if (vivo && d.ok) setRifa(d.data); });
    leer();
    const id = setInterval(leer, 8000);
    return () => { vivo = false; clearInterval(id); };
  }, [fase, torneoId, apiFetch]);

  // El último tiro puede traer varios nombres (un lote de vales o descuentos).
  const salioYo = yo && (rifa?.tanda || []).find(p => p.nombre === yo.nombre && p.resultado === 'pendiente');
  const gane = rifa?.ganadores?.find(g => yo && g.nombre === yo.nombre);
  const premioApp = (p) => /consumo|renta/i.test(p || '');

  return (
    <div className="page safe-bottom">
      <div className="bg-sp-green px-5 pt-[env(safe-area-inset-top)] pb-4">
        <button onClick={() => navigate('/home')} className="flex items-center gap-1 text-white/70 text-sm mb-1 -ml-1 pt-3">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {t('Inicio')}
        </button>
        <p className="text-white font-black text-lg">{t('Rifa del torneo')}</p>
        <p className="text-white/70 text-[13px] mt-0.5">{t('Sólo para jugadores inscritos')}</p>
      </div>

      <div className="px-4 py-4 flex flex-col gap-3">
        {fase === 'cargando' && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-sp-green border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {fase === 'error' && (
          <div className="card text-center py-10 px-5">
            <p className="text-3xl mb-3">🎟️</p>
            <p className="text-sp-gray font-black text-[16px]">{t('No pudiste entrar')}</p>
            <p className="text-gray-500 text-[14px] mt-2 leading-snug">{error}</p>
          </div>
        )}

        {fase === 'dentro' && yo && (
          <>
            <div className="card text-center py-8 px-5" style={salioYo || gane ? { background: 'var(--sp-green-light)' } : undefined}>
              {salioYo ? (
                <>
                  <p className="text-4xl mb-2">🙋</p>
                  <p className="text-sp-green-dark font-black text-[22px] leading-tight">{t('¡Salió tu nombre!')}</p>
                  {salioYo.premio && <p className="text-sp-gray font-bold text-[16px] mt-2">{salioYo.premio}</p>}
                  <p className="text-sp-gray text-[15px] mt-2">{t('Levanta la mano y acércate con el organizador.')}</p>
                </>
              ) : gane ? (
                <>
                  <p className="text-4xl mb-2">🏆</p>
                  <p className="text-sp-green-dark font-black text-[22px] leading-tight">{t('¡Ganaste!')}</p>
                  {gane.premio && <p className="text-sp-gray font-bold text-[16px] mt-2">{gane.premio}</p>}
                  <p className="text-sp-gray text-[14px] mt-2">{premioApp(gane.premio) ? t('Ya está en tu app: lo ves en tus promociones y la caja lo aplica sola.') : t('Recógelo con el organizador.')}</p>
                </>
              ) : (
                <>
                  <div style={{ width: 64, height: 64, borderRadius: 99, background: 'var(--sp-green-light)', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="var(--sp-green-deep)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <p className="text-sp-gray font-black text-[20px] leading-tight">{t('Ya estás en la rifa')}</p>
                  <p className="text-gray-500 text-[14px] mt-1">{yo.nombre}</p>
                </>
              )}
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <span className="text-[14px] text-gray-500">{t('Jugadores en la rifa')}</span>
                <span className="font-black text-sp-gray text-[18px]">{rifa?.total ?? yo.total}</span>
              </div>
              <p className="text-[13px] text-gray-400 mt-2 leading-snug">
                {rifa?.estado === 'abierta' || !rifa ? t('El registro sigue abierto.')
                  : rifa.estado === 'cerrada' ? t('El registro ya cerró: están sacando los nombres.')
                  : t('La rifa terminó.')}{' '}
                {t('Para ganar tienes que estar en el club cuando salga tu nombre; si no estás, sale otro.')}
              </p>
            </div>

            {rifa?.premios?.length > 0 && (
              <div className="card">
                <p className="font-black text-sp-gray text-[15px] mb-2">{t('Se rifan')}</p>
                <ul className="flex flex-col gap-1.5">
                  {rifa.premios.map((p, i) => (
                    <li key={i} className="flex justify-between gap-3 text-[14px]">
                      <span className="text-sp-gray font-semibold">{p.cantidad > 1 ? `${p.cantidad} × ` : ''}{p.nombre}</span>
                      <span className="text-gray-400 text-right whitespace-nowrap">{p.por_lote ? t('a tu app') : t('en mano')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {rifa?.ganadores?.length > 0 && (
              <div className="card">
                <p className="font-black text-sp-gray text-[15px] mb-2">{t('Ganadores')}</p>
                <ul className="flex flex-col gap-1.5">
                  {rifa.ganadores.map(g => (
                    <li key={g.orden} className="flex justify-between gap-3 text-[14px]">
                      <span className="text-sp-gray font-semibold truncate">{g.nombre}</span>
                      <span className="text-gray-400 text-right">{g.premio || ''}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
