import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { textoContador, EVENTO_BUZON } from '../lib/buzon';
import { t } from '../i18n';

// 🔔 LA CAMPANITA (German 21-oct-2026): «un mal click y se pierde». Cada push que manda el
// club queda guardado; aquí se ve cuántos no has leído y al tocarla se abre el buzón (/avisos).
// Vuelve a preguntar al regresar a la app (visibilitychange): es justo cuando acaba de llegar
// un push que la persona descartó.
export default function Campanita({ color = 'white' }) {
  const navigate = useNavigate();
  const { apiFetch } = useApi();
  const [n, setN] = useState(0);

  useEffect(() => {
    let vivo = true;
    const cargar = () => {
      apiFetch('/avisos-cliente')
        .then(r => { if (vivo && r?.ok) setN(r.data?.no_leidos || 0); })
        .catch(() => {});
    };
    cargar();
    const alVolver = () => { if (document.visibilityState === 'visible') cargar(); };
    const alCambiar = (e) => { if (typeof e?.detail?.no_leidos === 'number') setN(e.detail.no_leidos); };
    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener(EVENTO_BUZON, alCambiar);
    return () => {
      vivo = false;
      document.removeEventListener('visibilitychange', alVolver);
      window.removeEventListener(EVENTO_BUZON, alCambiar);
    };
  }, [apiFetch]);

  const cuenta = textoContador(n);
  return (
    <button
      onClick={() => navigate('/avisos')}
      aria-label={cuenta ? t('Avisos: {n} sin leer', { n }) : t('Avisos')}
      className="relative w-10 h-10 rounded-full bg-black/20 flex items-center justify-center active:scale-95 transition-transform"
    >
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
      </svg>
      {cuenta && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[19px] h-[19px] px-1 rounded-full bg-red-500 text-white text-[11px] font-black leading-[19px] text-center ring-2 ring-sp-green">
          {cuenta}
        </span>
      )}
    </button>
  );
}
