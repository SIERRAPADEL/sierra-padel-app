/**
 * NotificationSetup
 *
 * Se muestra SOLO cuando:
 *  - El usuario esta autenticado
 *  - La app esta instalada como PWA (modo standalone)
 *  - El navegador soporta Push API
 *  - El permiso no ha sido otorgado ni denegado todavia
 *
 * Flujos cubiertos:
 *  A) Permiso 'default'  → mostrar card explicativa → pedir permiso con boton (gesture requerido)
 *  B) Permiso 'granted'  → suscribir silenciosamente si no hay suscripcion activa
 *  C) Permiso 'denied'   → no molestar, no mostrar nada
 *  D) Suscripcion expirada → renovar silenciosamente en cada login
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';

// Clave publica VAPID (definida en .env como VITE_VAPID_PUBLIC_KEY)
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

// Convierte la clave VAPID de base64url a Uint8Array (requerido por pushManager.subscribe)
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

// ¿El entorno soporta push notifications?
function isPushSupported() {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    Boolean(VAPID_PUBLIC_KEY)
  );
}

// ¿Esta corriendo como PWA instalada?
function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

// ─── Hook: logica de suscripcion ─────────────────────────────────────────────
function usePushSubscription(apiFetch) {
  const [subscribing, setSubscribing] = useState(false);
  const [error, setError] = useState(null);

  const subscribe = useCallback(async () => {
    if (!isPushSupported()) return false;
    setSubscribing(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;

      // Obtener o crear la suscripcion push
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      // Guardar en backend
      const result = await apiFetch('/auth/push-subscription', {
        method: 'POST',
        body: JSON.stringify(sub.toJSON()),
      });

      if (!result.ok) {
        setError(result.error || 'No se pudo guardar la suscripcion.');
        return false;
      }

      // Marcar en localStorage para no volver a preguntar
      localStorage.setItem('pushSubscribed', '1');
      return true;
    } catch (err) {
      // Si el usuario denego el permiso en el dialog del sistema
      if (err.name === 'NotAllowedError') {
        setError('denied');
      } else {
        setError(err.message || 'Error al activar notificaciones.');
      }
      return false;
    } finally {
      setSubscribing(false);
    }
  }, [apiFetch]);

  return { subscribe, subscribing, error };
}

// ─── UI: Card de permiso ──────────────────────────────────────────────────────
function PermissionCard({ onAllow, onDismiss, loading, error }) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 88,
        left: 16,
        right: 16,
        zIndex: 9997,
        background: 'white',
        borderRadius: 18,
        padding: '20px 18px 16px',
        boxShadow: '0 6px 32px rgba(0,0,0,0.14)',
        border: '1px solid #e5e7eb',
        maxWidth: 420,
        margin: '0 auto',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 13,
            background: '#96C800',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            flexShrink: 0,
          }}
        >
          🔔
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#111', lineHeight: 1.3 }}>
            Activa las notificaciones
          </div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
            Para no perderte nada de Sierra Padel
          </div>
        </div>
      </div>

      {/* Beneficios */}
      <div
        style={{
          background: '#f9fafb',
          borderRadius: 12,
          padding: '10px 13px',
          marginBottom: 14,
        }}
      >
        {[
          { icon: '📅', text: 'Confirmacion de reservas al instante' },
          { icon: '🏆', text: 'Actualizaciones de tus torneos' },
          { icon: '⭐', text: 'Puntos acumulados y promociones' },
        ].map(({ icon, text }) => (
          <div
            key={text}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 12, color: '#444' }}
          >
            <span style={{ fontSize: 15 }}>{icon}</span>
            <span>{text}</span>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && error !== 'denied' && (
        <div
          style={{
            background: '#fff3f3',
            border: '1px solid #fca5a5',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 12,
            color: '#dc2626',
            marginBottom: 10,
          }}
        >
          {error}
        </div>
      )}

      {/* Botones */}
      <button
        onClick={onAllow}
        disabled={loading}
        style={{
          width: '100%',
          background: loading ? '#c8e87a' : '#96C800',
          color: '#111',
          border: 'none',
          borderRadius: 12,
          padding: '13px',
          fontWeight: 700,
          fontSize: 15,
          cursor: loading ? 'default' : 'pointer',
          fontFamily: 'inherit',
          transition: 'background 0.2s',
        }}
      >
        {loading ? 'Activando...' : 'Activar notificaciones'}
      </button>
      <button
        onClick={onDismiss}
        disabled={loading}
        style={{
          width: '100%',
          background: 'transparent',
          color: '#888',
          border: 'none',
          borderRadius: 12,
          padding: '10px',
          fontWeight: 500,
          fontSize: 13,
          cursor: 'pointer',
          fontFamily: 'inherit',
          marginTop: 4,
        }}
      >
        Ahora no
      </button>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function NotificationSetup() {
  const { user } = useAuth();
  const { apiFetch } = useApi();
  const { subscribe, subscribing, error } = usePushSubscription(apiFetch);

  const [showCard, setShowCard] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!user || done) return;
    if (!isPushSupported()) return;
    if (!isStandalone()) return; // Solo en app instalada

    const permission = Notification.permission;

    // Permiso denegado → no insistir nunca
    if (permission === 'denied') return;

    // Permiso ya otorgado → intentar suscribir silenciosamente (renovacion)
    if (permission === 'granted') {
      const alreadySaved = localStorage.getItem('pushSubscribed');
      if (!alreadySaved) {
        subscribe().then((ok) => {
          if (ok) setDone(true);
        });
      } else {
        setDone(true);
      }
      return;
    }

    // Permiso 'default' → verificar si el usuario ya descarto el card
    const dismissed = localStorage.getItem('notifCard_dismissed');
    if (dismissed) return;

    // Mostrar el card despues de 3 segundos (dejar que la app cargue primero)
    const timer = setTimeout(() => setShowCard(true), 3000);
    return () => clearTimeout(timer);
  }, [user, done, subscribe]);

  // Escuchar mensaje del SW para navegar (cuando se hace click en una notificacion)
  useEffect(() => {
    function handleSwMessage(event) {
      if (event.data?.type === 'SW_NAVIGATE' && event.data?.url) {
        window.location.href = event.data.url;
      }
    }
    navigator.serviceWorker?.addEventListener('message', handleSwMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', handleSwMessage);
  }, []);

  async function handleAllow() {
    const ok = await subscribe();
    if (ok) {
      setShowCard(false);
      setDone(true);
    }
    // Si ok=false y error='denied', el usuario toco "Bloquear" en el dialog del sistema
    // El card se cierra solo porque el error queda en estado y podemos descartarlo
    if (error === 'denied') {
      setShowCard(false);
    }
  }

  function handleDismiss() {
    localStorage.setItem('notifCard_dismissed', '1');
    setShowCard(false);
  }

  if (!showCard || done) return null;

  return (
    <PermissionCard
      onAllow={handleAllow}
      onDismiss={handleDismiss}
      loading={subscribing}
      error={error}
    />
  );
}
