import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'https://sierra-padel-backend-production-a55f.up.railway.app';

const CAT_LABEL = {
  bebidas:    'Bebidas',
  snacks:     'Snacks',
  accesorios: 'Accesorios',
};

const UBICACIONES = [
  'Cancha 1', 'Cancha 2', 'Cancha 3', 'Cancha 4',
  'Cancha 5', 'Cancha 6', 'Bar / Mesa', 'Terraza', 'Recepcion',
];

export default function Pedir() {
  const { user } = useAuth();
  const [menu, setMenu]           = useState({});
  const [loading, setLoading]     = useState(true);
  const [carrito, setCarrito]     = useState({});  // { itemId: cantidad }
  const [ubicacion, setUbicacion] = useState('');
  const [notas, setNotas]         = useState('');
  const [enviando, setEnviando]   = useState(false);
  const [pedidoOk, setPedidoOk]   = useState(null); // pedido enviado
  const [catActiva, setCatActiva] = useState('');
  const [habitos, setHabitos]     = useState(null); // { frecuentes, ultimo, total_pedidos }

  useEffect(() => { fetchMenu(); fetchHabitos(); }, []);

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
      setPedidoOk(d.data);
      setCarrito({});
      setNotas('');
    } catch (e) {
      alert(e.message || 'Error al enviar pedido');
    }
    setEnviando(false);
  }

  // ── PANTALLA: PEDIDO CONFIRMADO ──────────────────────────────────────────
  if (pedidoOk) {
    return (
      <div className="min-h-screen pb-20" style={{ background: '#080810' }}>
        <div style={{ padding: '80px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#96C800', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Pedido enviado</p>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#eeeef5', marginBottom: 12 }}>
            Tu pedido esta en camino
          </h2>
          <p style={{ fontSize: 14, color: '#9090a8', marginBottom: 6 }}>
            Ubicacion: <strong style={{ color: '#eeeef5' }}>{pedidoOk.ubicacion}</strong>
          </p>
          <p style={{ fontSize: 13, color: '#9090a8', marginBottom: 32 }}>
            El encargado recibio tu pedido y lo preparara en breve.
          </p>
          <div style={{ background: '#0e0e1a', border: '1px solid #1e1e2e', borderRadius: 14, padding: 20, marginBottom: 24, textAlign: 'left' }}>
            {pedidoOk.items.map((it, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < pedidoOk.items.length - 1 ? '1px solid #1e1e2e' : 'none' }}>
                <span style={{ color: '#eeeef5' }}><span style={{ color: '#96C800', fontWeight: 800 }}>{it.cantidad}x</span> {it.nombre}</span>
                <span style={{ color: '#9090a8' }}>${(it.precio * it.cantidad).toFixed(0)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, fontWeight: 800, color: '#96C800' }}>
              <span>Total</span>
              <span>${parseFloat(pedidoOk.total).toFixed(0)}</span>
            </div>
          </div>
          <button
            onClick={() => setPedidoOk(null)}
            style={{ background: '#96C800', color: '#0a1a00', border: 'none', padding: '14px 32px', borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}
          >
            Hacer otro pedido
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
    <div className="min-h-screen pb-32" style={{ background: '#080810' }}>

      {/* HEADER */}
      <div className="sticky top-0 z-10 px-4 pt-12 pb-3" style={{ background: 'rgba(8,8,16,.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #1e1e2e' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#96C800', textTransform: 'uppercase', marginBottom: 2 }}>Bar & Tienda</p>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#eeeef5', letterSpacing: '-0.01em' }}>Pedir</h1>
          </div>
          {numItems() > 0 && (
            <div style={{ background: 'rgba(150,200,0,.1)', border: '1px solid rgba(150,200,0,.3)', borderRadius: 99, padding: '4px 14px', fontSize: 12, fontWeight: 800, color: '#96C800' }}>
              {numItems()} items · ${totalCarrito().toFixed(0)}
            </div>
          )}
        </div>

        {/* Ubicacion */}
        <select
          value={ubicacion}
          onChange={e => setUbicacion(e.target.value)}
          style={{ width: '100%', padding: '13px 14px', background: '#0e0e1a', border: '1px solid #27273a', borderRadius: 10, color: ubicacion ? '#eeeef5' : '#8a8aa0', fontSize: 15, fontWeight: 700, fontFamily: 'inherit', marginBottom: 10 }}
        >
          <option value="">¿Donde estas? (selecciona tu ubicacion)</option>
          {UBICACIONES.map(u => <option key={u} value={u}>{u}</option>)}
        </select>

        {/* Categorías */}
        {!loading && cats.length > 0 && (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
            {cats.map(cat => (
              <button
                key={cat}
                onClick={() => setCatActiva(cat)}
                style={{
                  padding: '9px 16px', borderRadius: 99, border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap',
                  background: catActiva === cat ? '#96C800' : 'rgba(255,255,255,.06)',
                  color: catActiva === cat ? '#0a1a00' : '#c4c4d8',
                }}
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
          <div style={{ background: '#0e0e1a', border: '1px solid rgba(150,200,0,.25)', borderRadius: 16, padding: 16, marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 22 }}>⭐</span>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#eeeef5' }}>Lo de siempre</h2>
            </div>

            {ultDisp > 0 && (
              <button
                onClick={repetirUltimo}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '14px 16px', borderRadius: 12, background: '#96C800', color: '#0a1a00', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: 16, marginBottom: frecVivos.length > 0 ? 14 : 0 }}
              >
                <span>🔁 Repetir mi último pedido</span>
                <span style={{ fontSize: 13, fontWeight: 700, opacity: .85 }}>{ultDisp} {ultDisp === 1 ? 'producto' : 'productos'}</span>
              </button>
            )}

            {frecVivos.length > 0 && (
              <>
                <p style={{ fontSize: 15, color: '#c4c4d8', margin: '0 0 10px', lineHeight: 1.4 }}>
                  ¿Te pido tu <strong style={{ color: '#96C800' }}>{frecVivos[0].nombre}</strong>? Toca para agregar.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {frecVivos.map(m => {
                    const cant = carrito[m.id] || 0;
                    return (
                      <button
                        key={m.id}
                        onClick={() => cambiarCantidad(m.id, 1)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 99, cursor: 'pointer', fontFamily: 'inherit', fontSize: 15, fontWeight: 700,
                          background: cant > 0 ? '#96C800' : 'rgba(150,200,0,.12)',
                          border: cant > 0 ? 'none' : '1px solid rgba(150,200,0,.35)',
                          color: cant > 0 ? '#0a1a00' : '#cfe88a' }}
                      >
                        <span>{cant > 0 ? `${cant}× ` : '+ '}{m.nombre}</span>
                        <span style={{ opacity: .8, fontWeight: 800 }}>${m.precio}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ height: 72, background: '#0e0e1a', borderRadius: 12, border: '1px solid #1e1e2e', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        )}

        {!loading && itemsActivos.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🍽</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#5e5e78' }}>Sin productos disponibles</div>
          </div>
        )}

        {!loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {itemsActivos.map(item => {
              const cant = carrito[item.id] || 0;
              return (
                <div
                  key={item.id}
                  style={{ background: '#0e0e1a', border: cant > 0 ? '1px solid rgba(150,200,0,.4)' : '1px solid #1e1e2e', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#eeeef5', marginBottom: 2 }}>{item.nombre}</div>
                    {item.descripcion && <div style={{ fontSize: 13, color: '#b8b8cc', marginBottom: 4 }}>{item.descripcion}</div>}
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#96C800' }}>${item.precio}</div>
                  </div>
                  {cant === 0 ? (
                    <button
                      onClick={() => cambiarCantidad(item.id, 1)}
                      style={{ width: 36, height: 36, borderRadius: 99, background: 'rgba(150,200,0,.1)', border: '1px solid rgba(150,200,0,.3)', color: '#96C800', fontSize: 20, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                    >+</button>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button onClick={() => cambiarCantidad(item.id, -1)} style={{ width: 32, height: 32, borderRadius: 99, background: 'rgba(255,255,255,.06)', border: '1px solid #27273a', color: '#eeeef5', fontSize: 18, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                      <span style={{ fontSize: 16, fontWeight: 800, color: '#eeeef5', minWidth: 20, textAlign: 'center' }}>{cant}</span>
                      <button onClick={() => cambiarCantidad(item.id, 1)}  style={{ width: 32, height: 32, borderRadius: 99, background: '#96C800', border: 'none', color: '#0a1a00', fontSize: 18, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
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
        <div style={{ position: 'fixed', bottom: 64, left: 0, right: 0, padding: '12px 16px', background: 'rgba(8,8,16,.97)', backdropFilter: 'blur(12px)', borderTop: '1px solid #1e1e2e', zIndex: 40 }}>
          <textarea
            value={notas}
            onChange={e => setNotas(e.target.value)}
            placeholder="Notas especiales... (opcional)"
            rows={1}
            style={{ width: '100%', background: '#0e0e1a', border: '1px solid #27273a', borderRadius: 10, color: '#eeeef5', fontSize: 13, padding: '10px 12px', fontFamily: 'inherit', resize: 'none', marginBottom: 10 }}
          />
          <button
            onClick={enviarPedido}
            disabled={enviando || !ubicacion}
            style={{
              width: '100%', padding: '14px', borderRadius: 12,
              background: !ubicacion ? '#1e1e2e' : '#96C800',
              color: !ubicacion ? '#5e5e78' : '#0a1a00',
              border: 'none', cursor: !ubicacion ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', fontSize: 15, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {enviando ? 'Enviando...' : !ubicacion ? 'Selecciona tu ubicacion primero' : `Pedir ${numItems()} items · $${totalCarrito().toFixed(0)}`}
          </button>
        </div>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );
}
