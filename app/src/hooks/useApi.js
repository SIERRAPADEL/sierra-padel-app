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
