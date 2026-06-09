const BASE = 'https://sierra-padel-backend-production-a55f.up.railway.app/api';

export function useApi() {
  function getToken() {
    return localStorage.getItem('sp_token');
  }

  async function apiFetch(path, options = {}) {
    const token = getToken();
    try {
      const res = await fetch(`${BASE}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers,
        },
      });
      // Token expirado/inválido: si habíamos enviado token y el server responde 401,
      // la sesión ya no sirve → cerrarla y recargar para volver al login (antes la app
      // quedaba en limbo: toda llamada fallaba pero seguía "logueada").
      if (res.status === 401 && token) {
        localStorage.removeItem('sp_token');
        localStorage.removeItem('sp_user');
        if (typeof window !== 'undefined') window.location.reload();
        return { ok: false, error: 'Tu sesión expiró. Inicia sesión de nuevo.' };
      }
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        return { ok: false, error: `Error del servidor (${res.status})` };
      }
    } catch {
      return { ok: false, error: 'Sin conexion. Verifica tu internet.' };
    }
  }

  return { apiFetch };
}
