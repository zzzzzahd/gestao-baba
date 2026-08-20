// src/components/InstallPWA.jsx
// Prompt de instalação do PWA (Android: beforeinstallprompt / iOS: instrução manual).

import React, { useEffect, useState } from 'react';
import { Smartphone, Share, X, Download } from 'lucide-react';
import {
  getDeferredPrompt,
  onDeferredPromptChange,
  isIOSDevice,
  isStandalonePWA,
} from '../utils/pwaInstallPrompt';

const DISMISSED_KEY   = 'pwa-dismissed';
const DISMISS_DAYS    = 7;

const InstallPWA = ({ hidden = false }) => {
  const [deferredPrompt, setDeferredPrompt] = useState(getDeferredPrompt());
  const [showBanner,     setShowBanner]     = useState(false);
  const [isIOS,          setIsIOS]          = useState(false);

  useEffect(() => {
    // Já está instalado como PWA?
    if (isStandalonePWA()) return;

    // Usuário já dispensou recentemente?
    const lastDismissed = localStorage.getItem(DISMISSED_KEY);
    if (lastDismissed && Date.now() - Number(lastDismissed) < DISMISS_DAYS * 24 * 60 * 60 * 1000) return;

    // Detecta iOS (Safari não dispara beforeinstallprompt)
    if (isIOSDevice()) {
      setIsIOS(true);
      setShowBanner(true);
      return;
    }

    // Android / Chrome — usa o deferredPrompt já capturado pelo módulo central
    const existing = getDeferredPrompt();
    if (existing) {
      setDeferredPrompt(existing);
      setShowBanner(true);
    }

    return onDeferredPromptChange((prompt) => {
      setDeferredPrompt(prompt);
      setShowBanner(!!prompt);
    });
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShowBanner(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setShowBanner(false);
  };

  if (!showBanner || hidden) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 animate-slide-up">
      <div className="max-w-sm mx-auto bg-surface-1 border border-cyan-electric/30 rounded-2xl p-4 shadow-2xl shadow-cyan-500/10 backdrop-blur-md relative">

        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1 rounded-lg text-text-low hover:text-white transition-colors"
        >
          <X size={14} />
        </button>

        {isIOS ? (
          // Instrução para iOS (não tem prompt nativo)
          <div className="flex items-start gap-3 pr-6">
            <div className="w-10 h-10 rounded-xl bg-cyan-electric/10 border border-cyan-electric/20 flex items-center justify-center flex-shrink-0">
              <Smartphone size={18} className="text-cyan-electric" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black uppercase tracking-widest text-white mb-0.5">
                Instalar no iPhone
              </p>
              <p className="text-[10px] text-text-low leading-relaxed">
                Toque em <Share size={10} className="inline -mt-0.5 text-cyan-electric" /> <strong className="text-white">Compartilhar</strong> e depois em <strong className="text-white">"Adicionar à Tela de Início"</strong>
              </p>
              <button
                onClick={handleDismiss}
                className="mt-3 w-full py-2 text-[10px] font-black uppercase tracking-widest rounded-xl border border-border-mid text-text-low hover:text-white hover:border-border-high transition-all"
              >
                Entendi
              </button>
            </div>
          </div>
        ) : (
          // Banner padrão Android
          <div className="flex items-start gap-3 pr-6">
            <div className="w-10 h-10 rounded-xl bg-cyan-electric/10 border border-cyan-electric/20 flex items-center justify-center flex-shrink-0">
              <Smartphone size={18} className="text-cyan-electric" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black uppercase tracking-widest text-white mb-0.5">
                Instalar Draft Play
              </p>
              <p className="text-[10px] text-text-low leading-relaxed">
                Acesso rápido direto da tela inicial, sem precisar abrir o navegador.
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleDismiss}
                  className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl border border-border-mid text-text-low hover:text-white hover:border-border-high transition-all"
                >
                  Agora não
                </button>
                <button
                  onClick={handleInstall}
                  className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl bg-cyan-electric text-black hover:bg-cyan-400 transition-all flex items-center justify-center gap-1.5"
                >
                  <Download size={12} />
                  Instalar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstallPWA;
