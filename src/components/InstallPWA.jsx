import React, { useEffect, useState } from 'react';

const InstallPWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

  useEffect(() => {
    // Verifica se já está instalado
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                  window.navigator.standalone === true;
    
    if (isPWA) {
      setShowInstallButton(false);
      return;
    }

    // Escuta o evento de instalação
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('✅ Usuário aceitou instalar o PWA');
      setShowInstallButton(false);
    } else {
      console.log('❌ Usuário recusou instalar o PWA');
    }
    
    setDeferredPrompt(null);
  };

  if (!showInstallButton) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-cyber-dark to-transparent z-50 animate-slide-up">
      <div className="max-w-md mx-auto card-glass p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <i className="fas fa-mobile-alt text-cyan-electric"></i>
              <p className="font-bold text-sm">Instalar App</p>
            </div>
            <p className="text-xs opacity-60">
              Adicione à tela inicial para acesso rápido
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowInstallButton(false)}
              className="px-4 py-2 text-sm opacity-60 hover:opacity-100 transition-opacity"
            >
              Agora não
            </button>
            <button
              onClick={handleInstallClick}
              className="px-4 py-2 bg-cyan-electric text-black rounded-lg font-bold text-sm hover:scale-105 transition-transform"
            >
              Instalar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstallPWA;
