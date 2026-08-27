import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BACKEND, UBICACIONES, PARA_LLEVAR } from '../lib/constants';

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
  // "Para llevar" no es un lugar donde esperar —el cliente puede ni estar en el club—,
  // así que ni el pin 📍 ni el "llegará hasta donde estés" aplican.
  const esLlevar = ubicacion === PARA_LLEVAR;
  const [notas, setNotas]         = useState('');
  const [enviando, setEnviando]   = useState(false);
  const [errorEnvio, setErrorEnvio] = useState('');
  const [pedidoOk, setPedidoOk]   = useState(null); // pedido enviado
  const [pickUbi, setPickUbi]     = useState(false);      // selector de ubicación
  const [confirmando, setConfirmando] = useState(false);  // resumen SIEMPRE antes de enviar (anti-dedazo)
  const [cuentaAbierta, setCuentaAbierta] = useState(null); // { folio, ubicacion } si hay cuenta abierta
  const [catActiva, setCatActiva] = useState('');
  const [busqueda, setBusqueda]   = useState('');   // búsqueda por nombre en TODO el menú
  const [habitos, setHabitos]     = useState(null); // { frecuentes, ultimo, total_pedidos }
  const [seguim, setSeguim]       = useState(null); // estado EN VIVO del pedido enviado

  // Horario y tiempos de preparación: se consultan al abrir para (a) avisar ANTES de que
  // el cliente arme un carrito que no se va a poder mandar y (b) poder decirle en cuánto
  // estará listo sin otra ida al servidor.
  const [horario, setHorario] = useState(null);

  useEffect(() => { fetchMenu(); fetchHabitos(); fetchCuentaAbierta(); fetchHorario(); }, []);

  async function fetchHorario() {
    try {
      const r = await fetch(`${BACKEND}/api/pedidos/horario`);
      const d = await r.json();
      if (d.ok) setHorario(d);
    } catch { }
  }

  // Minutos que se le prometen al cliente: manda el MÁS LENTO del carrito. Un café con
  // unos tacos no está listo en 5 minutos, y prometer de menos es peor que no prometer.
  function estimadoMin() {
    const t = (horario && horario.tiempos) || { cocina: 20, barra: 5, tienda: 5, default: 5 };
    const idx = menuPorId();
    let max = 0;
    for (const [id, cant] of Object.entries(carrito)) {
      if (!cant || cant <= 0) continue;
      const it = idx[id];
      const m = (it && t[it.area] != null) ? t[it.area] : t.default;
      if (m > max) max = m;
    }
    return max || t.default;
  }

  // Si el cliente ya tiene cuenta abierta, el sistema sabe dónde está: la ubicación
  // se pre-llena sola y el pedido se agiliza (solo queda confirmar).
  async function fetchCuentaAbierta() {
    const token = localStorage.getItem('sp_token');
    if (!token) return;
    try {
      const r = await fetch(`${BACKEND}/api/pedidos/mi-cuenta-abierta`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (d.ok && d.abierta) {
        setCuentaAbierta(d);
        if (d.ubicacion) setUbicacion(d.ubicacion);
      }
    } catch { }
  }

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

  // OJO: un mismo producto aparece en MÁS DE UNA sección del menú — los de
  // "⭐ Más pedidos" salen ahí Y en su categoría. Recorrer las secciones para sumar
  // contaba ese producto DOS VECES: el total se duplicaba, el pedido viajaba con la
  // línea repetida y, al aceptarlo la caja, se generaban DOS cargos (cobro doble).
  // El carrito es la única fuente de verdad de qué se pidió; el menú sólo sirve para
  // buscar el precio, y para eso ya existe el índice por id.
  function totalCarrito() {
    const idx = menuPorId();
    let total = 0;
    for (const [id, cant] of Object.entries(carrito)) {
      const item = idx[id];
      if (item && cant > 0) total += item.precio * cant;
    }
    return total;
  }

  function itemsCarrito() {
    const idx = menuPorId();
    const lista = [];
    for (const [id, cant] of Object.entries(carrito)) {
      const item = idx[id];
      if (!item || !(cant > 0)) continue;
      lista.push({
        item_id:  item.id,
        nombre:   item.nombre,
        cantidad: cant,
        precio:   item.precio,
      });
    }
    return lista;
  }

  function numItems() {
    return Object.values(carrito).reduce((s, n) => s + n, 0);
  }

  // Quita un producto COMPLETO del carrito (no de uno en uno). Es lo que se necesita
  // cuando te equivocaste de artículo — ver el carrito editable.
  function quitarDelCarrito(itemId) {
    setCarrito(prev => { const { [itemId]: _, ...rest } = prev; return rest; });
  }
  function vaciarCarrito() { setCarrito({}); }

  // ── HORARIO POR ÁREA ────────────────────────────────────────────────────────────
  // La cocina cierra a las 11 y la barra sigue abierta: apagar la app entera a esa hora
  // era cerrarle la puerta a la barra y a la tienda, que es donde más se vende a esa hora.
  // El área de cada producto viaja en el menú (`item.area`), así que se puede saber aquí
  // mismo qué se puede pedir AHORA y qué no. El backend valida igual — el reloj del
  // celular lo pone el cliente.
  function areaCerrada(area) {
    const a = horario?.areas?.[area];
    return !!(a && !a.abierto);
  }
  // La barra NO cierra por reloj: cierra cuando cierra la caja, según el movimiento del día
  // (los cortes reales van de las 23:13 a las 02:14). Así que el texto lo pone el servidor
  // —"cerró a las 10:45 pm" o "ya cerró la caja"— y aquí sólo se muestra. Componerlo con una
  // hora fija diría mentiras la mitad de las noches.
  function motivoCierre(area) { return horario?.areas?.[area]?.motivo_cierre || 'ya cerró'; }
  function vuelveTxt(area) { return horario?.areas?.[area]?.vuelve_txt || ''; }
  // Productos YA en el carrito cuyo área cerró: hay que sacarlos antes de mandar.
  function itemsCerrados() {
    const idx = menuPorId();
    return Object.keys(carrito)
      .map(id => idx[id])
      .filter(it => it && areaCerrada(it.area));
  }

  // Búsqueda por nombre en todas las categorías (sin acentos, may/min da igual)
  const normTxt = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  // 🔎 DOS COSAS QUE LA ROMPÍAN (German, 26-ago-2026: «pones una palabra y no filtra
  // correctamente»):
  //   1. REPETIDOS. 12 de los 220 productos del menú viven en DOS grupos a la vez (los de
  //      "⭐ Más pedidos" salen ahí Y en su categoría). El recorrido los sacaba dos veces:
  //      buscar "corona" devolvía la misma cerveza duplicada, con la misma `key` de React.
  //      Ahora se recuerda el id ya visto — gana el grupo real, no "Más pedidos".
  //   2. UNA SOLA CADENA. Era `includes(q)` con el texto completo, así que "taco frijol" no
  //      encontraba "TACO DE FRIJOLES CON CHORIZO" (le estorba el "DE" de en medio) y
  //      "agua 1" no encontraba "AGUA 1 LT" si sobraba un espacio. Ahora se parte en
  //      palabras y deben estar TODAS, en cualquier orden. También se busca en la
  //      descripción: es donde vive "sin azúcar", "light", el sabor.
  function itemsBusqueda() {
    const palabras = normTxt(busqueda).split(/\s+/).filter(Boolean);
    if (!palabras.length) return [];
    const out = [], vistos = new Set();
    for (const [grupo, items] of Object.entries(menu)) {
      for (const it of items) {
        if (!it.disponible || vistos.has(it.id)) continue;
        const heno = normTxt(it.nombre) + ' ' + normTxt(it.descripcion);
        if (!palabras.every(p => heno.includes(p))) continue;
        vistos.add(it.id);
        out.push({ ...it, _grupo: grupo });
      }
    }
    // Primero los que EMPIEZAN con lo tecleado: buscando "agua" lo primero es AGUA, no
    // "REFRESCO DE AGUA MINERAL".
    const q0 = palabras[0];
    out.sort((a, b) => (normTxt(b.nombre).startsWith(q0) ? 1 : 0) - (normTxt(a.nombre).startsWith(q0) ? 1 : 0));
    return out.slice(0, 60);
  }

  async function enviarPedido() {
    const ubi = ubicacion;
    if (!ubi) { setPickUbi(true); return; }
    const items = itemsCarrito();
    if (items.length === 0) return;
    setConfirmando(false);

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
          ubicacion: ubi,
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
            {pedidoOk.ubicacion === PARA_LLEVAR
              ? <>Lo recoges en: <strong className="text-sp-gray">la barra del club</strong></>
              : <>Ubicacion: <strong className="text-sp-gray">{pedidoOk.ubicacion}</strong></>}
          </p>
          {/* El estimado viene del servidor, que lo calcula contra el área REAL de cada
              producto: es el dato bueno, no el que adivinó el carrito. */}
          {!rechazado && pedidoOk.listo_en_min && (
            <p className="text-[15px] font-bold mb-6" style={{ color: '#7aaa00' }}>
              ⏱️ {pedidoOk.ubicacion === PARA_LLEVAR ? 'Pasa por él en' : 'Listo en'} ~{pedidoOk.listo_en_min} min
            </p>
          )}

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
  const enBusqueda   = !!busqueda.trim();
  const itemsMostrar = enBusqueda ? itemsBusqueda() : itemsActivos;
  const frecVivos = frecuentesVivos();
  const ultDisp   = ultimoDisponible();
  const cerradosEnCarrito = itemsCerrados();

  return (
    <div className="page" style={{ paddingBottom: numItems() > 0 ? 190 : 80 }}>

      {/* HEADER */}
      <div className="sticky top-0 z-10 bg-sp-green px-4 pt-[env(safe-area-inset-top)] pb-3">
        <div className="flex items-center justify-between pt-3 mb-3">
          <p className="text-white font-black text-lg">Pedir al bar</p>
          {/* El contador era un adorno. Ahora ABRE EL CARRITO: es la única forma de ver lo
              que llevas y corregirlo sin ir a buscar el producto por todo el menú. */}
          {numItems() > 0 && (
            <button
              onClick={() => setConfirmando(true)}
              className="bg-black/25 rounded-full px-3.5 py-1.5 text-white text-[13px] font-black flex items-center gap-1.5 active:scale-95 transition-transform"
            >
              🛒 {numItems()} · ${totalCarrito().toFixed(0)}
              <span className="text-[11px] font-bold opacity-80">Ver</span>
            </button>
          )}
        </div>

        {/* Ubicación elegida, siempre visible y tocable para cambiarla. Si aún no hay,
            se elige al confirmar el pedido (ahí es cuando el cliente pone atención). */}
        <button
          onClick={() => setPickUbi(true)}
          className="w-full rounded-xl px-3.5 py-3 text-[15px] font-bold mb-2.5 text-left flex items-center justify-between"
          style={{ background: 'white', color: ubicacion ? '#575757' : '#9ca3af' }}
        >
          <span>
            {esLlevar ? '🥡' : '📍'} {ubicacion || '¿Dónde estás?'}
            {cuentaAbierta && ubicacion === cuentaAbierta.ubicacion && (
              <span className="text-[12px] font-bold" style={{ color: '#7aaa00' }}> · tu cuenta abierta</span>
            )}
          </span>
          <span className="text-[12px] font-bold" style={{ color: '#7aaa00' }}>{ubicacion ? 'Cambiar' : 'Elegir'}</span>
        </button>

        {/* Buscador por nombre (todo el menú) */}
        <div className="relative mb-2.5">
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="🔎 Buscar... (ej. corona, tacos, café)"
            className="w-full rounded-xl px-3.5 py-3 text-[15px] font-semibold outline-none"
            style={{ background: 'white', border: 'none', color: '#575757' }}
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gray-100 text-gray-500 font-black"
            >✕</button>
          )}
        </div>

        {/* Categorías (se ocultan mientras buscas) */}
        {!loading && cats.length > 0 && !busqueda.trim() && (
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

        {/* ⭐ LO DE SIEMPRE — personalización por hábitos del cliente (oculto al buscar) */}
        {!loading && !enBusqueda && (ultDisp > 0 || frecVivos.length > 0) && (
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

        {!loading && itemsMostrar.length === 0 && (
          <div className="text-center py-14">
            <div style={{ fontSize: 36, marginBottom: 10 }}>{enBusqueda ? '🔎' : '🍽'}</div>
            <p className="text-gray-400 font-bold text-sm">
              {enBusqueda ? `Sin resultados para "${busqueda.trim()}"` : 'Sin productos disponibles'}
            </p>
          </div>
        )}

        {!loading && (
          <div className="flex flex-col gap-2.5">
            {itemsMostrar.map(item => {
              const cant = carrito[item.id] || 0;
              // Lo que ya cerró se sigue VIENDO (para que el cliente sepa que existe y a
              // qué hora vuelve), pero apagado: no se puede agregar. Antes esto no existía
              // y a las 11 se apagaba la app completa, barra incluida.
              const cerrado = areaCerrada(item.area);
              return (
                <div
                  key={item.id}
                  className="card flex items-center justify-between gap-3 py-3.5"
                  style={cerrado ? { opacity: 0.55 } : (cant > 0 ? { borderColor: '#96C800' } : undefined)}
                >
                  <div className="flex-1">
                    <p className="text-sp-gray font-bold text-base mb-0.5">{item.nombre}</p>
                    {item.descripcion && <p className="text-gray-400 text-[13px] mb-1">{item.descripcion}</p>}
                    <p className="text-sp-green-dark font-black text-base">
                      ${item.precio}
                      {enBusqueda && item._grupo && <span className="text-gray-300 text-[12px] font-semibold"> · {item._grupo}</span>}
                    </p>
                    {cerrado && (
                      <p className="text-[12px] font-bold mt-0.5" style={{ color: '#9a3412' }}>
                        ⏰ {item.area === 'cocina' ? 'Cocina cerrada' : item.area === 'barra' ? 'Barra cerrada' : 'Tienda cerrada'} · vuelve {vuelveTxt(item.area)}
                      </p>
                    )}
                  </div>
                  {cerrado ? (
                    <span className="text-[12px] font-bold text-gray-400 flex-shrink-0">Cerrado</span>
                  ) : cant === 0 ? (
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
            onClick={() => setConfirmando(true)}
            disabled={enviando}
            className="w-full py-3.5 rounded-xl font-black text-[15px] flex items-center justify-center gap-2 bg-sp-green text-white disabled:opacity-60"
          >
            {enviando ? 'Enviando...' : `Pedir ${numItems()} ${numItems() === 1 ? 'item' : 'items'} · $${totalCarrito().toFixed(0)}`}
          </button>
        </div>
      )}

      {/* CONFIRMACIÓN — SIEMPRE se revisa el pedido antes de enviar (anti-dedazo) */}
      {confirmando && (
        <div
          className="fixed inset-0 z-[60] flex items-end"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={() => setConfirmando(false)}
        >
          <div
            className="w-full bg-white rounded-t-3xl px-4 pt-5 pb-8"
            style={{ maxWidth: 448, margin: '0 auto', maxHeight: 'min(80dvh, 80vh)', overflowY: 'auto', overscrollBehavior: 'contain' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sp-gray font-black text-lg">🛒 Tu pedido</p>
              {numItems() > 0 && (
                <button onClick={vaciarCarrito} className="text-[13px] font-bold text-gray-400">Vaciar</button>
              )}
            </div>
            {/* EDITABLE. Antes esto era una lista de sólo lectura: si te equivocaste de
                artículo no había forma de corregirlo aquí — había que salir, encontrar el
                producto entre 220 del menú y bajarle la cantidad. Ahora cada renglón trae
                sus −/+ y su 🗑, que es lo que se busca cuando ya te diste cuenta del error. */}
            <div className="rounded-xl bg-gray-50 px-3.5 py-2.5 mb-3">
              {itemsCarrito().length === 0 && (
                <p className="text-gray-400 text-[14px] text-center py-3">Tu carrito está vacío.</p>
              )}
              {itemsCarrito().map(it => {
                const cerrado = areaCerrada(it.area);
                return (
                  <div key={it.item_id} className="py-1.5 border-b border-gray-200 last:border-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sp-gray text-[15px] flex-1">{it.nombre}</span>
                      <span className="text-gray-500 text-[15px] font-bold">${(it.precio * it.cantidad).toFixed(0)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <button onClick={() => cambiarCantidad(it.item_id, -1)} className="w-8 h-8 rounded-full bg-white border border-gray-200 text-sp-gray text-lg font-black flex items-center justify-center">−</button>
                      <span className="text-sp-gray text-[15px] font-black min-w-[18px] text-center">{it.cantidad}</span>
                      <button onClick={() => cambiarCantidad(it.item_id, 1)} className="w-8 h-8 rounded-full bg-sp-green text-white text-lg font-black flex items-center justify-center">+</button>
                      <button onClick={() => quitarDelCarrito(it.item_id)} className="ml-1 px-2.5 h-8 rounded-full bg-white border border-gray-200 text-[13px] font-bold text-gray-500">🗑 Quitar</button>
                      <span className="flex-1" />
                      <span className="text-gray-400 text-[12px]">${it.precio} c/u</span>
                    </div>
                    {cerrado && (
                      <p className="text-[12px] font-bold mt-1" style={{ color: '#9a3412' }}>
                        ⏰ {it.area === 'cocina' ? 'La cocina' : it.area === 'barra' ? 'La barra' : 'La tienda'} {motivoCierre(it.area)} — quítalo para poder mandar el pedido
                      </p>
                    )}
                  </div>
                );
              })}
              <div className="flex justify-between pt-2 mt-1 border-t border-gray-200 font-black text-sp-green-dark">
                <span>Total</span><span>${totalCarrito().toFixed(0)}</span>
              </div>
              {/* Lo que se le promete al cliente. Manda el producto más lento del carrito. */}
              <div className="flex justify-between pt-1.5 text-[13px] text-gray-500">
                <span>Listo en aprox.</span>
                <span className="font-bold text-sp-gray">{estimadoMin()} min</span>
              </div>
            </div>
            <button
              onClick={() => setPickUbi(true)}
              className="w-full rounded-xl px-3.5 py-3 mb-3 text-left flex items-center justify-between bg-gray-50 border border-gray-200"
            >
              <span className="text-[15px] font-bold text-sp-gray">
                {esLlevar ? '🥡' : '📍'} {ubicacion || 'Falta decir dónde estás'}
                {cuentaAbierta && ubicacion === cuentaAbierta.ubicacion && (
                  <span className="text-[12px] text-sp-green-dark"> · tu cuenta abierta</span>
                )}
              </span>
              <span className="text-[12px] font-bold" style={{ color: '#7aaa00' }}>{ubicacion ? 'Cambiar' : 'Elegir'}</span>
            </button>
            {notas && <p className="text-gray-400 text-[13px] mb-3">📝 {notas}</p>}
            {/* Fuera de horario: se avisa y se apaga el botón. El reloj del celular NO
                manda —el backend rechaza igual—, pero avisar aquí evita que el cliente
                arme el carrito completo para que se lo rebote al final. */}
            {/* Sólo se apaga el botón si TODO está cerrado, o si el carrito trae algo de un
                área que ya cerró (y entonces se dice cuál y se ofrece quitarlo). Apagarlo
                porque cerró la cocina era cerrarle la puerta a la barra, que a esa hora es
                justo la que vende. */}
            {horario && !horario.abierto && (
              <div className="rounded-xl px-3.5 py-3 mb-3 border" style={{ background: '#fff7ed', borderColor: '#fed7aa' }}>
                <p className="text-[14px] font-bold" style={{ color: '#9a3412' }}>🌙 Cerrado por ahora</p>
                <p className="text-[13px] mt-0.5" style={{ color: '#9a3412' }}>
                  Vuelve a abrir cuando abra el club. Si ya estás aquí, pídelo en la barra.
                </p>
              </div>
            )}
            {horario && horario.abierto && cerradosEnCarrito.length > 0 && (
              <div className="rounded-xl px-3.5 py-3 mb-3 border" style={{ background: '#fff7ed', borderColor: '#fed7aa' }}>
                <p className="text-[14px] font-bold" style={{ color: '#9a3412' }}>⏰ Hay algo que ya no se puede pedir</p>
                <p className="text-[13px] mt-0.5 mb-2" style={{ color: '#9a3412' }}>
                  {cerradosEnCarrito.map(i => i.nombre).join(', ')}. Lo demás sí se puede.
                </p>
                <button
                  onClick={() => cerradosEnCarrito.forEach(i => quitarDelCarrito(i.id))}
                  className="w-full py-2.5 rounded-xl font-black text-[14px] bg-white border"
                  style={{ borderColor: '#fed7aa', color: '#9a3412' }}
                >Quitarlos y seguir</button>
              </div>
            )}
            <button
              onClick={enviarPedido}
              disabled={enviando || !ubicacion || numItems() === 0 || (horario && !horario.abierto) || cerradosEnCarrito.length > 0}
              className={`w-full py-3.5 rounded-xl font-black text-[15px] ${
                (!ubicacion || numItems() === 0 || (horario && !horario.abierto) || cerradosEnCarrito.length > 0) ? 'bg-gray-100 text-gray-400' : 'bg-sp-green text-white'
              }`}
            >
              {enviando ? 'Enviando...'
                : numItems() === 0 ? 'Agrega algo al carrito'
                : (horario && !horario.abierto) ? `Cerrado por ahora`
                : cerradosEnCarrito.length > 0 ? 'Quita lo que ya cerró'
                : !ubicacion ? 'Elige tu ubicación primero'
                : '✅ Confirmar pedido'}
            </button>
            <button onClick={() => setConfirmando(false)} className="w-full text-center text-gray-400 text-sm font-semibold mt-3">
              Volver
            </button>
          </div>
        </div>
      )}

      {/* SELECTOR DE UBICACIÓN — desde el chip de arriba o desde la confirmación */}
      {pickUbi && (
        <div
          className="fixed inset-0 z-[60] flex items-end"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={() => setPickUbi(false)}
        >
          <div
            className="w-full bg-white rounded-t-3xl px-4 pt-5 pb-8"
            style={{ maxWidth: 448, margin: '0 auto' }}
            onClick={e => e.stopPropagation()}
          >
            <p className="text-sp-gray font-black text-lg text-center mb-1">📍 ¿Dónde estás?</p>
            <p className="text-gray-400 text-[13px] text-center mb-4">Te lo llevamos a tu lugar, o lo preparamos para llevar</p>

            {/* Va PRIMERO y de ancho completo: si se mezclara en la parrilla quedaría
                escondido entre las canchas y nadie lo encontraría. */}
            <button
              onClick={() => { setUbicacion(PARA_LLEVAR); setPickUbi(false); }}
              className={`w-full py-3.5 rounded-xl text-[15px] font-bold border transition-colors mb-3 ${
                ubicacion === PARA_LLEVAR ? 'bg-sp-green text-white border-sp-green' : 'bg-white text-sp-gray border-gray-200'
              }`}
            >
              🥡 {PARA_LLEVAR}
              <span className={`block text-[12px] font-semibold ${ubicacion === PARA_LLEVAR ? 'text-white/80' : 'text-gray-400'}`}>
                Paso por él — no hace falta que esté en el club
              </span>
            </button>

            <p className="text-gray-400 text-[12px] text-center mb-2.5">o te lo llevamos a…</p>
            <div className="grid grid-cols-2 gap-2.5">
              {UBICACIONES.map(u => (
                <button
                  key={u}
                  onClick={() => { setUbicacion(u); setPickUbi(false); }}
                  className={`py-3.5 rounded-xl text-[15px] font-bold border transition-colors ${
                    ubicacion === u ? 'bg-sp-green text-white border-sp-green' : 'bg-white text-sp-gray border-gray-200'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
            <button onClick={() => setPickUbi(false)} className="w-full text-center text-gray-400 text-sm font-semibold mt-4">
              Cancelar
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );
}
