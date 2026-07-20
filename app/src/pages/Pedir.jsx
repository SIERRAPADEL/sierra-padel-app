import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BACKEND, UBICACIONES } from '../lib/constants';

const CAT_LABEL = {
  bebidas:    'Bebidas',
  snacks:     'Snacks',
  accesorios: 'Accesorios',
};

export default function Pedir() {
  const { user } = useAuth();
  const [menu, setMenu]           = useState({});
  const [loading, setLoading]     = useState(true);
  const [carrito, setCarrito]     = useState({});  // { itemId: cantidad }
  const [ubicacion, setUbicacion] = useState('');
  const [notas, setNotas]         = useState('');
  const [enviando, setEnviando]   = useState(false);
  const [errorEnvio, setErrorEnvio] = useState('');
  const [pedidoOk, setPedidoOk]   = useState(null); // pedido enviado
  const [catActiva, setCatActiva] = useState('');
  const [habitos, setHabitos]     = useState(null); // { frecuentes, ultimo, total_pedidos }
  const [seguim, setSeguim]       = useState(null); // estado EN VIVO del pedido enviado

  useEffect(() => { fetchMenu(); fetchHabitos(); }, []);

  // Seguimiento en vivo del pedido enviado: sondea /mis-pedidos hasta que el encargado
  // lo acepte (preparando) / marque listo/entregado, o lo rechace (cancelado + motivo).
  useEffect(() => {
    if (!pedidoOk?.id) return;
    const token = localStorage.getItem('sp_token');
    if (!token) return; // invitado sin sesión: no hay a quién seguir
    let vivo = true;
    const TERMINALES = ['entregado', 'cancelado'];
    async function tick() {
      try {
        const r = await fetch(`${BACKEND}/api/pedidos/mis-pedidos`, { headers: { Authorization: `Bearer ${token}` } });
        const d = await r.json();
        if (!vivo || !d.ok) return;
        const p = (d.data || []).find(x => x.id === pedidoOk.id);
        if (p) {
          setSeguim(p);
          if (TERMINALES.includes(p.estado)) clearInterval(iv);
        }
      } catch { }
    }
    tick();
    const iv = setInterval(tick, 5000);
    return () => { vivo = false; clearInterval(iv); };
  }, [pedidoOk?.id]);

  // Presentación del estado del pedido para el cliente (amigable, texto grande).
  function vistaEstado(estado, motivo) {
    switch (estado) {
      case 'preparando': return { icon: '👨‍🍳', tint: '#7aaa00', label: 'Pedido aceptado', titulo: '¡Tu pedido fue aceptado!', sub: 'Lo estan preparando.' };
      case 'listo':      return { icon: '🛎️', tint: '#7aaa00', label: 'Pedido listo', titulo: '¡Tu pedido esta listo!', sub: 'En un momento te lo llevan.' };
      case 'entregado':  return { icon: '✅', tint: '#7aaa00', label: 'Entregado', titulo: '¡Entregado!', sub: '¡Buen provecho!' };
      case 'cancelado':  return { icon: '❌', tint: '#e5484d', label: 'Pedido rechazado', titulo: 'Tu pedido fue rechazado', sub: motivo || 'El encargado no pudo tomar tu pedido. Acercate al bar si tienes dudas.' };
      default:           return { icon: '⏳', tint: '#b58a00', label: 'Pedido enviado', titulo: 'Pedido enviado', sub: 'Esperando que el encargado lo confirme…' };
    }
  }

  async function fetchMenu() {
    setLoading(true);
    try {
      const r = await fetch(`${BACKEND}/api/menu`);
      const d = await r.json();
      if (d.ok) {
        setMenu(d.data);
        // Activar primera categoría
        const cats = Object.keys(d.data);
        if (cats.length > 0) setCatActiva(cats[0]);
      }
    } catch { }
    setLoading(false);
  }

  // "Lo de siempre": hábitos del cliente (solo si hay sesión)
  async function fetchHabitos() {
    const token = localStorage.getItem('sp_token');
    if (!token) return;
    try {
      const r = await fetch(`${BACKEND}/api/pedidos/mis-habitos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (d.ok) setHabitos(d.data);
    } catch { }
  }

  // Índice plano del menú por id (para cruzar hábitos con precio/disponibilidad vivos)
  function menuPorId() {
    const idx = {};
    for (const items of Object.values(menu)) {
      for (const it of items) idx[it.id] = it;
    }
    return idx;
  }

  // Productos frecuentes que SIGUEN en el menú y disponibles
  function frecuentesVivos() {
    if (!habitos?.frecuentes?.length) return [];
    const idx = menuPorId();
    return habitos.frecuentes
      .map(f => idx[f.item_id])
      .filter(m => m && m.disponible);
  }

  // Repetir el último pedido: agrega al carrito lo que siga disponible
  function repetirUltimo() {
    const items = habitos?.ultimo?.items;
    if (!items?.length) return;
    const idx = menuPorId();
    setCarrito(prev => {
      const next = { ...prev };
      for (const it of items) {
        const m = idx[it.item_id || it.id];
        if (m && m.disponible) next[m.id] = (next[m.id] || 0) + (Number(it.cantidad) || 1);
      }
      return next;
    });
  }

  // Cantidad de items del último pedido que aún se pueden repetir
  function ultimoDisponible() {
    const items = habitos?.ultimo?.items;
    if (!items?.length) return 0;
    const idx = menuPorId();
    return items.filter(it => { const m = idx[it.item_id || it.id]; return m && m.disponible; }).length;
  }

  function cambiarCantidad(itemId, delta) {
    setCarrito(prev => {
      const actual = prev[itemId] || 0;
      const nuevo  = Math.max(0, actual + delta);
      if (nuevo === 0) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: nuevo };
    });
  }

  function totalCarrito() {
    let total = 0;
    for (const [cat, items] of Object.entries(menu)) {
      for (const item of items) {
        if (carrito[item.id]) total += item.precio * carrito[item.id];
      }
    }
    return total;
  }

  function itemsCarrito() {
    const lista = [];
    for (const items of Object.values(menu)) {
      for (const item of items) {
        if (carrito[item.id]) {
          lista.push({
            item_id:  item.id,
            nombre:   item.nombre,
            cantidad: carrito[item.id],
            precio:   item.precio,
          });
        }
      }
    }
    return lista;
  }

  function numItems() {
    return Object.values(carrito).reduce((s, n) => s + n, 0);
  }

  async function enviarPedido() {
    if (!ubicacion) return;
    const items = itemsCarrito();
    if (items.length === 0) return;

    setEnviando(true);
    setErrorEnvio('');
    try {
      const token = localStorage.getItem('sp_token');

      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const r = await fetch(`${BACKEND}/api/pedidos`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          items,
          ubicacion,
          notas: notas || undefined,
          cliente_nombre: user?.nombre || 'Cliente',
          cliente_tel:    user?.telefono || undefined,
        }),
      });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error);
      setSeguim(null);
      setPedidoOk(d.data);
      setCarrito({});
      setNotas('');
    } catch (e) {
      setErrorEnvio(e.message || 'Error al enviar pedido. Intenta de nuevo.');
    }
    setEnviando(false);
  }

  // ── PANTALLA: PEDIDO ENVIADO + SEGUIMIENTO EN VIVO ────────────────────────
  if (pedidoOk) {
    const estActual = seguim?.estado || 'pendiente';
    const v = vistaEstado(estActual, seguim?.motivo_rechazo);
    const rechazado = estActual === 'cancelado';
    const enCurso   = !['entregado', 'cancelado'].includes(estActual);
    // Pasos visuales del avance (no aplica si fue rechazado)
    const PASOS = [
      { k: 'pendiente',  t: 'Enviado' },
      { k: 'preparando', t: 'Aceptado' },
      { k: 'listo',      t: 'Listo' },
      { k: 'entregado',  t: 'Entregado' },
    ];
    const idxActual = PASOS.findIndex(p => p.k === estActual);
    return (
      <div className="page safe-bottom">
        <div style={{ padding: '56px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>{v.icon}</div>
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: v.tint }}>{v.label}</p>
          <h2 className="text-sp-gray font-black text-2xl mb-3">
            {v.titulo}
          </h2>
          <p className="text-[15px] leading-relaxed mb-1.5" style={{ color: rechazado ? '#e5484d' : '#575757' }}>
            {v.sub}
          </p>
          <p className="text-gray-500 text-sm mb-6">
            Ubicacion: <strong className="text-sp-gray">{pedidoOk.ubicacion}</strong>
          </p>

          {/* Barra de avance (oculta si fue rechazado) */}
          {!rechazado && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 26 }}>
              {PASOS.map((p, i) => {
                const hecho = i <= idxActual;
                return (
                  <div key={p.k} style={{ display: 'flex', alignItems: 'center', flex: i < PASOS.length - 1 ? 1 : '0 0 auto' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 14, height: 14, borderRadius: 99, background: hecho ? '#96C800' : '#e5e7eb', flex: '0 0 auto' }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: hecho ? '#7aaa00' : '#9ca3af', whiteSpace: 'nowrap' }}>{p.t}</span>
                    </div>
                    {i < PASOS.length - 1 && (
                      <div style={{ flex: 1, height: 2, background: i < idxActual ? '#96C800' : '#e5e7eb', margin: '0 4px', marginBottom: 16 }} />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {enCurso && (
            <p className="text-gray-400 text-[13px] mb-5">Actualizando en vivo…</p>
          )}

          <div className="card text-left mb-6" style={{ opacity: rechazado ? 0.6 : 1 }}>
            {pedidoOk.items.map((it, i) => (
              <div key={i} className={`flex justify-between py-1.5 ${i < pedidoOk.items.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <span className="text-sp-gray text-[15px]"><span className="text-sp-green-dark font-black">{it.cantidad}x</span> {it.nombre}</span>
                <span className="text-gray-500 text-[15px]">${(it.precio * it.cantidad).toFixed(0)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-3 font-black text-sp-green-dark text-base">
              <span>Total</span>
              <span>${parseFloat(pedidoOk.total).toFixed(0)}</span>
            </div>
          </div>
          <button
            onClick={() => { setSeguim(null); setPedidoOk(null); }}
            className={`w-full py-3.5 rounded-xl font-black text-[15px] ${
              rechazado ? 'bg-sp-green text-white' : 'bg-white border border-gray-200 text-sp-gray'
            }`}
          >
            {rechazado ? 'Intentar de nuevo' : 'Hacer otro pedido'}
          </button>
        </div>
      </div>
    );
  }

  const cats = Object.keys(menu);
  const itemsActivos = (menu[catActiva] || []).filter(i => i.disponible);
  const frecVivos = frecuentesVivos();
  const ultDisp   = ultimoDisponible();

  return (
    <div className="page" style={{ paddingBottom: numItems() > 0 ? 190 : 80 }}>

      {/* HEADER */}
      <div className="sticky top-0 z-10 bg-sp-green px-4 pt-[env(safe-area-inset-top)] pb-3">
        <div className="flex items-center justify-between pt-3 mb-3">
          <p className="text-white font-black text-lg">Pedir al bar</p>
          {numItems() > 0 && (
            <div className="bg-black/20 rounded-full px-3.5 py-1.5 text-white text-[13px] font-black">
              {numItems()} items · ${totalCarrito().toFixed(0)}
            </div>
          )}
        </div>

        {/* Ubicacion */}
        <select
          value={ubicacion}
          onChange={e => setUbicacion(e.target.value)}
          className="w-full rounded-xl px-3.5 py-3 text-[15px] font-bold mb-2.5 outline-none"
          style={{ background: 'white', border: 'none', color: ubicacion ? '#575757' : '#9ca3af' }}
        >
          <option value="">¿Donde estas? (selecciona tu ubicacion)</option>
          {UBICACIONES.map(u => <option key={u} value={u}>{u}</option>)}
        </select>

        {/* Categorías */}
        {!loading && cats.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-0.5">
            {cats.map(cat => (
              <button
                key={cat}
                onClick={() => setCatActiva(cat)}
                className={`px-4 py-2 rounded-full text-[15px] font-bold whitespace-nowrap flex-shrink-0 transition-colors ${
                  catActiva === cat ? 'bg-white text-sp-green-dark' : 'bg-black/20 text-white'
                }`}
              >
                {CAT_LABEL[cat] || cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* CONTENIDO */}
      <div className="px-4 pt-4">

        {/* ⭐ LO DE SIEMPRE — personalización por hábitos del cliente */}
        {!loading && (ultDisp > 0 || frecVivos.length > 0) && (
          <div className="card mb-4" style={{ borderColor: '#d5e8a8' }}>
            <div className="flex items-center gap-2 mb-3">
              <span style={{ fontSize: 22 }}>⭐</span>
              <h2 className="text-sp-gray font-black text-lg">Lo de siempre</h2>
            </div>

            {ultDisp > 0 && (
              <button
                onClick={repetirUltimo}
                className="w-full flex items-center justify-between gap-2.5 px-4 py-3.5 rounded-xl bg-sp-green text-white font-black text-base active:scale-[0.98] transition-transform"
                style={{ marginBottom: frecVivos.length > 0 ? 14 : 0 }}
              >
                <span>🔁 Repetir mi último pedido</span>
                <span className="text-[13px] font-bold opacity-90">{ultDisp} {ultDisp === 1 ? 'producto' : 'productos'}</span>
              </button>
            )}

            {frecVivos.length > 0 && (
              <>
                <p className="text-sp-gray text-[15px] leading-snug mb-2.5">
                  ¿Te pido tu <strong className="text-sp-green-dark">{frecVivos[0].nombre}</strong>? Toca para agregar.
                </p>
                <div className="flex flex-wrap gap-2">
                  {frecVivos.map(m => {
                    const cant = carrito[m.id] || 0;
                    return (
                      <button
                        key={m.id}
                        onClick={() => cambiarCantidad(m.id, 1)}
                        className={`flex items-center gap-2 px-3.5 py-2.5 rounded-full text-[15px] font-bold transition-colors ${
                          cant > 0 ? 'bg-sp-green text-white' : 'bg-sp-green-light text-sp-green-dark'
                        }`}
                      >
                        <span>{cant > 0 ? `${cant}× ` : '+ '}{m.nombre}</span>
                        <span className="font-black opacity-80">${m.precio}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {loading && (
          <div className="flex flex-col gap-2.5">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="card" style={{ height: 72, animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        )}

        {!loading && itemsActivos.length === 0 && (
          <div className="text-center py-14">
            <div style={{ fontSize: 36, marginBottom: 10 }}>🍽</div>
            <p className="text-gray-400 font-bold text-sm">Sin productos disponibles</p>
          </div>
        )}

        {!loading && (
          <div className="flex flex-col gap-2.5">
            {itemsActivos.map(item => {
              const cant = carrito[item.id] || 0;
              return (
                <div
                  key={item.id}
                  className="card flex items-center justify-between gap-3 py-3.5"
                  style={cant > 0 ? { borderColor: '#96C800' } : undefined}
                >
                  <div className="flex-1">
                    <p className="text-sp-gray font-bold text-base mb-0.5">{item.nombre}</p>
                    {item.descripcion && <p className="text-gray-400 text-[13px] mb-1">{item.descripcion}</p>}
                    <p className="text-sp-green-dark font-black text-base">${item.precio}</p>
                  </div>
                  {cant === 0 ? (
                    <button
                      onClick={() => cambiarCantidad(item.id, 1)}
                      className="w-10 h-10 rounded-full bg-sp-green-light text-sp-green-dark text-2xl font-black flex items-center justify-center flex-shrink-0"
                      style={{ lineHeight: 1 }}
                    >+</button>
                  ) : (
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      <button onClick={() => cambiarCantidad(item.id, -1)} className="w-9 h-9 rounded-full bg-gray-100 text-sp-gray text-xl font-black flex items-center justify-center">−</button>
                      <span className="text-sp-gray text-base font-black min-w-[20px] text-center">{cant}</span>
                      <button onClick={() => cambiarCantidad(item.id, 1)} className="w-9 h-9 rounded-full bg-sp-green text-white text-xl font-black flex items-center justify-center">+</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* BARRA INFERIOR — PEDIDO */}
      {numItems() > 0 && (
        <div
          className="fixed left-0 right-0 z-40 bg-white border-t border-gray-100 px-4 py-3"
          style={{ bottom: 'calc(64px + env(safe-area-inset-bottom))', maxWidth: 448, margin: '0 auto' }}
        >
          <textarea
            value={notas}
            onChange={e => setNotas(e.target.value)}
            placeholder="Notas especiales... (opcional)"
            rows={1}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl text-sp-gray text-sm px-3 py-2.5 mb-2.5 resize-none outline-none focus:border-sp-green"
          />
          {errorEnvio && <p className="text-red-500 text-sm font-semibold text-center mb-2">{errorEnvio}</p>}
          <button
            onClick={enviarPedido}
            disabled={enviando || !ubicacion}
            className={`w-full py-3.5 rounded-xl font-black text-[15px] flex items-center justify-center gap-2 ${
              !ubicacion ? 'bg-gray-100 text-gray-400' : 'bg-sp-green text-white'
            }`}
          >
            {enviando ? 'Enviando...' : !ubicacion ? 'Selecciona tu ubicacion primero' : `Pedir ${numItems()} items · $${totalCarrito().toFixed(0)}`}
          </button>
        </div>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );
}
