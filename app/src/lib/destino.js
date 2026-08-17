// A dónde volver después de iniciar sesión o registrarse.
//
// Por qué existe: las ligas que se comparten (la convocatoria de un torneo, una
// invitación de pareja) apuntan a rutas protegidas. Quien las abre SIN sesión caía en
// /login y, al entrar, aparecía en Inicio: la liga se perdía y había que buscar la
// pantalla a mano. Ahora ProtectedRoute guarda el destino en ?next= y al entrar se
// vuelve ahí.
//
// 🔒 Sólo se aceptan rutas INTERNAS. Un `next` con URL externa (o con `//`, que el
// navegador lee como protocolo relativo) sería un redirect abierto: bastaría mandar
// .../login?next=https://sitio-falso para que la app llevara al socio ahí después de
// teclear su PIN.
export function destinoTrasEntrar(search) {
  try {
    const n = new URLSearchParams(search || '').get('next');
    if (n && n.startsWith('/') && !n.startsWith('//')) return n;
  } catch { /* search malformado → destino por defecto */ }
  return '/home';
}
