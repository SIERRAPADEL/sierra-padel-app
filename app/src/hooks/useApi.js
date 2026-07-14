import { useCallback } from 'react';

const BASE = 'https://sierra-padel-backend-production-a55f.up.railway.app/api';

export function useApi() {
  // apiFetch debe tener IDENTIDAD ESTABLE: varias pantallas lo usan como dependencia de
  // useCallback/useEffect (p.ej. Torneos `load`). Sin memoizar, cada render creaba un
  // apiFetch nuevo → el efecto se re-disparaba sin fin (bucle: spinner infinito + API
  // machacada ~7 req/s). useCallback([]) lo estabiliza. Solo lee localStorage, sin deps.
  const apiFetch = useCallback(async (path, options = {}) => {
    const token = localStorage.getItem('sp_token');
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
  }, []);

  return { apiFetch };
}
