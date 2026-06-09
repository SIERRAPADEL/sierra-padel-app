import { useEffect, useState, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────
function fmtFecha(str) {
  if (!str) return '';
  const [y, m, d] = str.slice(0, 10).split('-');
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${parseInt(d)} ${meses[parseInt(m)-1]} ${y}`;
}

function EstadoBadge({ estado }) {
  const map = {
    inscripciones:         { label: 'Inscripciones',  cls: 'bg-green-100 text-green-700' },
    draw_generado:         { label: 'Draw listo',     cls: 'bg-blue-100 text-blue-700' },
    calendario_publicado:  { label: 'Calendario',     cls: 'bg-purple-100 text-purple-600' },
    en_curso:              { label: 'En curso',       cls: 'bg-orange-100 text-orange-600' },
    finalizado:            { label: 'Finalizado',     cls: 'bg-gray-100 text-gray-500' },
  };
  const e = map[estado] || { label: estado, cls: 'bg-gray-100 text-gray-500' };
  return <span className={`text-xs font-bold px-2 py-1 rounded-lg ${e.cls}`}>{e.label}</span>;
}

function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 border-4 border-sp-green border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function BackBtn({ onClick, label = 'Atras' }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 text-white/80 text-sm mb-2 -ml-1">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {label}
    </button>
  );
}

function pairName(insc) {
  if (!insc) return 'TBD';
  const n1 = insc.jugador1?.nombre?.split(' ')[0] || '?';
  const n2 = insc.jugador2?.nombre?.split(' ')[0] || '?';
  return `${n1} / ${n2}`;
}

// ──────────────────────────────────────────────────────────
// RankingView
// ──────────────────────────────────────────────────────────
function RankingView({ torneoId, cats, apiFetch }) {
  const [catSel, setCatSel]   = useState(null);
  const [ranking, setRanking] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cats?.length && !catSel) setCatSel(cats[0].id);
  }, [cats]);

  useEffect(() => {
    if (!catSel) return;
    setLoading(true);
    setRanking(null);
    apiFetch(`/torneos/${torneoId}/categorias/${catSel}/ranking`)
      .then(d => { if (d.ok) setRanking(d.ranking); })
      .finally(() => setLoading(false));
  }, [catSel, torneoId]);

  const medals = ['🥇','🥈','🥉'];

  return (
    <div className="flex flex-col gap-3 px-4 pb-6">
      {/* Categoria pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        {(cats || []).map(c => (
          <button
            key={c.id}
            onClick={() => setCatSel(c.id)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${
              catSel === c.id
                ? 'bg-sp-green text-white'
                : 'bg-white text-sp-gray border border-gray-200'
            }`}
          >
            {c.categoria || c.nombre}
          </button>
        ))}
      </div>

      {loading && <Spinner />}

      {!loading && ranking && (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left text-xs text-gray-400 font-semibold px-4 py-2 w-8">#</th>
                <th className="text-left text-xs text-gray-400 font-semibold px-2 py-2">Pareja</th>
                <th className="text-right text-xs text-gray-400 font-semibold px-4 py-2">Pts</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((row, i) => (
                <tr key={row.inscripcion_id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3 text-center font-bold text-sp-gray">
                    {medals[i] || i + 1}
                  </td>
                  <td className="px-2 py-3 font-medium text-sp-gray">
                    <p>{row.jugador1_nombre?.split(' ')[0]} / {row.jugador2_nombre?.split(' ')[0]}</p>
                    <p className="text-xs text-gray-400">
                      {row.pj}J · {row.pg}G · {row.pp}P
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right font-black text-sp-green text-base">
                    {row.puntos ?? '-'}
                  </td>
                </tr>
              ))}
              {ranking.length === 0 && (
                <tr><td colSpan={3} className="text-center text-gray-400 text-sm py-8">Sin resultados aun</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// TorneoDetail  (resultados / partidos)
// ──────────────────────────────────────────────────────────
function TorneoDetail({ torneo, apiFetch, miTelefono }) {
  const cats = torneo.torneo_categorias || [];
  const [catSel, setCatSel] = useState(cats[0]?.id || null);
  const [subTab, setSubTab] = useState('grupos');
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!catSel) return;
    setLoading(true);
    setData(null);
    apiFetch(`/torneos/${torneo.id}/categorias/${catSel}/resultados`)
      .then(d => { if (d.ok) setData(d); })
      .finally(() => setLoading(false));
  }, [catSel, torneo.id]);

  function esMiPareja(partido) {
    if (!miTelefono) return false;
    const tel = miTelefono.replace(/[^0-9]/g, '');
    const checkInsc = (insc) => {
      if (!insc) return false;
      const t1 = (insc.jugador1?.telefono || '').replace(/[^0-9]/g, '');
      const t2 = (insc.jugador2?.telefono || '').replace(/[^0-9]/g, '');
      return t1 === tel || t2 === tel;
    };
    return checkInsc(partido.inscripcion1) || checkInsc(partido.inscripcion2);
  }

  const grupos   = data?.grupos   || [];
  const partidos = data?.partidos || [];

  return (
    <div className="flex flex-col gap-3 px-4 pb-6">
      {/* Categoria pills */}
      {cats.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {cats.map(c => (
            <button
              key={c.id}
              onClick={() => setCatSel(c.id)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${
                catSel === c.id
                  ? 'bg-sp-green text-white'
                  : 'bg-white text-sp-gray border border-gray-200'
              }`}
            >
              {c.categoria}
            </button>
          ))}
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1">
        {[['grupos','Grupos'],['partidos','Partidos']].map(([v,label]) => (
          <button
            key={v}
            onClick={() => setSubTab(v)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
              subTab === v ? 'bg-white text-sp-gray shadow-sm' : 'text-gray-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <Spinner />}

      {/* GRUPOS */}
      {!loading && subTab === 'grupos' && (
        <>
          {grupos.length === 0 && (
            <div className="card text-center py-10">
              <p className="text-gray-400 text-sm">Sin grupos publicados aun</p>
            </div>
          )}
          {grupos.map(g => (
            <div key={g.nombre} className="card p-0 overflow-hidden">
              <p className="px-4 py-2 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                {g.nombre}
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="text-left text-xs text-gray-400 px-4 py-1.5">Pareja</th>
                    <th className="text-center text-xs text-gray-400 px-2 py-1.5">PJ</th>
                    <th className="text-center text-xs text-gray-400 px-2 py-1.5">PG</th>
                    <th className="text-center text-xs text-gray-400 px-2 py-1.5">PP</th>
                    <th className="text-center text-xs text-gray-400 px-2 py-1.5">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {(g.inscripciones || []).map(ins => {
                    const esMio = (() => {
                      if (!miTelefono) return false;
                      const tel = miTelefono.replace(/[^0-9]/g, '');
                      const t1 = (ins.jugador1?.telefono || '').replace(/[^0-9]/g, '');
                      const t2 = (ins.jugador2?.telefono || '').replace(/[^0-9]/g, '');
                      return t1 === tel || t2 === tel;
                    })();
                    return (
                      <tr key={ins.id} className={`border-b border-gray-50 last:border-0 ${esMio ? 'bg-sp-green-light' : ''}`}>
                        <td className="px-4 py-2.5 font-medium text-sp-gray">
                          {esMio && <span className="mr-1">⭐</span>}
                          {pairName(ins)}
                        </td>
                        <td className="text-center px-2 py-2.5 text-gray-500">{ins.pj ?? 0}</td>
                        <td className="text-center px-2 py-2.5 text-gray-500">{ins.pg ?? 0}</td>
                        <td className="text-center px-2 py-2.5 text-gray-500">{ins.pp ?? 0}</td>
                        <td className="text-center px-2 py-2.5 font-bold text-sp-green">{ins.puntos ?? 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </>
      )}

      {/* PARTIDOS */}
      {!loading && subTab === 'partidos' && (
        <>
          {partidos.length === 0 && (
            <div className="card text-center py-10">
              <p className="text-gray-400 text-sm">Sin partidos publicados aun</p>
            </div>
          )}
          {(() => {
            const fases = {};
            partidos.forEach(p => {
              const fase = p.fase || 'Grupo';
              if (!fases[fase]) fases[fase] = [];
              fases[fase].push(p);
            });
            return Object.entries(fases).map(([fase, ps]) => (
              <div key={fase}>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 px-1">{fase}</p>
                {ps.map(p => {
                  const mio = esMiPareja(p);
                  return (
                    <div
                      key={p.id}
                      className={`card mb-2 ${mio ? 'border border-sp-green/30 bg-sp-green-light' : ''}`}
                    >
                      {mio && <p className="text-xs text-sp-green font-bold mb-1">⭐ Tu partido</p>}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 text-sm font-semibold text-sp-gray">{pairName(p.inscripcion1)}</div>
                        <div className="text-xs text-gray-400 font-bold px-2">
                          {p.resultado
                            ? <span className="text-sp-gray font-black">{p.resultado}</span>
                            : <span className="text-gray-300">vs</span>
                          }
                        </div>
                        <div className="flex-1 text-sm font-semibold text-sp-gray text-right">{pairName(p.inscripcion2)}</div>
                      </div>
                      {(p.fecha || p.hora || p.cancha) && (
                        <p className="text-xs text-gray-400 mt-1.5">
                          {[p.fecha ? fmtFecha(p.fecha) : null, p.hora, p.cancha ? `Cancha ${p.cancha}` : null]
                            .filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ));
          })()}
        </>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// InscripcionFlow
// ──────────────────────────────────────────────────────────
function InscripcionFlow({ torneo, onDone, apiFetch }) {
  const cats = (torneo.torneo_categorias || []).filter(c =>
    ['inscripciones'].includes(c.estado)
  );

  const [step, setStep]     = useState(1);
  const [catSel, setCatSel] = useState(null);

  // Pareja
  const [tel2, setTel2]         = useState('');
  const [buscando, setBuscando] = useState(false);
  const [pareja, setPareja]     = useState(null);
  const [nombre2, setNombre2]   = useState('');
  const [busError, setBusError] = useState('');

  // Confirmar
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState(false);
  const [aceptoReglamento, setAceptoReglamento] = useState(false);

  // El torneo exige aceptar reglamento solo si está configurado (versión + URL/texto).
  const reglamentoActivo = !!(torneo.reglamento_version && (torneo.reglamento_url || torneo.reglamento_texto));

  async function buscarPareja() {
    const digits = tel2.replace(/[^0-9]/g, '');
    if (digits.length < 10) { setBusError('Ingresa 10 digitos'); return; }
    setBusError('');
    setBuscando(true);
    setPareja(null);
    const d = await apiFetch(`/torneos/jugador-por-telefono?telefono=${digits}`)
      .catch(() => null);
    setBuscando(false);
    if (d?.ok && d.jugador) {
      setPareja({ nombre: d.jugador.nombre, telefono: digits, esNuevo: false });
      setNombre2(d.jugador.nombre);
    } else {
      setPareja({ nombre: '', telefono: digits, esNuevo: true });
      setNombre2('');
    }
  }

  async function handleInscribir() {
    if (!catSel || !pareja) return;
    setLoading(true);
    setError('');
    const body = {
      jugador2_telefono: pareja.telefono,
      jugador2_nombre: nombre2 || pareja.nombre,
      // El usuario autenticado es el jugador 1; acepta el reglamento por sí mismo.
      acepto_reglamento_j1: aceptoReglamento,
      acepto_reglamento_j2: false,
    };
    const d = await apiFetch(`/torneos/${torneo.id}/categorias/${catSel}/inscripciones`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    setLoading(false);
    if (d?.ok) {
      setSuccess(true);
    } else {
      setError(d?.error || 'No se pudo completar la inscripcion');
    }
  }

  const catSelObj = cats.find(c => c.id === catSel);

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 px-6 py-10 text-center">
        <div className="w-20 h-20 rounded-full bg-sp-green-light flex items-center justify-center">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#96C800" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <div>
          <p className="text-xl font-black text-sp-gray">¡Inscripcion enviada!</p>
          <p className="text-gray-500 mt-1 text-sm">{torneo.nombre}</p>
          {catSelObj && <p className="text-gray-400 text-sm">{catSelObj.categoria}</p>}
        </div>
        <div className="bg-sp-green-light rounded-2xl px-5 py-4 text-sm text-sp-green-dark font-medium w-full max-w-xs space-y-1">
          <p>📲 Tu pareja recibio una notificacion por WhatsApp.</p>
          <p>💳 Acude al club para confirmar el pago y asegurar tu lugar.</p>
        </div>
        <button className="btn-green w-full max-w-xs" onClick={onDone}>
          Ver torneos
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-8">
      {/* Stepper */}
      <div className="flex items-center gap-2 justify-center py-2">
        {[1,2,3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-colors ${
              s === step ? 'bg-sp-green text-white' :
              s < step  ? 'bg-sp-green/20 text-sp-green' : 'bg-gray-100 text-gray-400'
            }`}>{s}</div>
            {s < 3 && <div className={`w-8 h-0.5 ${s < step ? 'bg-sp-green/40' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {/* ── Step 1: Categoria ── */}
      {step === 1 && (
        <>
          <p className="text-sm font-bold text-sp-gray">Selecciona tu categoria</p>
          {cats.length === 0 && (
            <div className="card text-center py-8">
              <p className="text-3xl mb-3">🏆</p>
              <p className="text-gray-500 font-medium">Sin inscripciones abiertas</p>
              <p className="text-gray-400 text-sm mt-1">Este torneo no tiene categorias disponibles en este momento</p>
            </div>
          )}
          {cats.map(c => (
            <button
              key={c.id}
              onClick={() => setCatSel(c.id)}
              className={`card text-left transition-all ${
                catSel === c.id ? 'border-2 border-sp-green' : 'border border-gray-100'
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold text-sp-gray">{c.categoria}</p>
                </div>
                {catSel === c.id && (
                  <div className="w-6 h-6 rounded-full bg-sp-green flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          ))}
          {catSel && (
            <button className="btn-green" onClick={() => setStep(2)}>
              Continuar
            </button>
          )}
        </>
      )}

      {/* ── Step 2: Pareja ── */}
      {step === 2 && (
        <>
          <button onClick={() => { setStep(1); setPareja(null); setTel2(''); }} className="text-sm text-sp-green font-semibold self-start">← Cambiar categoria</button>
          <p className="text-sm font-bold text-sp-gray">Busca a tu pareja</p>
          <p className="text-xs text-gray-400">Ingresa el numero de WhatsApp de tu pareja (10 digitos)</p>

          <div className="card flex flex-col gap-3">
            <input
              type="tel"
              inputMode="numeric"
              placeholder="Ej. 6641234567"
              value={tel2}
              onChange={e => { setTel2(e.target.value.replace(/[^0-9]/g, '').slice(0,10)); setPareja(null); setBusError(''); }}
              className="input-field"
              maxLength={10}
            />
            {busError && <p className="text-red-500 text-xs">{busError}</p>}
            <button
              className="btn-green"
              onClick={buscarPareja}
              disabled={buscando || tel2.replace(/[^0-9]/g,'').length < 10}
            >
              {buscando ? 'Buscando…' : 'Buscar'}
            </button>
          </div>

          {pareja && !pareja.esNuevo && (
            <div className="card border border-sp-green/30 bg-sp-green-light">
              <p className="text-xs text-sp-green font-bold mb-1">✓ Jugador encontrado</p>
              <p className="font-bold text-sp-gray">{pareja.nombre}</p>
              <p className="text-xs text-gray-500">{pareja.telefono}</p>
              <div className="mt-3 bg-white/60 rounded-xl px-3 py-2">
                <p className="text-xs text-sp-green-dark font-medium">
                  🔔 Tu pareja recibira una notificacion por WhatsApp al confirmar la inscripcion.
                </p>
              </div>
            </div>
          )}

          {pareja && pareja.esNuevo && (
            <div className="card border border-yellow-200 bg-yellow-50">
              <p className="text-xs text-yellow-700 font-bold mb-2">Jugador no registrado</p>
              <p className="text-xs text-yellow-600 mb-3">Ingresa el nombre completo de tu pareja para crear su perfil.</p>
              <input
                type="text"
                placeholder="Nombre completo"
                value={nombre2}
                onChange={e => setNombre2(e.target.value)}
                className="input-field"
              />
              {nombre2.trim().length > 0 && (
                <div className="mt-2 bg-white/60 rounded-xl px-3 py-2">
                  <p className="text-xs text-yellow-700 font-medium">
                    🔔 Se enviara una notificacion de WhatsApp a ese numero.
                  </p>
                </div>
              )}
            </div>
          )}

          {pareja && (pareja.esNuevo ? nombre2.trim().length > 2 : true) && (
            <button className="btn-green" onClick={() => setStep(3)}>
              Continuar
            </button>
          )}
        </>
      )}

      {/* ── Step 3: Confirmar ── */}
      {step === 3 && (
        <>
          <button onClick={() => { setStep(2); setError(''); }} className="text-sm text-sp-green font-semibold self-start">← Cambiar pareja</button>
          <p className="text-sm font-bold text-sp-gray">Confirmar inscripcion</p>

          <div className="card space-y-3">
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Torneo</p>
              <p className="font-bold text-sp-gray mt-0.5">{torneo.nombre}</p>
              {(torneo.fecha_inicio || torneo.fecha_fin) && (
                <p className="text-xs text-gray-500">
                  {fmtFecha(torneo.fecha_inicio)}{torneo.fecha_fin ? ` – ${fmtFecha(torneo.fecha_fin)}` : ''}
                </p>
              )}
            </div>
            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Categoria</p>
              <p className="font-bold text-sp-gray mt-0.5">{catSelObj?.categoria || '—'}</p>
            </div>
            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Pareja</p>
              <p className="font-bold text-sp-gray mt-0.5">{nombre2 || pareja?.nombre}</p>
              <p className="text-xs text-gray-400">{pareja?.telefono}</p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-3">
            <p className="text-xs text-yellow-700 font-semibold">💳 Pago requerido en el club</p>
            <p className="text-xs text-yellow-600 mt-1">
              Tu inscripcion quedara pendiente hasta confirmar el pago presencialmente. Tu lugar no estara asegurado hasta completar el pago.
            </p>
          </div>

          {reglamentoActivo && (
            <label className="flex items-start gap-2 bg-white border border-gray-200 rounded-2xl px-4 py-3 cursor-pointer">
              <input
                type="checkbox"
                checked={aceptoReglamento}
                onChange={e => setAceptoReglamento(e.target.checked)}
                className="mt-0.5"
              />
              <span className="text-xs text-gray-600">
                Acepto el reglamento del torneo
                {torneo.reglamento_version ? ` (v${torneo.reglamento_version})` : ''}.{' '}
                {torneo.reglamento_url && (
                  <a href={torneo.reglamento_url} target="_blank" rel="noopener noreferrer" className="text-sp-green font-semibold underline">
                    Ver reglamento
                  </a>
                )}
              </span>
            </label>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
              <p className="text-red-600 text-sm font-medium">{error}</p>
            </div>
          )}

          <button className="btn-green" onClick={handleInscribir} disabled={loading || (reglamentoActivo && !aceptoReglamento)}>
            {loading ? 'Enviando…' : 'Confirmar inscripcion'}
          </button>
        </>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Main Torneos page
// ──────────────────────────────────────────────────────────
export default function Torneos() {
  const { apiFetch } = useApi();
  const { user }     = useAuth();

  const [mainTab, setMainTab]     = useState('calendario');
  const [torneos, setTorneos]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [view, setView]           = useState(null); // null | 'inscripcion' | 'detalle'
  const [torneoSel, setTorneoSel] = useState(null);
  const [rankTorneo, setRankTorneo] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch('/torneos')
      .then(d => { if (d.ok) setTorneos(d.torneos || d.data || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [apiFetch]);

  useEffect(() => { load(); }, [load]);

  // Torneos con resultados disponibles
  const torneoConResultados = (torneos || []).filter(t =>
    ['draw_generado','calendario_publicado','en_curso','finalizado'].includes(t.estado)
  );

  const miTelefono = user?.telefono || '';

  function goBack() { setView(null); setTorneoSel(null); }

  const headerLabel = view === 'inscripcion'
    ? (torneoSel?.nombre || 'Inscripcion')
    : view === 'detalle'
      ? (torneoSel?.nombre || 'Resultados')
      : 'Torneos';

  return (
    <div className="page safe-bottom">
      {/* Header */}
      <div className="bg-sp-green px-5 pt-[env(safe-area-inset-top)] pb-0">
        {view && <BackBtn onClick={goBack} />}
        <p className="text-white font-black text-lg pt-3 mb-3">{headerLabel}</p>
        {!view && (
          <div className="flex gap-1">
            {[['calendario','Calendario'],['ranking','Ranking']].map(([v,label]) => (
              <button
                key={v}
                onClick={() => setMainTab(v)}
                className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${
                  mainTab === v ? 'bg-white text-sp-green' : 'text-white/70'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── INSCRIPCION FLOW ── */}
      {view === 'inscripcion' && torneoSel && (
        <div className="overflow-y-auto py-4">
          <InscripcionFlow torneo={torneoSel} onDone={goBack} apiFetch={apiFetch} />
        </div>
      )}

      {/* ── DETALLE ── */}
      {view === 'detalle' && torneoSel && (
        <div className="overflow-y-auto py-4">
          <TorneoDetail torneo={torneoSel} apiFetch={apiFetch} miTelefono={miTelefono} />
        </div>
      )}

      {/* ── CALENDARIO ── */}
      {!view && mainTab === 'calendario' && (
        <div className="px-4 py-4 flex flex-col gap-3 overflow-y-auto">
          {loading && <Spinner />}
          {!loading && torneos?.length === 0 && (
            <div className="card text-center py-12">
              <p className="text-3xl mb-3">🏆</p>
              <p className="text-gray-500 font-medium">Sin torneos por ahora</p>
              <p className="text-gray-400 text-sm mt-1">Pronto habra novedades</p>
            </div>
          )}
          {!loading && (torneos || []).map(t => (
            <div key={t.id} className="card">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 pr-3">
                  <p className="font-black text-sp-gray text-base leading-tight">{t.nombre}</p>
                  {(t.fecha_inicio || t.fecha_fin) && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {fmtFecha(t.fecha_inicio)}
                      {t.fecha_fin && t.fecha_fin !== t.fecha_inicio ? ` – ${fmtFecha(t.fecha_fin)}` : ''}
                    </p>
                  )}
                </div>
                <EstadoBadge estado={t.estado} />
              </div>
              {t.descripcion && (
                <p className="text-sm text-gray-500 mb-3">{t.descripcion}</p>
              )}
              <div className="flex gap-2">
                {['draw_generado','calendario_publicado','en_curso','finalizado'].includes(t.estado) && (
                  <button
                    className="flex-1 py-2 rounded-xl text-sm font-semibold border border-sp-green text-sp-green"
                    onClick={() => { setTorneoSel(t); setView('detalle'); }}
                  >
                    Ver partidos
                  </button>
                )}
                {t.estado === 'inscripciones' && (
                  <button
                    className="flex-1 btn-green py-2 text-sm"
                    onClick={() => { setTorneoSel(t); setView('inscripcion'); }}
                  >
                    Inscribirme
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── RANKING ── */}
      {!view && mainTab === 'ranking' && (
        <div className="py-4 overflow-y-auto">
          {loading && <Spinner />}
          {!loading && torneoConResultados.length === 0 && (
            <div className="card text-center py-12 mx-4">
              <p className="text-3xl mb-3">📊</p>
              <p className="text-gray-500 font-medium">Sin datos de ranking</p>
              <p className="text-gray-400 text-sm mt-1">Los resultados apareceran aqui</p>
            </div>
          )}
          {!loading && torneoConResultados.length > 0 && (
            <>
              {torneoConResultados.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2 px-4 mb-3">
                  {torneoConResultados.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setRankTorneo(t)}
                      className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${
                        (rankTorneo || torneoConResultados[0]).id === t.id
                          ? 'bg-sp-green text-white'
                          : 'bg-white text-sp-gray border border-gray-200'
                      }`}
                    >
                      {t.nombre}
                    </button>
                  ))}
                </div>
              )}
              <RankingView
                torneoId={(rankTorneo || torneoConResultados[0]).id}
                cats={(rankTorneo || torneoConResultados[0]).torneo_categorias || []}
                apiFetch={apiFetch}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
