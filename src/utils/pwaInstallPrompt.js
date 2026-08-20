// src/utils/pwaInstallPrompt.js
// Módulo central pro evento beforeinstallprompt — captura uma vez só,
// deixa qualquer componente (banner automático, modal da Home) escutar/usar
// o mesmo deferredPrompt sem duplicar listeners.

let deferredPrompt = null;
const listeners = new Set();

const notify = () => listeners.forEach((cb) => cb(deferredPrompt));

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    notify();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notify();
  });
}

export const getDeferredPrompt = () => deferredPrompt;

export const onDeferredPromptChange = (callback) => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};

export const isIOSDevice = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;

export const isStandalonePWA = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;
