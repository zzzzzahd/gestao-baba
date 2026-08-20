// src/components/InstallAppModal.jsx
// Modal de instalação acionado pelo card da Home — Android instala direto
// (usa o deferredPrompt central), iOS mostra passo a passo (Safari não
// expõe instalação automática).

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Share, PlusSquare, Download, Smartphone } from 'lucide-react';
import {
  getDeferredPrompt,
  onDeferredPromptChange,
  isIOSDevice,
} from '../utils/pwaInstallPrompt';

const InstallAppModal = ({ open, onClose, onInstalled }) => {
  const [deferredPrompt, setDeferredPrompt] = useState(getDeferredPrompt());
  const [isIOS] = useState(isIOSDevice());
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (!open) return;
    return onDeferredPromptChange(setDeferredPrompt);
  }, [open]);

  if (!open) return null;

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setInstalling(false);
    if (outcome === 'accepted') {
      onInstalled?.();
      onClose();
    }
  };

  return createPortal(
    <>
      <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[90] max-w-sm mx-auto bg-surface-1 border border-cyan-electric/30 rounded-3xl p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-text-low hover:text-white transition-colors"
          aria-label="Fechar"
        >
          <X size={16} />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-cyan-electric/10 border border-cyan-electric/20 flex items-center justify-center mb-4">
          <Smartphone size={22} className="text-cyan-electric" />
        </div>

        <h2 className="text-lg font-black uppercase italic tracking-tight text-white mb-1">
          Instalar Draft Play
        </h2>
        <p className="text-xs text-text-low mb-5 leading-relaxed">
          Acesso rápido direto da tela inicial, sem precisar abrir o navegador.
        </p>

        {isIOS ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface-2 border border-border-subtle">
              <span className="w-6 h-6 rounded-full bg-cyan-electric/10 text-cyan-electric text-[11px] font-black flex items-center justify-center shrink-0">
                1
              </span>
              <p className="text-xs text-text-mid">
                Toque no ícone de{' '}
                <Share size={12} className="inline -mt-0.5 text-cyan-electric" />{' '}
                <strong className="text-white">Compartilhar</strong>, na barra do Safari
              </p>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface-2 border border-border-subtle">
              <span className="w-6 h-6 rounded-full bg-cyan-electric/10 text-cyan-electric text-[11px] font-black flex items-center justify-center shrink-0">
                2
              </span>
              <p className="text-xs text-text-mid">
                Role e toque em{' '}
                <PlusSquare size={12} className="inline -mt-0.5 text-cyan-electric" />{' '}
                <strong className="text-white">"Adicionar à Tela de Início"</strong>
              </p>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface-2 border border-border-subtle">
              <span className="w-6 h-6 rounded-full bg-cyan-electric/10 text-cyan-electric text-[11px] font-black flex items-center justify-center shrink-0">
                3
              </span>
              <p className="text-xs text-text-mid">
                Toque em <strong className="text-white">"Adicionar"</strong> no canto superior
              </p>
            </div>
            <p className="text-[10px] text-text-muted mt-2">
              Precisa ser pelo Safari — outros navegadores no iPhone não têm essa opção.
            </p>
          </div>
        ) : deferredPrompt ? (
          <button
            onClick={handleInstall}
            disabled={installing}
            className="w-full py-4 rounded-2xl font-black text-black uppercase text-sm tracking-widest flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg, #00f2ff, #0066ff)' }}
          >
            <Download size={18} />
            {installing ? 'Instalando...' : 'Instalar agora'}
          </button>
        ) : (
          <p className="text-xs text-text-low leading-relaxed">
            Seu navegador ainda não liberou a instalação automática. Abra o menu do navegador
            e procure por "Instalar app" ou "Adicionar à tela inicial".
          </p>
        )}
      </div>
    </>,
    document.body,
  );
};

export default InstallAppModal;
