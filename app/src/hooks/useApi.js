const BASE = 'https://sierra-padel-backend-production-a55f.up.railway.app/api';

export function useApi() {
  function getToken() {
    return localStorage.getItem('sp_token');
  }

  async function apiFetch(path, options = {}) {
    const token = getToken();
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    return res.json();
  }

  return { apiFetch };
}
