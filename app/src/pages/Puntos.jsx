import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import Isotipo from '../components/Isotipo';

// Estilo por nivel víbora (bolsa única): color + emoji.
const NIVEL_STYLE = {
  1: { color: '#a8b3bf', emoji: '🪱' },     // Lombriz
  2: { color: '#7bbf1a', emoji: '🐍' },     // Víbora
  3: { color: '#e0a91f', emoji: '🐍🔥' },   // Cobra
  4: { color: '#b06cff', emoji: '👑🐍' },   // Mamba
};
const fmtMoney = n => '$' + Math.round(Number(n) || 0).toLocaleString('es-MX');
// Regalo tangible por día que juega, según nivel (Fase 2 al cobrar renta).
const TANGIBLE_NIVEL = { 2: 'Agua 500 ml gratis', 3: 'Agua de 1 L gratis', 4: 'Overgrip SP gratis' };

// ── Badge SVG placeholder para cada nivel (orden 1-4) ─────────────────────────
function NivelBadge({ nivel, size = 56 }) {
  if (!nivel) return null;

  // Si el nivel tiene un badge_svg personalizado lo renderizamos directamente
  if (nivel.badge_svg) {
    return (
      <div
        style={{ width: size, height: size }}
        dangerouslySetInnerHTML={{ __html: nivel.badge_svg }}
      />
    );
  }

  // Placeholders geometricos por orden
  const color = nivel.color || '#96C800';
  const orden = nivel.orden || 1;

  const shapes = {
    1: ( // Circulo simple
      <svg width={size} height={size} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="28" cy="28" r="24" stroke={color} strokeWidth="3" fill="none"/>
        <circle cx="28" cy="28" r="16" fill={color} fillOpacity="0.15"/>
        <text x="28" y="33" textAnchor="middle" fontSize="14" fontWeight="900" fill={color}>1</text>
      </svg>
    ),
    2: ( // Escudo / pentagon
      <svg width={size} height={size} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M28 6 L48 16 L48 32 C48 42 38 50 28 52 C18 50 8 42 8 32 L8 16 Z"
          stroke={color} strokeWidth="3" fill={color} fillOpacity="0.12"/>
        <text x="28" y="33" textAnchor="middle" fontSize="14" fontWeight="900" fill={color}>2</text>
      </svg>
    ),
    3: ( // Estrella de 6 puntas
      <svg width={size} height={size} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
        <polygon points="28,4 33,18 47,18 36,27 40,41 28,33 16,41 20,27 9,18 23,18"
          stroke={color} strokeWidth="2.5" fill={color} fillOpacity="0.15" strokeLinejoin="round"/>
        <text x="28" y="33" textAnchor="middle" fontSize="14" fontWeight="900" fill={color}>3</text>
      </svg>
    ),
    4: ( // Diamante / rombo doble
      <svg width={size} height={size} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
        <polygon points="28,4 50,28 28,52 6,28" stroke={color} strokeWidth="3"
          fill={color} fillOpacity="0.15" strokeLinejoin="round"/>
        <polygon points="28,12 44,28 28,44 12,28" stroke={color} strokeWidth="1.5"
          fill={color} fillOpacity="0.1" strokeLinejoin="round"/>
        <text x="28" y="33" textAnchor="middle" fontSize="12" fontWeight="900" fill={color}>4</text>
      </svg>
    ),
  };

  return shapes[orden] || shapes[1];
}

// ── Countdown hook ─────────────────────────────────────────────────────────────
function useCountdown(expiresAt) {
  const [segs, setSegs] = useState(0);
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => setSegs(Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  const mm = String(Math.floor(segs / 60)).padStart(2, '0');
  const ss = String(segs % 60).padStart(2, '0');
  return { segs, label: `${mm}:${ss}` };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getNivelActual(niveles, nivelPC = 0) {
  for (let i = niveles.length - 1; i >= 0; i--) {
    if (nivelPC >= niveles[i].min_pc) return { ...niveles[i], index: i };
  }
  return { ...niveles[0], index: 0 };
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function Puntos() {
  const { user } = useAuth();
  const { apiFetch } = useApi();
  const location = useLocation();

  const [niveles, setNiveles]   = useState([]);
  const [saldo, setSaldo]       = useState(null);
  const [miNivel, setMiNivel]   = useState(null);   // bolsa única + nivel víbora (/loyalty/mi-nivel)
  const [historial, setHistorial] = useState([]);
  const [tab, setTab]           = useState(() => {
    const qTab = new URLSearchParams(location.search).get('tab');     // viene del push (/puntos?tab=promos)
    const t = qTab || location.state?.tab || 'beneficios';
    return ['beneficios', 'promos', 'historial'].includes(t) ? t : 'beneficios';
  });
  // Promos reclamables (motor de beneficios)
  const [promosDisp, setPromosDisp] = useState([]);
  const [promosMias, setPromosMias] = useState([]);
  const [promoMsg, setPromoMsg]     = useState(null);
  const [loadingPromo, setLoadingPromo] = useState('');

  // Canje flow
  const [canjeModal, setCanjeModal] = useState(null);  // { tipo }
  const [canjeActivo, setCanjeActivo] = useState(null); // { codigo, descripcion, expires_at, puntos_usados }
  const [loadingCanje, setLoadingCanje] = useState(false);
  const [canjeError, setCanjeError] = useState('');

  const { segs, label: countdown } = useCountdown(canjeActivo?.expires_at);

  const cargarDatos = useCallback(async () => {
    const [nivelesRes, me, hist, mn] = await Promise.all([
      apiFetch('/loyalty/niveles'),
      apiFetch('/auth/me'),
      apiFetch(`/loyalty/clientes/${user?.id}/historial`),
      apiFetch('/loyalty/mi-nivel'),
    ]);
    if (nivelesRes.ok && nivelesRes.data?.length) setNiveles(nivelesRes.data);
    if (me.ok)   setSaldo(me.data);
    if (hist.ok) setHistorial(hist.data);
    if (mn.ok)   setMiNivel(mn.data);
  }, [user?.id]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  // Promos reclamables: las que el cliente puede reclamar + las que ya reclamó.
  const cargarPromos = useCallback(async () => {
    const [disp, mias] = await Promise.all([
      apiFetch('/beneficios/app/disponibles'),
      apiFetch('/beneficios/app/mias'),
    ]);
    if (disp.ok) setPromosDisp(disp.data || []);
    if (mias.ok) setPromosMias(mias.data || []);
  }, []);

  useEffect(() => { cargarPromos(); }, [cargarPromos]);

  async function reclamarPromo(id) {
    setLoadingPromo(id);
    setPromoMsg(null);
    const data = await apiFetch(`/beneficios/app/reclamar/${id}`, { method: 'POST' });
    setLoadingPromo('');
    if (data.ok) {
      setPromoMsg({ ok: true, text: '¡Promo reclamada! Se aplicará sola en la caja cuando el cajero te identifique.' });
      await cargarPromos();
    } else {
      setPromoMsg({ ok: false, text: data.error || 'No se pudo reclamar' });
    }
  }

  // Si el codigo expiro, limpiar
  useEffect(() => {
    if (canjeActivo && segs === 0) setCanjeActivo(null);
  }, [segs, canjeActivo]);

  // Si aun no cargaron los niveles, mostramos loading minimo
  if (niveles.length === 0) {
    return (
      <div className="page safe-bottom">
        <div className="bg-sp-gray px-5 pt-[env(safe-area-inset-top)] pb-4">
          <p className="text-white font-black text-lg pt-3">Mis Puntos</p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-400 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  const nivel     = getNivelActual(niveles, saldo?.nivel_pc || 0);
  const nextNivel = niveles[nivel.index + 1] || null;
  const progreso  = nextNivel
    ? Math.min(100, Math.round(((saldo?.nivel_pc - nivel.min_pc) / (nextNivel.min_pc - nivel.min_pc)) * 100))
    : 100;

  const pc = saldo?.puntos_cancha      ?? 0;
  const pr = saldo?.puntos_restaurante ?? 0;

  async function generarCodigo(tipo) {
    setLoadingCanje(true);
    setCanjeError('');
    const data = await apiFetch('/loyalty/canje/generar', {
      method: 'POST',
      body: JSON.stringify({ tipo }),
    });
    setLoadingCanje(false);
    if (data.ok) {
      setCanjeActivo(data.data);
      setCanjeModal(null);
    } else {
      setCanjeError(data.error || 'Error al generar codigo');
    }
  }

  function formatFecha(iso) {
    return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
  }

  // ── Pantalla de codigo activo ─────────────────────────────────────────────
  if (canjeActivo) {
    return (
      <div className="page safe-bottom">
        <div className="bg-sp-gray px-5 pt-[env(safe-area-inset-top)] pb-4">
          <p className="text-white font-black text-lg pt-3">Codigo de canje</p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6 py-8">
          <div className="text-center">
            <p className="text-gray-500 text-sm font-medium mb-1">Muestra este codigo al cajero</p>
            <p className="text-xs text-gray-400">{canjeActivo.descripcion}</p>
          </div>

          <div className="bg-sp-gray rounded-3xl px-10 py-8 flex flex-col items-center gap-4 w-full max-w-xs">
            <span className="text-white text-5xl font-black tracking-[0.3em]">{canjeActivo.codigo}</span>
            <div className={`text-2xl font-bold tabular-nums ${segs < 60 ? 'text-red-400' : 'text-sp-green'}`}>
              {countdown}
            </div>
            <p className="text-gray-500 text-xs">El codigo expira en {countdown}</p>
          </div>

          <div className="bg-sp-green-light rounded-2xl px-5 py-3 text-center w-full max-w-xs">
            <p className="text-sp-green-dark text-xs font-medium">
              Se descontaran <strong>{canjeActivo.puntos_usados} puntos</strong> al confirmar el cajero
            </p>
          </div>

          <button
            onClick={() => setCanjeActivo(null)}
            className="text-gray-400 text-sm underline"
          >
            Cancelar (no se descuentan puntos)
          </button>
        </div>
      </div>
    );
  }

  // ── Pantalla principal ─────────────────────────────────────────────────────
  return (
    <div className="page safe-bottom">
      <div className="bg-sp-gray px-5 pt-[env(safe-area-inset-top)] pb-4">
        <div className="pt-3">
          <p className="text-white font-black text-lg">Mis Puntos</p>
        </div>
      </div>

      {/* Bolsa única de puntos */}
      {(() => {
        const st = NIVEL_STYLE[miNivel?.nivel?.nivel] || NIVEL_STYLE[1];
        return (
          <div className="mx-4 mt-4 rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(135deg, #1C1C1C, #2A2A2A)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Mis puntos</p>
                <p className="text-4xl font-black mt-1">{miNivel?.saldo_puntos ?? 0}</p>
                <p className="text-sm mt-1" style={{ color: st.color }}>= {fmtMoney(miNivel?.valor ?? 0)} para usar en el club</p>
              </div>
              <Isotipo size={26} color={st.color} />
            </div>
            <p className="text-gray-500 text-xs mt-3">
              🎾 Cancha y 🍽️ consumo suman a la misma bolsa. El cajero los aplica al pagar cuando te identifica.
            </p>
          </div>
        );
      })()}

      {/* Nivel víbora + progreso */}
      {miNivel?.nivel && (() => {
        const st  = NIVEL_STYLE[miNivel.nivel.nivel] || NIVEL_STYLE[1];
        const sig = miNivel.siguiente;
        const act = miNivel.actividad || { visitas: 0, gasto: 0 };
        return (
          <div className="mx-4 mt-3 card flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl leading-none">{st.emoji}</span>
                <div>
                  <span className="font-black text-lg" style={{ color: st.color }}>{miNivel.nivel.nombre}</span>
                  <p className="text-gray-400 text-xs">Ganas ×{miNivel.nivel.mult} puntos en cada visita</p>
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-400">
              Últimos 30 días: <b className="text-sp-gray">{act.visitas}</b> visita{act.visitas === 1 ? '' : 's'} · <b className="text-sp-gray">{fmtMoney(act.gasto)}</b> de consumo
            </div>

            {sig ? (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500">
                  Para subir a <b style={{ color: NIVEL_STYLE[miNivel.nivel.nivel + 1]?.color || st.color }}>{sig.nombre}</b> te falta lo que llegue primero:
                </p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="bg-white rounded-lg p-2 text-center border border-gray-100">
                    <p className="text-lg font-black text-sp-gray">{sig.faltan_visitas > 0 ? sig.faltan_visitas : '✓'}</p>
                    <p className="text-[10px] text-gray-400">{sig.faltan_visitas > 0 ? 'visitas más' : 'visitas listas'}</p>
                  </div>
                  <div className="bg-white rounded-lg p-2 text-center border border-gray-100">
                    <p className="text-lg font-black text-sp-gray">{sig.faltan_gasto > 0 ? fmtMoney(sig.faltan_gasto) : '✓'}</p>
                    <p className="text-[10px] text-gray-400">{sig.faltan_gasto > 0 ? 'consumo más' : 'consumo listo'}</p>
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 mt-2">No tienes que jugar para subir: también cuenta lo que consumes 🍽️</p>
              </div>
            ) : (
              <p className="text-sm font-bold" style={{ color: st.color }}>👑 ¡Nivel máximo! Eres {miNivel.nivel.nombre}.</p>
            )}
          </div>
        );
      })()}

      {/* Tabs */}
      <div className="mx-4 mt-3 flex gap-2">
        {[['beneficios', 'Beneficios'], ['promos', 'Promos'], ['historial', 'Historial']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setTab(val)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${
              tab === val ? 'bg-sp-green text-white' : 'bg-white text-gray-500 border border-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Beneficios */}
      {tab === 'beneficios' && (
        <div className="mx-4 mt-3 flex flex-col gap-3 pb-24">
          {/* Cómo funciona */}
          <div className="card flex flex-col gap-2">
            <p className="text-sm font-bold text-sp-gray">Cómo ganas 🐍</p>
            <p className="text-xs text-gray-500">
              Ganas <b>1 punto por cada $20</b> en cancha, tienda y consumo (el alcohol no acumula). Cada punto vale <b>$0.50</b> — el <b>2.5%</b> de todo lo que gastas, en una sola bolsa.
            </p>
            <p className="text-xs text-gray-500">
              Entre más alto tu nivel, <b>más rápido</b> acumulas y desbloqueas un regalo por cada día que juegas.
            </p>
          </div>

          {/* Los niveles + tangibles */}
          <div className="card">
            <p className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wide">Los niveles</p>
            <div className="flex flex-col gap-2">
              {(miNivel?.niveles || []).map((n) => {
                const st = NIVEL_STYLE[n.nivel] || NIVEL_STYLE[1];
                const esActual = n.nivel === miNivel?.nivel?.nivel;
                const regalo = TANGIBLE_NIVEL[n.nivel];
                return (
                  <div key={n.nivel} className={`flex items-start gap-3 py-2 px-3 rounded-xl ${esActual ? 'bg-gray-50' : ''}`}>
                    <span className="text-2xl leading-none mt-0.5">{st.emoji}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold" style={{ color: st.color }}>{n.nombre}</p>
                        <span className="text-[10px] text-gray-400">gana ×{n.mult}</span>
                        {esActual && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: st.color }}>Actual</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        {n.nivel === 1 ? 'Desde tu primer punto' : `${n.min_visitas} visitas o ${fmtMoney(n.min_gasto)} en 30 días`}
                      </p>
                      {regalo && <p className="text-xs mt-0.5" style={{ color: st.color }}>🎁 {regalo} por día que juegas</p>}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-gray-400 mt-3">
              Tu nivel se mide por tus últimos 30 días. Si dejas de venir bajas de nivel, así que mantente activo 🎾
            </p>
          </div>
        </div>
      )}

      {/* Tab: Promos reclamables */}
      {tab === 'promos' && (
        <div className="mx-4 mt-3 flex flex-col gap-3 pb-24">
          {promoMsg && (
            <p className={`text-sm text-center font-medium ${promoMsg.ok ? 'text-sp-green' : 'text-red-500'}`}>{promoMsg.text}</p>
          )}

          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Promos para ti</p>
          {promosDisp.length === 0 && (
            <div className="card text-center text-gray-400 text-sm py-6">No hay promos disponibles ahora</div>
          )}
          {promosDisp.map(p => (
            <div key={p.id} className="card flex items-center justify-between gap-3">
              <div className="flex-1">
                <p className="text-sm font-bold text-sp-gray">{p.nombre}</p>
                <p className="text-xs text-sp-green font-semibold">{p.valor}</p>
                {(p.monto_minimo || p.valido_hasta) && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {p.monto_minimo ? `Mínimo $${p.monto_minimo}` : ''}
                    {p.monto_minimo && p.valido_hasta ? ' · ' : ''}
                    {p.valido_hasta ? `Hasta ${String(p.valido_hasta).slice(0, 10)}` : ''}
                  </p>
                )}
              </div>
              <button
                onClick={() => reclamarPromo(p.id)}
                disabled={loadingPromo === p.id}
                className="py-2 px-4 rounded-xl text-xs font-bold text-white active:scale-95 transition-transform disabled:opacity-50"
                style={{ background: nivel.color }}
              >
                {loadingPromo === p.id ? '...' : 'Reclamar'}
              </button>
            </div>
          ))}

          {promosMias.length > 0 && (
            <>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mt-2">Mis promos</p>
              {promosMias.map(p => (
                <div key={p.id} className="card flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-sp-gray">{p.nombre}</p>
                    <p className="text-xs text-sp-green font-semibold">{p.valor}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${p.estado === 'usada' ? 'bg-gray-100 text-gray-400' : 'bg-sp-green-light text-sp-green-dark'}`}>
                    {p.estado === 'usada' ? 'Usada' : 'Lista'}
                  </span>
                </div>
              ))}
            </>
          )}

          <p className="text-xs text-gray-400 text-center mt-2">
            Las promos que reclames se aplican solas cuando el cajero te identifica en la caja.
          </p>
        </div>
      )}

      {/* Tab: Historial */}
      {tab === 'historial' && (
        <div className="mx-4 mt-3 flex flex-col gap-2 pb-24">
          {historial.length === 0 && (
            <div className="card text-center text-gray-400 text-sm py-8">Sin movimientos aun</div>
          )}
          {/* El movimiento se nombra por su ORIGEN, no por el signo: un ajuste del club NO es
              un canje (decirle "canje" a lo que el cliente nunca gastó confunde y se ve mal). */}
          {historial.map(h => {
            const canje  = h.registrado_por === 'redencion_pos';
            const ajuste = h.registrado_por === 'ajuste_admin' || h.registrado_por === 'redencion_revert';
            const titulo = canje  ? '🎁 Puntos usados en el club'
                         : ajuste ? '⚙️ Ajuste de puntos'
                         : h.tipo === 'renta'   ? '🎾 Renta de cancha'
                         : h.tipo === 'consumo' ? '🍽️ Consumo'
                         : h.tipo;
            return (
              <div key={h.id} className="card flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-sp-gray">{titulo}</p>
                  <p className="text-xs text-gray-400">{formatFecha(h.created_at)}</p>
                </div>
                <span className={`text-lg font-black ${h.puntos < 0 ? 'text-red-400' : 'text-sp-green'}`}>
                  {h.puntos > 0 ? '+' : ''}{h.puntos}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de confirmacion de canje */}
      {canjeModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-end justify-center z-50 px-4 pb-8"
          onClick={() => setCanjeModal(null)}
        >
          <div
            className="bg-white rounded-3xl p-6 w-full max-w-xs flex flex-col gap-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center">
              <p className="text-xl font-black text-sp-gray">
                {canjeModal.tipo === 'cancha' ? '🎾 Canjear cancha' : '🍽️ Canjear restaurante'}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {canjeModal.tipo === 'cancha'
                  ? `${nivel.pc_meta} PC → ${nivel.premio_cancha}`
                  : `${nivel.pr_meta} PR → ${nivel.premio_restaurante}`}
              </p>
            </div>
            <div className="bg-sp-green-light rounded-xl px-4 py-3 text-center">
              <p className="text-sp-green-dark text-sm">
                Se generara un codigo de 6 digitos valido por <strong>5 minutos</strong>. Muestraselo al cajero para aplicar el descuento.
              </p>
            </div>
            {canjeError && <p className="text-red-500 text-sm text-center">{canjeError}</p>}
            <button
              onClick={() => generarCodigo(canjeModal.tipo)}
              disabled={loadingCanje}
              className="btn-green disabled:opacity-50"
            >
              {loadingCanje ? 'Generando...' : 'Generar codigo'}
            </button>
            <button onClick={() => setCanjeModal(null)} className="text-gray-400 text-sm text-center">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
