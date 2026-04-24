import React, { useEffect, useState } from 'react';

const InstallPWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Já está instalado como PWA?
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    if (isStandalone) return;

    // Usuário já dispensou recentemente?
    const lastDismissed = localStorage.getItem('pwa-dismissed');
    if (lastDismissed && Date.now() - Number(lastDismissed) < 7 * 24 * 60 * 60 * 1000) return;

    // Detecta iOS (Safari não dispara beforeinstallprompt)
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    if (ios) {
      setIsIOS(true);
      setShowBanner(true);
      return;
    }

    // Android / Chrome
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShowBanner(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-dismissed', String(Date.now()));
    setShowBanner(false);
  };

  if (!showBanner || dismissed) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 z-50"
         style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.98) 70%, transparent)' }}>
      <div className="max-w-md mx-auto rounded-2xl p-4"
           style={{ background: 'rgba(13,13,13,0.95)', border: '1px solid rgba(0,242,255,0.25)' }}>

        {isIOS ? (
          // Instrução para iOS (não tem prompt nativo)
          <div>
            <div className="flex items-center gap-2 mb-2">
              <i className="fas fa-mobile-alt" style={{ color: '#00f2ff' }}></i>
              <span className="font-bold text-sm">Instalar no iPhone</span>
            </div>
            <p className="text-xs opacity-70 mb-3">
              Toque em <strong>Compartilhar</strong> <i className="fas fa-share-square"></i> e depois em <strong>"Adicionar à Tela de Início"</strong>
            </p>
            <button onClick={handleDismiss} className="text-xs opacity-50 hover:opacity-100">
              Entendi
            </button>
          </div>
        ) : (
          // Banner padrão Android
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <i className="fas fa-mobile-alt" style={{ color: '#00f2ff' }}></i>
                <p className="font-bold text-sm">Instalar Draft Play</p>
              </div>
              <p className="text-xs opacity-60">Acesso rápido direto da tela inicial</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={handleDismiss}
                      className="px-3 py-2 text-xs opacity-50 hover:opacity-100 transition-opacity">
                Agora não
              </button>
              <button onClick={handleInstall}
                      className="px-4 py-2 rounded-lg font-bold text-xs transition-transform hover:scale-105"
                      style={{ background: '#00f2ff', color: '#000' }}>
                Instalar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstallPWA;
