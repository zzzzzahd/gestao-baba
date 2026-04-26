import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, RefreshCw, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';

// QRCodeModal — gera QR Code do link de convite do baba
// O QR aponta para a URL do app com ?code=XXXXXX
// Ao abrir, o HomePage detecta o param e pré-preenche o campo

const QRCodeModal = ({ isOpen, onClose, inviteCode, babaName, onRefresh }) => {
  const [refreshing, setRefreshing] = useState(false);

  if (!isOpen) return null;

  // URL que o QR vai codificar
  const inviteUrl = inviteCode
    ? `${window.location.origin}/home?code=${inviteCode}`
    : null;

  const handleCopyLink = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    toast.success('Link copiado!');
  };

  const handleCopyCode = () => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode);
    toast.success('Código copiado!');
  };

  const handleShare = async () => {
    if (!inviteUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Entra no meu baba: ${babaName}`,
          text:  `Usa o código ${inviteCode} ou o link abaixo para entrar no Draft Play!`,
          url:   inviteUrl,
        });
      } catch { /* usuário cancelou */ }
    } else {
      handleCopyLink();
    }
  };

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    await onRefresh?.();
    setRefreshing(false);
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/95 backdrop-blur-xl p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl space-y-6"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black uppercase italic tracking-tighter">Convite QR</h3>
            <p className="text-[10px] text-white/30 uppercase font-black">{babaName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white/5 rounded-xl text-white/40 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* QR Code */}
        {inviteCode ? (
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-white rounded-[1.5rem] shadow-[0_0_40px_rgba(0,242,255,0.15)]">
              <QRCodeSVG
                value={inviteUrl}
                size={200}
                bgColor="#ffffff"
                fgColor="#000000"
                level="M"
              />
            </div>

            {/* Código em texto */}
            <div className="w-full bg-black/60 border border-cyan-electric/20 rounded-2xl p-4 text-center">
              <p className="text-[9px] text-white/30 uppercase font-black tracking-widest mb-1">Código</p>
              <p className="text-3xl font-black tracking-[0.4em] text-cyan-electric">{inviteCode}</p>
            </div>

            <p className="text-[9px] text-white/20 text-center leading-relaxed px-2">
              Mostre o QR Code ou compartilhe o código. Válido por tempo limitado.
            </p>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-white/20 font-black uppercase text-sm">Nenhum código ativo</p>
            <p className="text-white/10 text-[10px] mt-1">Gere um código primeiro</p>
          </div>
        )}

        {/* Ações */}
        <div className="space-y-3">
          <button
            onClick={handleShare}
            className="w-full py-4 bg-cyan-electric text-black rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-cyan-electric/20"
          >
            <Share2 size={16} /> Compartilhar
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleCopyCode}
              className="py-3 bg-white/5 border border-white/10 rounded-2xl font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
            >
              <Copy size={14} /> Código
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="py-3 bg-white/5 border border-white/10 rounded-2xl font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-2 hover:bg-white/10 transition-colors disabled:opacity-40"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              Renovar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeModal;
