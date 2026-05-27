import { useState, useEffect } from 'react';

function getContext() {
  const ua = navigator.userAgent || '';
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  const isAndroid = /Android/.test(ua);
  const isWebView =
    /FBAN|FBAV|Instagram|Line\/|KAKAOTALK|MicroMessenger/.test(ua) ||
    (isAndroid && /; wv\)/.test(ua)) ||
    (isIOS && /WhatsApp/.test(ua));
  const isIOSChrome = isIOS && /CriOS/.test(ua);
  const isIOSSafari = isIOS && !isIOSChrome && !isWebView && /Safari/.test(ua);
  const isAndroidChrome = isAndroid && /Chrome/.test(ua) && !isWebView;
  return { isStandalone, isIOS, isAndroid, isWebView, isIOSChrome, isIOSSafari, isAndroidChrome };
}

const styles = {
  banner: { position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, background: '#1a1a1a', color: 'white', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.4)' },
  card: { position: 'fixed', bottom: 80, left: 16, right: 16, zIndex: 9998, background: 'white', borderRadius: 18, padding: '18px 18px 16px', boxShadow: '0 6px 32px rgba(0,0,0,0.14)', border: '1px solid #e5e7eb', maxWidth: 420, margin: '0 auto' },
  btnGreen: { width: '100%', marginTop: 14, background: '#96C800', color: '#111', border: 'none', borderRadius: 12, padding: '13px', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' },
  btnOutline: { width: '100%', marginTop: 8, background: 'transparent', color: '#666', border: 'none', borderRadius: 12, padding: '10px', fontWeight: 500, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
  steps: { marginTop: 14, background: '#f8f8f8', borderRadius: 12, padding: '12px 14px', lineHeight: 1.7, fontSize: 13, color: '#444' },
};

function WebViewBanner({ isAndroid }) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  function handleOpen() {
    if (isAndroid) {
      const url = window.location.href;
      const encoded = encodeURIComponent(url);
      window.location.href = `intent://${window.location.host}${window.location.pathname}${window.location.search}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encoded};end`;
    } else {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(window.location.href).then(() => { alert('Link copiado. Pégalo en Safari para instalar la app.'); });
      } else {
        alert(`Copia este link en Safari:\n${window.location.href}`);
      }
    }
  }
  return (
    <div style={styles.banner}>
      <span style={{ fontSize: 22 }}>⚠️</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>Abre en {isAndroid ? 'Chrome' : 'Safari'}</div>
        <div style={{ fontSize: 11, color: '#bbb', marginTop: 1 }}>Para instalar la app y recibir notificaciones</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
        <button onClick={handleOpen} style={{ background: '#96C800', color: '#111', border: 'none', borderRadius: 8, padding: '7px 13px', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
          {isAndroid ? 'Abrir en Chrome' : 'Copiar link'}
        </button>
        <button onClick={() => setVisible(false)} style={{ background: 'none', border: 'none', color: '#888', fontSize: 11, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>Ignorar</button>
      </div>
    </div>
  );
}

function IOSChromCard({ onDismiss }) {
  return (
    <div style={styles.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#96C800', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🎾</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#111' }}>Instala Sierra Pádel</div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>Recibe notificaciones de reservas y torneos</div>
          </div>
        </div>
        <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: 20, padding: 4, lineHeight: 1 }}>✕</button>
      </div>
      <div style={styles.steps}>
        <strong style={{ color: '#333', fontSize: 12 }}>Solo Safari puede instalar la app en iPhone:</strong>
        <div style={{ marginTop: 6 }}>1️⃣ Toca <strong>···</strong> arriba → <strong>"Abrir en Safari"</strong></div>
        <div>2️⃣ En Safari: toca <strong>Compartir</strong> (□↑)</div>
        <div>3️⃣ Selecciona <strong>"Añadir a pantalla de inicio"</strong></div>
      </div>
      <button onClick={onDismiss} style={styles.btnOutline}>Ahora no</button>
    </div>
  );
}

function IOSSafariCard({ onDismiss }) {
  return (
    <div style={styles.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#96C800', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🎾</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#111' }}>Instala la app en tu iPhone</div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>Acceso rápido y notificaciones de torneos</div>
          </div>
        </div>
        <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: 20, padding: 4, lineHeight: 1 }}>✕</button>
      </div>
      <div style={styles.steps}>
        <div>1️⃣ Toca el botón <strong>Compartir</strong> <span style={{ fontSize: 15 }}>□↑</span> en la barra inferior de Safari</div>
        <div>2️⃣ Baja y selecciona <strong>"Añadir a pantalla de inicio"</strong></div>
        <div>3️⃣ Toca <strong>"Agregar"</strong> — listo 🎉</div>
      </div>
      <div style={{ marginTop: 10, fontSize: 11, color: '#999', textAlign: 'center' }}>Necesitas iOS 16.4 o superior para recibir notificaciones</div>
      <button onClick={onDismiss} style={styles.btnOutline}>Ahora no</button>
    </div>
  );
}

function AndroidInstallCard({ prompt, onDismiss, onInstalled }) {
  async function handleInstall() {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') { onInstalled(); } else { onDismiss(); }
  }
  return (
    <div style={styles.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#96C800', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🎾</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#111' }}>Instala Sierra Pádel</div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>Notificaciones de reservas, torneos y puntos</div>
          </div>
        </div>
        <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: 20, padding: 4, lineHeight: 1 }}>✕</button>
      </div>
      <ul style={{ margin: '12px 0 0', paddingLeft: 18, fontSize: 12, color: '#555', lineHeight: 1.8 }}>
        <li>Acceso desde tu pantalla de inicio</li>
        <li>Notificaciones aunque tengas la app cerrada</li>
        <li>No ocupa espacio en tu teléfono</li>
      </ul>
      <button onClick={handleInstall} style={styles.btnGreen}>Instalar app gratis</button>
      <button onClick={onDismiss} style={styles.btnOutline}>Ahora no</button>
    </div>
  );
}

function AndroidOtherBrowserCard({ onDismiss }) {
  return (
    <div style={styles.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#96C800', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🎾</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#111' }}>Instala la app en tu Android</div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>Abre este link en Chrome para instalarla</div>
          </div>
        </div>
        <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: 20, padding: 4, lineHeight: 1 }}>✕</button>
      </div>
      <div style={styles.steps}>
        <div>1️⃣ Abre <strong>Google Chrome</strong> en tu teléfono</div>
        <div>2️⃣ Entra a <strong style={{ color: '#96C800' }}>sierra-padel-app.vercel.app</strong></div>
        <div>3️⃣ Toca el menú <strong>⋮</strong> → <strong>"Instalar app"</strong></div>
      </div>
      <button onClick={onDismiss} style={styles.btnOutline}>Ahora no</button>
    </div>
  );
}

export default function InstallGuide() {
  const [ctx] = useState(() => getContext());
  const [installPrompt, setInstallPrompt] = useState(window.__installPrompt || null);
  const [dismissed, setDismissed] = useState(() => {
    const ts = localStorage.getItem('installGuide_dismissed');
    if (!ts) return false;
    return Date.now() - parseInt(ts) < 5 * 24 * 60 * 60 * 1000;
  });
  const [installed, setInstalled] = useState(ctx.isStandalone || window.__appInstalled === true);

  useEffect(() => {
    function onPromptReady() { setInstallPrompt(window.__installPrompt); }
    function onInstalled() { setInstalled(true); }
    window.addEventListener('installpromptready', onPromptReady);
    window.addEventListener('appinstalled_confirmed', onInstalled);
    return () => {
      window.removeEventListener('installpromptready', onPromptReady);
      window.removeEventListener('appinstalled_confirmed', onInstalled);
    };
  }, []);

  if (installed) return null;
  if (dismissed) return null;

  function dismiss() {
    localStorage.setItem('installGuide_dismissed', Date.now().toString());
    setDismissed(true);
  }

  if (ctx.isWebView) return <WebViewBanner isAndroid={ctx.isAndroid} />;
  if (ctx.isIOSChrome) return <IOSChromCard onDismiss={dismiss} />;
  if (ctx.isIOSSafari) return <IOSSafariCard onDismiss={dismiss} />;
  if (ctx.isAndroid && installPrompt) return <AndroidInstallCard prompt={installPrompt} onDismiss={dismiss} onInstalled={() => setInstalled(true)} />;
  if (ctx.isAndroid && !ctx.isWebView) return <AndroidOtherBrowserCard onDismiss={dismiss} />;
  return null;
}
