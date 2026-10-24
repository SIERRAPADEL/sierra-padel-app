import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BACKEND, UBICACIONES, PARA_LLEVAR, nombreUbicacion } from '../lib/constants';
import { t } from '../i18n';

// Función (no objeto) para que t() corra al pintar, en el idioma vigente.
function catLabel(cat) {
  if (cat === 'bebidas') return t('Bebidas');
  if (cat === 'snacks') return t('Snacks');
  if (cat === 'accesorios') return t('Accesorios');
  return cat;
}

// Pinta un texto traducido que lleva un nodo JSX en medio ({llave} → nodo).
function conNodo(texto, llave, nodo) {
  const [a, b = ''] = String(texto).split(`{${llave}}`);
  return <>{a}{nodo}{b}</>;
}

export default function Pedir() {
  const { user } = useAuth();
  const [menu, setMenu]           = useState({});
  const [loading, setLoading]     = useState(true);
  const [carrito, setCarrito]     = useState({});  // { llave: cantidad } — llave = itemId, o itemId|opciones
  // 🌮 COMPLEMENTOS (German, 13-oct-2026: «al pedir tacos no pregunta tortilla y es
  // indispensable»). Un platillo con grupos (tortilla, guiso…) se agrega con su elección y
  // cada elección es su propio renglón: 2 tacos en maíz y 1 en harina son dos líneas.
  // elecciones[llave] = { itemId, complementos:[opcionId], detalle:'Tortilla: Maíz', extra:$ }
  const [elecciones, setElecciones] = useState({});
  const [eligiendo, setEligiendo]   = useState(null); // { item, sel:{ grupoId:[opcionId] } }
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
    const tiempos = (horario && horario.tiempos) || { cocina: 20, barra: 5, tienda: 5, default: 5 };
    const idx = menuPorId();
    let max = 0;
    for (const [k, cant] of Object.entries(carrito)) {
      if (!cant || cant <= 0) continue;
      const it = idx[idDe(k)];
      const m = (it && tiempos[it.area] != null) ? tiempos[it.area] : tiempos.default;
      if (m > max) max = m;
    }
    return max || tiempos.default;
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
      case 'preparando': return { icon: '👨‍🍳', tint: 'var(--sp-green-dark)', label: t('Pedido aceptado'), titulo: t('¡Tu pedido fue aceptado!'), sub: t('Lo estan preparando.') };
      case 'listo':      return { icon: '🛎️', tint: 'var(--sp-green-dark)', label: t('Pedido listo'), titulo: t('¡Tu pedido esta listo!'), sub: t('En un momento te lo llevan.') };
      case 'entregado':  return { icon: '✅', tint: 'var(--sp-green-dark)', label: t('Entregado'), titulo: t('¡Entregado!'), sub: t('¡Buen provecho!') };
      case 'cancelado':  return { icon: '❌', tint: '#e5484d', label: t('Pedido rechazado'), titulo: t('Tu pedido fue rechazado'), sub: motivo || t('El encargado no pudo tomar tu pedido. Acercate al bar si tienes dudas.') };
      default:           return { icon: '⏳', tint: '#b58a00', label: t('Pedido enviado'), titulo: t('Pedido enviado'), sub: t('Esperando que el encargado lo confirme…') };
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

  // De la llave del carrito al producto (las llaves con complementos llevan «|opciones»).
  function idDe(k) { return (elecciones[k] && elecciones[k].itemId) || String(k).split('|')[0]; }
  const llevaComplementos = (it) => Array.isArray(it?.complementos) && it.complementos.length > 0;
  // Cuántos de ese producto hay en el carrito, sumando todas sus variantes.
  function cantDeItem(itemId) {
    let n = 0;
    for (const [k, c] of Object.entries(carrito)) if (idDe(k) === itemId) n += c;
    return n;
  }
  // «+» de un producto: si tiene complementos se pregunta primero; si no, se agrega directo.
  function agregarItem(item) {
    if (llevaComplementos(item)) {
      // Un grupo de UNA sola opción ya está elegido: no tiene caso preguntarlo.
      const sel = {};
      for (const g of item.complementos) if (g.opciones.length === 1 && g.min >= 1) sel[g.id] = [g.opciones[0].id];
      setEligiendo({ item, sel, cant: 1 });
      return;
    }
    cambiarCantidad(item.id, 1);
  }
  // «−» de un producto con complementos (German 13-oct-2026: «quitaste el multiplicador»).
  // Baja uno de la variante agregada al ÚLTIMO (el orden del carrito es el de inserción):
  // es lo que el cliente espera al arrepentirse del último toque. Cada variante se sigue
  // ajustando por separado en el carrito.
  function quitarUnoDeItem(itemId) {
    const llaves = Object.keys(carrito).filter(k => idDe(k) === itemId && carrito[k] > 0);
    if (llaves.length) cambiarCantidad(llaves[llaves.length - 1], -1);
  }
  function faltanEnEleccion(e) {
    return (e?.item?.complementos || []).filter(g => (e.sel[g.id] || []).length < g.min);
  }
  function confirmarEleccion() {
    const e = eligiendo;
    if (!e || faltanEnEleccion(e).length) return;
    const ids = [], partes = [];
    let extra = 0;
    for (const g of e.item.complementos) {
      const elegidas = g.opciones.filter(o => (e.sel[g.id] || []).includes(o.id));
      if (!elegidas.length) continue;
      ids.push(...elegidas.map(o => o.id));
      partes.push(`${g.nombre}: ${elegidas.map(o => o.nombre).join(', ')}`);
      extra += elegidas.reduce((s, o) => s + (Number(o.precio_extra) || 0), 0);
    }
    const llave = `${e.item.id}|${[...ids].sort().join(',')}`;
    setElecciones(prev => ({ ...prev, [llave]: { itemId: e.item.id, complementos: ids, detalle: partes.join(' · '), extra } }));
    const n = Math.max(1, Number(e.cant) || 1);
    setCarrito(prev => ({ ...prev, [llave]: (prev[llave] || 0) + n }));
    setEligiendo(null);
  }
  function tocarOpcion(g, o) {
    setEligiendo(prev => {
      const actual = prev.sel[g.id] || [];
      let nuevo;
      if (g.max <= 1) nuevo = actual.includes(o.id) ? [] : [o.id];
      else if (actual.includes(o.id)) nuevo = actual.filter(x => x !== o.id);
      else if (actual.length >= g.max) return prev;   // ya completó el máximo
      else nuevo = [...actual, o.id];
      return { ...prev, sel: { ...prev.sel, [g.id]: nuevo } };
    });
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
    const nuevasElecciones = {};
    setCarrito(prev => {
      const next = { ...prev };
      for (const it of items) {
        const m = idx[it.item_id || it.id];
        if (!m || !m.disponible) continue;
        let llave = m.id;
        if (llevaComplementos(m)) {
          // Se repite con la MISMA elección; si el pedido viejo no la traía, no se puede
          // adivinar la tortilla: ese platillo se agrega a mano con su «+».
          const ids = Array.isArray(it.complementos) ? it.complementos.map(String) : [];
          if (!ids.length) continue;
          llave = `${m.id}|${[...ids].sort().join(',')}`;
          nuevasElecciones[llave] = { itemId: m.id, complementos: ids, detalle: it.detalle || '', extra: Math.max(0, (Number(it.precio) || m.precio) - m.precio) };
        }
        next[llave] = (next[llave] || 0) + (Number(it.cantidad) || 1);
      }
      return next;
    });
    setElecciones(prev => ({ ...prev, ...nuevasElecciones }));
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
    for (const [k, cant] of Object.entries(carrito)) {
      const item = idx[idDe(k)];
      if (item && cant > 0) total += (item.precio + ((elecciones[k] && elecciones[k].extra) || 0)) * cant;
    }
    return total;
  }

  function itemsCarrito() {
    const idx = menuPorId();
    const lista = [];
    for (const [k, cant] of Object.entries(carrito)) {
      const item = idx[idDe(k)];
      if (!item || !(cant > 0)) continue;
      const el = elecciones[k];
      lista.push({
        llave:    k,
        item_id:  item.id,
        nombre:   item.nombre,
        cantidad: cant,
        precio:   item.precio + ((el && el.extra) || 0),
        area:     item.area,
        ...(el ? { complementos: el.complementos, detalle: el.detalle } : {}),
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
  function vaciarCarrito() { setCarrito({}); setElecciones({}); }

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
  function motivoCierre(area) { return horario?.areas?.[area]?.motivo_cierre || t('ya cerró'); }
  function vuelveTxt(area) { return horario?.areas?.[area]?.vuelve_txt || ''; }
  // Productos YA en el carrito cuyo área cerró: hay que sacarlos antes de mandar.
  function itemsCerrados() {
    const idx = menuPorId();
    return Object.keys(carrito)
      .map(k => (idx[idDe(k)] ? { ...idx[idDe(k)], llave: k } : null))
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
      setElecciones({});
      setNotas('');
    } catch (e) {
      setErrorEnvio(e.message || t('Error al enviar pedido. Intenta de nuevo.'));
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
      { k: 'pendiente',  txt: t('Enviado') },
      { k: 'preparando', txt: t('Aceptado') },
      { k: 'listo',      txt: t('Listo') },
      { k: 'entregado',  txt: t('Entregado') },
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
              ? conNodo(t('Lo recoges en: {lugar}'), 'lugar', <strong className="text-sp-gray">{t('la barra del club')}</strong>)
              : conNodo(t('Ubicacion: {lugar}'), 'lugar', <strong className="text-sp-gray">{nombreUbicacion(pedidoOk.ubicacion)}</strong>)}
          </p>
          {/* El estimado viene del servidor, que lo calcula contra el área REAL de cada
              producto: es el dato bueno, no el que adivinó el carrito. */}
          {!rechazado && pedidoOk.listo_en_min && (
            <p className="text-[15px] font-bold mb-6" style={{ color: 'var(--sp-green-dark)' }}>
              ⏱️ {pedidoOk.ubicacion === PARA_LLEVAR
                ? t('Pasa por él en ~{n} min', { n: pedidoOk.listo_en_min })
                : t('Listo en ~{n} min', { n: pedidoOk.listo_en_min })}
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
                      <div style={{ width: 14, height: 14, borderRadius: 99, background: hecho ? 'var(--sp-green)' : '#e5e7eb', flex: '0 0 auto' }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: hecho ? 'var(--sp-green-dark)' : '#9ca3af', whiteSpace: 'nowrap' }}>{p.txt}</span>
                    </div>
                    {i < PASOS.length - 1 && (
                      <div style={{ flex: 1, height: 2, background: i < idxActual ? 'var(--sp-green)' : '#e5e7eb', margin: '0 4px', marginBottom: 16 }} />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {enCurso && (
            <p className="text-gray-400 text-[13px] mb-5">{t('Actualizando en vivo…')}</p>
          )}

          <div className="card text-left mb-6" style={{ opacity: rechazado ? 0.6 : 1 }}>
            {pedidoOk.items.map((it, i) => (
              <div key={i} className={`flex justify-between py-1.5 ${i < pedidoOk.items.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <span className="text-sp-gray text-[15px]"><span className="text-sp-green-dark font-black">{it.cantidad}x</span> {it.nombre}</span>
                <span className="text-gray-500 text-[15px]">${(it.precio * it.cantidad).toFixed(0)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-3 font-black text-sp-green-dark text-base">
              <span>{t('Total')}</span>
              <span>${parseFloat(pedidoOk.total).toFixed(0)}</span>
            </div>
          </div>
          <button
            onClick={() => { setSeguim(null); setPedidoOk(null); }}
            className={`w-full py-3.5 rounded-xl font-black text-[15px] ${
              rechazado ? 'bg-sp-green text-white' : 'bg-white border border-gray-200 text-sp-gray'
            }`}
          >
            {rechazado ? t('Intentar de nuevo') : t('Hacer otro pedido')}
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
          <p className="text-white font-black text-lg">{t('Pedir al bar')}</p>
          {/* El contador era un adorno. Ahora ABRE EL CARRITO: es la única forma de ver lo
              que llevas y corregirlo sin ir a buscar el producto por todo el menú. */}
          {numItems() > 0 && (
            <button
              onClick={() => setConfirmando(true)}
              className="bg-black/25 rounded-full px-3.5 py-1.5 text-white text-[13px] font-black flex items-center gap-1.5 active:scale-95 transition-transform"
            >
              🛒 {numItems()} · ${totalCarrito().toFixed(0)}
              <span className="text-[11px] font-bold opacity-80">{t('Ver')}</span>
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
            {esLlevar ? '🥡' : '📍'} {ubicacion ? nombreUbicacion(ubicacion) : t('¿Dónde estás?')}
            {cuentaAbierta && ubicacion === cuentaAbierta.ubicacion && (
              <span className="text-[12px] font-bold" style={{ color: 'var(--sp-green-dark)' }}> · {t('tu cuenta abierta')}</span>
            )}
          </span>
          <span className="text-[12px] font-bold" style={{ color: 'var(--sp-green-dark)' }}>{ubicacion ? t('Cambiar') : t('Elegir')}</span>
        </button>

        {/* Buscador por nombre (todo el menú) */}
        <div className="relative mb-2.5">
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder={t('🔎 Buscar... (ej. corona, tacos, café)')}
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
                {catLabel(cat)}
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
              <h2 className="text-sp-gray font-black text-lg">{t('Lo de siempre')}</h2>
            </div>

            {ultDisp > 0 && (
              <button
                onClick={repetirUltimo}
                className="w-full flex items-center justify-between gap-2.5 px-4 py-3.5 rounded-xl bg-sp-green text-white font-black text-base active:scale-[0.98] transition-transform"
                style={{ marginBottom: frecVivos.length > 0 ? 14 : 0 }}
              >
                <span>{t('🔁 Repetir mi último pedido')}</span>
                <span className="text-[13px] font-bold opacity-90">{ultDisp === 1 ? t('{n} producto', { n: ultDisp }) : t('{n} productos', { n: ultDisp })}</span>
              </button>
            )}

            {frecVivos.length > 0 && (
              <>
                <p className="text-sp-gray text-[15px] leading-snug mb-2.5">
                  {conNodo(t('¿Te pido tu {producto}? Toca para agregar.'), 'producto', <strong className="text-sp-green-dark">{frecVivos[0].nombre}</strong>)}
                </p>
                <div className="flex flex-wrap gap-2">
                  {frecVivos.map(m => {
                    const cant = cantDeItem(m.id);
                    return (
                      <button
                        key={m.id}
                        onClick={() => agregarItem(m)}
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
              {enBusqueda ? t('Sin resultados para "{q}"', { q: busqueda.trim() }) : t('Sin productos disponibles')}
            </p>
          </div>
        )}

        {!loading && (
          <div className="flex flex-col gap-2.5">
            {itemsMostrar.map(item => {
              const cant = cantDeItem(item.id);
              const conComp = llevaComplementos(item);
              // Lo que ya cerró se sigue VIENDO (para que el cliente sepa que existe y a
              // qué hora vuelve), pero apagado: no se puede agregar. Antes esto no existía
              // y a las 11 se apagaba la app completa, barra incluida.
              const cerrado = areaCerrada(item.area);
              return (
                <div
                  key={item.id}
                  className="card flex items-center justify-between gap-3 py-3.5"
                  style={cerrado ? { opacity: 0.55 } : (cant > 0 ? { borderColor: 'var(--sp-green)' } : undefined)}
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
                        ⏰ {t('{area} · vuelve {cuando}', {
                          area: item.area === 'cocina' ? t('Cocina cerrada') : item.area === 'barra' ? t('Barra cerrada') : t('Tienda cerrada'),
                          cuando: vuelveTxt(item.area),
                        })}
                      </p>
                    )}
                  </div>
                  {cerrado ? (
                    <span className="text-[12px] font-bold text-gray-400 flex-shrink-0">{t('Cerrado')}</span>
                  ) : cant === 0 ? (
                    <button
                      onClick={() => agregarItem(item)}
                      className="w-10 h-10 rounded-full bg-sp-green-light text-sp-green-dark text-2xl font-black flex items-center justify-center flex-shrink-0"
                      style={{ lineHeight: 1 }}
                    >+</button>
                  ) : (
                    /* − cantidad + para TODOS (German 13-oct-2026). Con complementos el «+» vuelve
                       a preguntar (puede ser otra tortilla) y el «−» quita el último agregado. */
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      <button onClick={() => (conComp ? quitarUnoDeItem(item.id) : cambiarCantidad(item.id, -1))} className="w-9 h-9 rounded-full bg-gray-100 text-sp-gray text-xl font-black flex items-center justify-center">−</button>
                      <span className="text-sp-gray text-base font-black min-w-[20px] text-center">{cant}</span>
                      <button onClick={() => (conComp ? agregarItem(item) : cambiarCantidad(item.id, 1))} className="w-9 h-9 rounded-full bg-sp-green text-white text-xl font-black flex items-center justify-center">+</button>
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
            placeholder={t('Notas especiales... (opcional)')}
            rows={1}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl text-sp-gray text-sm px-3 py-2.5 mb-2.5 resize-none outline-none focus:border-sp-green"
          />
          {errorEnvio && <p className="text-red-500 text-sm font-semibold text-center mb-2">{errorEnvio}</p>}
          <button
            onClick={() => setConfirmando(true)}
            disabled={enviando}
            className="w-full py-3.5 rounded-xl font-black text-[15px] flex items-center justify-center gap-2 bg-sp-green text-white disabled:opacity-60"
          >
            {enviando ? t('Enviando...')
              : numItems() === 1 ? t('Pedir {n} item · ${total}', { n: numItems(), total: totalCarrito().toFixed(0) })
              : t('Pedir {n} items · ${total}', { n: numItems(), total: totalCarrito().toFixed(0) })}
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
              <p className="text-sp-gray font-black text-lg">{t('🛒 Tu pedido')}</p>
              {numItems() > 0 && (
                <button onClick={vaciarCarrito} className="text-[13px] font-bold text-gray-400">{t('Vaciar')}</button>
              )}
            </div>
            {/* EDITABLE. Antes esto era una lista de sólo lectura: si te equivocaste de
                artículo no había forma de corregirlo aquí — había que salir, encontrar el
                producto entre 220 del menú y bajarle la cantidad. Ahora cada renglón trae
                sus −/+ y su 🗑, que es lo que se busca cuando ya te diste cuenta del error. */}
            <div className="rounded-xl bg-gray-50 px-3.5 py-2.5 mb-3">
              {itemsCarrito().length === 0 && (
                <p className="text-gray-400 text-[14px] text-center py-3">{t('Tu carrito está vacío.')}</p>
              )}
              {itemsCarrito().map(it => {
                const cerrado = areaCerrada(it.area);
                return (
                  <div key={it.llave} className="py-1.5 border-b border-gray-200 last:border-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sp-gray text-[15px] flex-1">
                        {it.nombre}
                        {it.detalle && <span className="block text-[12px] font-bold text-sp-green-dark">{it.detalle}</span>}
                      </span>
                      <span className="text-gray-500 text-[15px] font-bold">${(it.precio * it.cantidad).toFixed(0)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <button onClick={() => cambiarCantidad(it.llave, -1)} className="w-8 h-8 rounded-full bg-white border border-gray-200 text-sp-gray text-lg font-black flex items-center justify-center">−</button>
                      <span className="text-sp-gray text-[15px] font-black min-w-[18px] text-center">{it.cantidad}</span>
                      <button onClick={() => cambiarCantidad(it.llave, 1)} className="w-8 h-8 rounded-full bg-sp-green text-white text-lg font-black flex items-center justify-center">+</button>
                      <button onClick={() => quitarDelCarrito(it.llave)} className="ml-1 px-2.5 h-8 rounded-full bg-white border border-gray-200 text-[13px] font-bold text-gray-500">{t('🗑 Quitar')}</button>
                      <span className="flex-1" />
                      <span className="text-gray-400 text-[12px]">{t('${precio} c/u', { precio: it.precio })}</span>
                    </div>
                    {cerrado && (
                      <p className="text-[12px] font-bold mt-1" style={{ color: '#9a3412' }}>
                        ⏰ {t('{area} {motivo} — quítalo para poder mandar el pedido', {
                          area: it.area === 'cocina' ? t('La cocina') : it.area === 'barra' ? t('La barra') : t('La tienda'),
                          motivo: motivoCierre(it.area),
                        })}
                      </p>
                    )}
                  </div>
                );
              })}
              <div className="flex justify-between pt-2 mt-1 border-t border-gray-200 font-black text-sp-green-dark">
                <span>{t('Total')}</span><span>${totalCarrito().toFixed(0)}</span>
              </div>
              {/* Lo que se le promete al cliente. Manda el producto más lento del carrito. */}
              <div className="flex justify-between pt-1.5 text-[13px] text-gray-500">
                <span>{t('Listo en aprox.')}</span>
                <span className="font-bold text-sp-gray">{t('{n} min', { n: estimadoMin() })}</span>
              </div>
            </div>
            <button
              onClick={() => setPickUbi(true)}
              className="w-full rounded-xl px-3.5 py-3 mb-3 text-left flex items-center justify-between bg-gray-50 border border-gray-200"
            >
              <span className="text-[15px] font-bold text-sp-gray">
                {esLlevar ? '🥡' : '📍'} {ubicacion ? nombreUbicacion(ubicacion) : t('Falta decir dónde estás')}
                {cuentaAbierta && ubicacion === cuentaAbierta.ubicacion && (
                  <span className="text-[12px] text-sp-green-dark"> · {t('tu cuenta abierta')}</span>
                )}
              </span>
              <span className="text-[12px] font-bold" style={{ color: 'var(--sp-green-dark)' }}>{ubicacion ? t('Cambiar') : t('Elegir')}</span>
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
                <p className="text-[14px] font-bold" style={{ color: '#9a3412' }}>{t('🌙 Cerrado por ahora')}</p>
                <p className="text-[13px] mt-0.5" style={{ color: '#9a3412' }}>
                  {t('Vuelve a abrir cuando abra el club. Si ya estás aquí, pídelo en la barra.')}
                </p>
              </div>
            )}
            {horario && horario.abierto && cerradosEnCarrito.length > 0 && (
              <div className="rounded-xl px-3.5 py-3 mb-3 border" style={{ background: '#fff7ed', borderColor: '#fed7aa' }}>
                <p className="text-[14px] font-bold" style={{ color: '#9a3412' }}>{t('⏰ Hay algo que ya no se puede pedir')}</p>
                <p className="text-[13px] mt-0.5 mb-2" style={{ color: '#9a3412' }}>
                  {t('{lista}. Lo demás sí se puede.', { lista: cerradosEnCarrito.map(i => i.nombre).join(', ') })}
                </p>
                <button
                  onClick={() => cerradosEnCarrito.forEach(i => quitarDelCarrito(i.llave))}
                  className="w-full py-2.5 rounded-xl font-black text-[14px] bg-white border"
                  style={{ borderColor: '#fed7aa', color: '#9a3412' }}
                >{t('Quitarlos y seguir')}</button>
              </div>
            )}
            <button
              onClick={enviarPedido}
              disabled={enviando || !ubicacion || numItems() === 0 || (horario && !horario.abierto) || cerradosEnCarrito.length > 0}
              className={`w-full py-3.5 rounded-xl font-black text-[15px] ${
                (!ubicacion || numItems() === 0 || (horario && !horario.abierto) || cerradosEnCarrito.length > 0) ? 'bg-gray-100 text-gray-400' : 'bg-sp-green text-white'
              }`}
            >
              {enviando ? t('Enviando...')
                : numItems() === 0 ? t('Agrega algo al carrito')
                : (horario && !horario.abierto) ? t('Cerrado por ahora')
                : cerradosEnCarrito.length > 0 ? t('Quita lo que ya cerró')
                : !ubicacion ? t('Elige tu ubicación primero')
                : t('✅ Confirmar pedido')}
            </button>
            <button onClick={() => setConfirmando(false)} className="w-full text-center text-gray-400 text-sm font-semibold mt-3">
              {t('Volver')}
            </button>
          </div>
        </div>
      )}

      {/* 🌮 ELEGIR COMPLEMENTOS — se pregunta ANTES de entrar al carrito (German, 13-oct-2026:
          «al pedir tacos no pregunta tortilla y es indispensable»). Lo obligatorio no deja
          agregar hasta elegirlo; el servidor rechaza igual un pedido sin elegir. */}
      {eligiendo && (() => {
        const it = eligiendo.item;
        const faltan = faltanEnEleccion(eligiendo);
        const extra = it.complementos.reduce((s, g) => s + g.opciones
          .filter(o => (eligiendo.sel[g.id] || []).includes(o.id))
          .reduce((acc, o) => acc + (Number(o.precio_extra) || 0), 0), 0);
        return (
          <div className="fixed inset-0 z-[70] flex items-end" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={() => setEligiendo(null)}>
            <div className="w-full bg-white rounded-t-3xl px-4 pt-5 pb-8" onClick={e => e.stopPropagation()}
              style={{ maxWidth: 448, margin: '0 auto', maxHeight: 'min(85dvh, 85vh)', overflowY: 'auto', overscrollBehavior: 'contain' }}>
              <p className="text-sp-gray font-black text-lg">{it.nombre}</p>
              <p className="text-sp-green-dark font-black text-base mb-3">${it.precio + extra}</p>
              {it.complementos.map(g => {
                const elegidas = eligiendo.sel[g.id] || [];
                const pide = g.min >= 1
                  ? (g.max <= 1 ? t('Elige 1 · obligatorio')
                    : g.min === g.max ? t('Elige {n} · obligatorio', { n: g.max })
                    : t('Elige de {min} a {max} · obligatorio', { min: g.min, max: g.max }))
                  : t('Opcional · hasta {max}', { max: g.max });
                return (
                  <div key={g.id} className="mb-4">
                    <div className="flex items-baseline justify-between mb-2">
                      <p className="text-sp-gray font-black text-[16px]">{g.nombre}</p>
                      <p className={`text-[12px] font-bold ${g.min >= 1 && elegidas.length < g.min ? 'text-[#9a3412]' : 'text-gray-400'}`}>{pide}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {g.opciones.map(o => {
                        const on = elegidas.includes(o.id);
                        return (
                          <button key={o.id} onClick={() => tocarOpcion(g, o)}
                            className={`py-3 px-3 rounded-xl text-[15px] font-bold border text-left ${on ? 'bg-sp-green text-white border-sp-green' : 'bg-white text-sp-gray border-gray-200'}`}>
                            {o.nombre}
                            {o.precio_extra > 0 && <span className={`block text-[12px] ${on ? 'text-white/80' : 'text-gray-400'}`}>+${o.precio_extra}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {/* Cuántas piezas con ESTA elección: «4 tacos de maíz» de un jalón. */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-sp-gray font-black text-[16px]">{t('Cantidad')}</p>
                <div className="flex items-center gap-3">
                  <button onClick={() => setEligiendo(p => ({ ...p, cant: Math.max(1, (p.cant || 1) - 1) }))}
                    className="w-10 h-10 rounded-full bg-gray-100 text-sp-gray text-xl font-black flex items-center justify-center">−</button>
                  <span className="text-sp-gray text-lg font-black min-w-[24px] text-center">{eligiendo.cant || 1}</span>
                  <button onClick={() => setEligiendo(p => ({ ...p, cant: Math.min(50, (p.cant || 1) + 1) }))}
                    className="w-10 h-10 rounded-full bg-sp-green text-white text-xl font-black flex items-center justify-center">+</button>
                </div>
              </div>
              <button onClick={confirmarEleccion} disabled={faltan.length > 0}
                className={`w-full py-3.5 rounded-xl font-black text-[15px] ${faltan.length ? 'bg-gray-100 text-gray-400' : 'bg-sp-green text-white'}`}>
                {faltan.length ? t('Elige {que}', { que: faltan.map(g => g.nombre.toLowerCase()).join(t(' y ')) })
                  : t('Agregar {n} · ${total}', { n: eligiendo.cant || 1, total: (it.precio + extra) * (eligiendo.cant || 1) })}
              </button>
              <button onClick={() => setEligiendo(null)} className="w-full text-center text-gray-400 text-sm font-semibold mt-3">{t('Cancelar')}</button>
            </div>
          </div>
        );
      })()}

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
            <p className="text-sp-gray font-black text-lg text-center mb-1">{t('📍 ¿Dónde estás?')}</p>
            <p className="text-gray-400 text-[13px] text-center mb-4">{t('Te lo llevamos a tu lugar, o lo preparamos para llevar')}</p>

            {/* Va PRIMERO y de ancho completo: si se mezclara en la parrilla quedaría
                escondido entre las canchas y nadie lo encontraría. */}
            <button
              onClick={() => { setUbicacion(PARA_LLEVAR); setPickUbi(false); }}
              className={`w-full py-3.5 rounded-xl text-[15px] font-bold border transition-colors mb-3 ${
                ubicacion === PARA_LLEVAR ? 'bg-sp-green text-white border-sp-green' : 'bg-white text-sp-gray border-gray-200'
              }`}
            >
              🥡 {nombreUbicacion(PARA_LLEVAR)}
              <span className={`block text-[12px] font-semibold ${ubicacion === PARA_LLEVAR ? 'text-white/80' : 'text-gray-400'}`}>
                {t('Paso por él — no hace falta que esté en el club')}
              </span>
            </button>

            <p className="text-gray-400 text-[12px] text-center mb-2.5">{t('o te lo llevamos a…')}</p>
            <div className="grid grid-cols-2 gap-2.5">
              {UBICACIONES.map(u => (
                <button
                  key={u}
                  onClick={() => { setUbicacion(u); setPickUbi(false); }}
                  className={`py-3.5 rounded-xl text-[15px] font-bold border transition-colors ${
                    ubicacion === u ? 'bg-sp-green text-white border-sp-green' : 'bg-white text-sp-gray border-gray-200'
                  }`}
                >
                  {nombreUbicacion(u)}
                </button>
              ))}
            </div>
            <button onClick={() => setPickUbi(false)} className="w-full text-center text-gray-400 text-sm font-semibold mt-4">
              {t('Cancelar')}
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );
}
