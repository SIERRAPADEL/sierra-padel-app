import { createContext, useContext, useState, useEffect } from 'react';

const API = 'https://sierra-padel-backend-production-a55f.up.railway.app/api';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('sp_token');
    const stored = localStorage.getItem('sp_user');
    if (token && stored) {
      setUser(JSON.parse(stored));
    }
    setLoading(false);
  }, []);

  async function login(telefono, pin) {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telefono, pin }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    localStorage.setItem('sp_token', data.data.token);
    localStorage.setItem('sp_user', JSON.stringify(data.data.cliente));
    setUser(data.data.cliente);
    return data.data;
  }

  async function registro(nombre, telefono, pin) {
    const res = await fetch(`${API}/auth/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, telefono, pin }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    localStorage.setItem('sp_token', data.data.token);
    localStorage.setItem('sp_user', JSON.stringify(data.data.cliente));
    setUser(data.data.cliente);
    return data.data;
  }

  // Adopta una sesión ya emitida por el backend (p.ej. tras recuperar PIN con OTP):
  // guarda token+cliente y actualiza el contexto para que las rutas protegidas entren sin recargar.
  function adoptarSesion(token, cliente) {
    localStorage.setItem('sp_token', token);
    localStorage.setItem('sp_user', JSON.stringify(cliente));
    setUser(cliente);
  }

  function logout() {
    localStorage.removeItem('sp_token');
    localStorage.removeItem('sp_user');
    setUser(null);
  }

  function getToken() {
    return localStorage.getItem('sp_token');
  }

  function updateUser(newData) {
    const updated = { ...user, ...newData };
    localStorage.setItem('sp_user', JSON.stringify(updated));
    setUser(updated);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, registro, logout, getToken, updateUser, adoptarSesion }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
