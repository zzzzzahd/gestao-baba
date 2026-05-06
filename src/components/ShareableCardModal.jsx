// src/components/ShareableCardModal.jsx
// Sprint 9.4: Template 9:16 (Stories) com logo, placar, artilheiros e data.
// html2canvas já carregado via CDN no index.html.
// navigator.share({ files }) para Stories + fallback download.

import React, { useRef, useState } from 'react';
import { X, Download, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';

const ShareableCardModal = ({ isOpen, onClose, rankingType, rankingData, babaName, babaLogo, matchData }) => {
  const cardRef  = useRef();
  const [sharing, setSharing] = useState(false);

  if (!isOpen) return null;

  const topPlayer   = rankingData?.length > 0 ? rankingData[0] : null;
  const today       = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  // Artilheiros (top 3 para o card de partida)
  const topScorers = rankingData?.slice(0, 3) ?? [];

  // ── Captura o card como PNG ───────────────────────────────────────────────
  const captureCard = async () => {
    if (!cardRef.current) throw new Error('Card não encontrado');
    if (!window.html2canvas) throw new Error('html2canvas indisponível');

    const canvas = await window.html2canvas(cardRef.current, {
      useCORS:         true,
      backgroundColor: '#000000',
      scale:           3, // alta resolução para Stories
      logging:         false,
      width:           cardRef.current.offsetWidth,
      height:          cardRef.current.offsetHeight,
    });

    return canvas;
  };

  // ── Compartilhar via navigator.share (Stories) ────────────────────────────
  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    const loadId = toast.loading('Gerando card...');
    try {
      const canvas = await captureCard();

      // Tenta compartilhar como arquivo (suportado no mobile)
      const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
      const file = new File([blob], `DraftPlay_${babaName.replace(/\s+/g, '_')}.png`, { type: 'image/png' });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `${babaName} — Draft Play`,
          text:  'Veja as estatísticas do nosso baba! ⚽',
          files: [file],
        });
        toast.dismiss(loadId);
        toast.success('Compartilhado!');
      } else {
        // Fallback: download
        const url  = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = url; link.download = file.name;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        toast.dismiss(loadId);
        toast.success('Imagem salva! Agora é só postar.');
      }
    } catch (err) {
      toast.dismiss(loadId);
      if (err.name !== 'AbortError') toast.error('Erro ao gerar imagem.');
    } finally {
      setSharing(false);
    }
  };

  // ── Download direto ───────────────────────────────────────────────────────
  const handleDownload = async () => {
    if (sharing) return;
    setSharing(true);
    const loadId = toast.loading('Gerando imagem...');
    try {
      const canvas = await captureCard();
      const url    = canvas.toDataURL('image/png');
      const link   = document.createElement('a');
      link.href = url; link.download = `DraftPlay_${babaName.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      toast.dismiss(loadId);
      toast.success('Imagem salva!');
    } catch (err) {
      toast.dismiss(loadId);
      toast.error('Erro ao gerar imagem. Tente novamente.');
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-xs flex flex-col items-center gap-4">

        {/* Fechar */}
        <div className="flex justify-end w-full">
          <button onClick={onClose} className="bg-white/10 p-2 rounded-full text-white/70 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* ── Card 9:16 ── */}
        <div
          ref={cardRef}
          style={{ width: 320, height: 569 }} // proporção 9:16
          className="relative bg-black rounded-[2rem] overflow-hidden border-[5px] border-cyan-electric shadow-[0_0_60px_rgba(0,242,255,0.25)] flex flex-col"
        >
          {/* Faixa topo */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-cyan-electric shadow-[0_0_20px_#00f2ff]" />

          {/* Fundo decorativo */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-cyan-electric/5 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-cyan-electric/5 rounded-full blur-3xl" />
            {/* Grade sutil */}
            <div className="absolute inset-0 opacity-5"
              style={{ backgroundImage: 'repeating-linear-gradient(0deg,#00f2ff,#00f2ff 1px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,#00f2ff,#00f2ff 1px,transparent 1px,transparent 40px)' }}
            />
          </div>

          {/* Conteúdo */}
          <div className="relative z-10 flex flex-col items-center h-full px-6 pt-8 pb-6 gap-4">

            {/* Label */}
            <p className="text-cyan-electric font-black italic text-[9px] tracking-[0.4em] uppercase">
              {rankingType === 'gols' ? 'ARTILHEIRO DO MÊS' : rankingType === 'assistencias' ? 'GARÇOM DO MÊS' : 'DESTAQUE DO BABA'}
            </p>

            {/* Nome do baba + logo */}
            <div className="flex items-center gap-2">
              {babaLogo && (
                <img src={babaLogo} alt={babaName} className="w-8 h-8 rounded-xl object-cover border border-cyan-electric/30" />
              )}
              <h2 className="text-xl font-black italic text-white uppercase tracking-tighter leading-none">
                {babaName}
              </h2>
            </div>

            {/* Destaque — top player */}
            {topPlayer && (
              <div className="flex flex-col items-center flex-1 justify-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-cyan-electric rounded-full blur-xl opacity-20 animate-pulse" />
                  <div className="w-28 h-28 rounded-full border-4 border-cyan-electric p-1 relative z-10 bg-black">
                    <img
                      src={topPlayer.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(topPlayer.name)}&background=111&color=fff&bold=true`}
                      className="w-full h-full object-cover rounded-full"
                      crossOrigin="anonymous"
                      alt={topPlayer.name}
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-black w-8 h-8 rounded-full flex items-center justify-center border-4 border-black z-20 text-xs font-black">
                    👑
                  </div>
                </div>

                <div className="text-center">
                  <h3 className="text-2xl font-black italic text-white uppercase tracking-tight leading-none">
                    {topPlayer.name}
                  </h3>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <div className="h-[2px] w-6 bg-cyan-electric" />
                    <p className="text-cyan-electric font-black text-base italic uppercase">
                      {topPlayer.total_goals_month ?? topPlayer.total_goals_year ?? topPlayer.count ?? 0}
                      {' '}{rankingType === 'assistencias' ? 'assistências' : 'gols'}
                    </p>
                    <div className="h-[2px] w-6 bg-cyan-electric" />
                  </div>
                </div>
              </div>
            )}

            {/* Top 3 extras (se houver) */}
            {topScorers.length > 1 && (
              <div className="w-full space-y-1.5">
                {topScorers.slice(1).map((p, i) => (
                  <div key={p.id ?? i} className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-1.5">
                    <span className="text-[10px] font-black text-cyan-electric/60 w-4">{i + 2}º</span>
                    <img
                      src={p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=111&color=fff&size=32`}
                      className="w-6 h-6 rounded-full object-cover border border-white/10"
                      crossOrigin="anonymous"
                      alt={p.name}
                    />
                    <span className="flex-1 text-[10px] font-black uppercase text-white/70 truncate">{p.name}</span>
                    <span className="text-[10px] font-black text-cyan-electric">
                      {p.total_goals_month ?? p.total_goals_year ?? p.count ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Rodapé */}
            <div className="mt-auto pt-3 border-t border-white/10 w-full text-center">
              <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] mb-0.5">{today}</p>
              <p className="text-lg font-black italic text-cyan-electric tracking-tighter uppercase">
                DRAFT <span className="text-white">PLAY</span>
              </p>
            </div>
          </div>
        </div>

        {/* Botões */}
        <div className="flex gap-3 w-full">
          <button
            onClick={handleShare}
            disabled={sharing}
            className="flex-1 bg-cyan-electric text-black py-4 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-[0_10px_30px_rgba(0,242,255,0.3)] disabled:opacity-50"
          >
            <Share2 size={16} /> {sharing ? 'Gerando...' : 'Compartilhar'}
          </button>
          <button
            onClick={handleDownload}
            disabled={sharing}
            className="px-5 bg-white/5 border border-white/10 py-4 rounded-2xl font-black text-white/60 hover:text-white transition-all disabled:opacity-50"
          >
            <Download size={16} />
          </button>
        </div>

        <p className="text-center text-[9px] font-bold text-white/20 uppercase tracking-widest">
          Ideal para Stories 9:16
        </p>
      </div>
    </div>
  );
};

export default ShareableCardModal;
