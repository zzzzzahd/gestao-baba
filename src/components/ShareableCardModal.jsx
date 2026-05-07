// src/components/ShareableCardModal.jsx
// Sprint 12 fix: dois templates — 'ranking' (artilheiro/garçom/mvp) e 'profile' (stats individuais)
// html2canvas já carregado via CDN no index.html.

import React, { useRef, useState } from 'react';
import { X, Download, Share2, Star } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Label do tipo ─────────────────────────────────────────────────────────────
const TYPE_LABEL = {
  gols:        'ARTILHEIRO DO MÊS',
  assistencias:'GARÇOM DO MÊS',
  mvp:         'DESTAQUE DO BABA',
  profile:     'MEU PERFIL',
};

const TYPE_STAT_LABEL = {
  gols:        'gols',
  assistencias:'assistências',
  mvp:         'G+A',
  profile:     null, // não usa — template diferente
};

// ── Card de RANKING (artilheiro/garçom/mvp) ───────────────────────────────────
const RankingCardContent = ({ rankingType, rankingData, babaName, babaLogo, today }) => {
  const topPlayer  = rankingData?.[0] ?? null;
  const topScorers = rankingData?.slice(0, 3) ?? [];

  return (
    <div className="relative z-10 flex flex-col items-center h-full px-6 pt-8 pb-6 gap-4">
      {/* Label */}
      <p className="text-cyan-electric font-black italic text-[9px] tracking-[0.4em] uppercase">
        {TYPE_LABEL[rankingType] ?? 'DESTAQUE'}
      </p>

      {/* Baba */}
      <div className="flex items-center gap-2">
        {babaLogo && (
          <img src={babaLogo} alt={babaName} className="w-8 h-8 rounded-xl object-cover border border-cyan-electric/30" />
        )}
        <h2 className="text-xl font-black italic text-white uppercase tracking-tighter leading-none">
          {babaName}
        </h2>
      </div>

      {/* Destaque */}
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
                {topPlayer.count ?? 0} {TYPE_STAT_LABEL[rankingType]}
              </p>
              <div className="h-[2px] w-6 bg-cyan-electric" />
            </div>
          </div>
        </div>
      )}

      {/* Top 2 e 3 */}
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
              <span className="text-[10px] font-black text-cyan-electric">{p.count ?? 0}</span>
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
  );
};

// ── Card de PERFIL INDIVIDUAL ─────────────────────────────────────────────────
const ProfileCardContent = ({ profileData, babaName, babaLogo, today }) => {
  const {
    name, avatar_url,
    goals = 0, assists = 0, matches = 0,
    rating = 0, position,
  } = profileData ?? {};

  const POSITION_LABEL = {
    goleiro: 'Goleiro', zagueiro: 'Zagueiro', lateral: 'Lateral',
    meia: 'Meia', atacante: 'Atacante', linha: 'Linha',
    fixo: 'Fixo', ala: 'Ala', pivo: 'Pivô',
  };

  return (
    <div className="relative z-10 flex flex-col items-center h-full px-6 pt-8 pb-6 gap-4">
      {/* Label */}
      <p className="text-cyan-electric font-black italic text-[9px] tracking-[0.4em] uppercase">
        MEU PERFIL
      </p>

      {/* Baba — só exibe se vier do ranking (babaName passado) */}
      {babaName && (
        <div className="flex items-center gap-2">
          {babaLogo && (
            <img src={babaLogo} alt={babaName} className="w-8 h-8 rounded-xl object-cover border border-cyan-electric/30" />
          )}
          <h2 className="text-xl font-black italic text-white uppercase tracking-tighter leading-none">
            {babaName}
          </h2>
        </div>
      )}

      {/* Avatar + nome */}
      <div className="flex flex-col items-center gap-3 flex-1 justify-center">
        <div className="relative">
          <div className="absolute inset-0 bg-cyan-electric rounded-full blur-xl opacity-20 animate-pulse" />
          <div className="w-28 h-28 rounded-full border-4 border-cyan-electric p-1 relative z-10 bg-black">
            <img
              src={avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name ?? 'J')}&background=111&color=fff&bold=true`}
              className="w-full h-full object-cover rounded-full"
              crossOrigin="anonymous"
              alt={name}
            />
          </div>
        </div>

        <div className="text-center">
          <h3 className="text-2xl font-black italic text-white uppercase tracking-tight leading-none">{name}</h3>
          {position && (
            <p className="text-[10px] text-cyan-electric font-black uppercase tracking-widest mt-1">
              {POSITION_LABEL[position] || position}
            </p>
          )}
        </div>

        {/* Rating */}
        {rating > 0 && (
          <div className="flex items-center gap-1.5 bg-white/5 rounded-xl px-4 py-2 border border-cyan-electric/20">
            <Star size={13} className="text-cyan-electric" fill="currentColor" />
            <span className="text-xl font-black font-mono text-white">{Number(rating).toFixed(2)}</span>
            <span className="text-[9px] text-white/40 font-black uppercase">rating</span>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 w-full">
          {[
            { label: 'Gols',    value: goals   },
            { label: 'Assists', value: assists  },
            { label: 'Jogos',   value: matches  },
          ].map(s => (
            <div key={s.label} className="bg-white/5 rounded-xl py-2 text-center border border-white/5">
              <p className="text-xl font-black font-mono text-white">{s.value}</p>
              <p className="text-[8px] text-white/30 font-black uppercase">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Rodapé */}
      <div className="mt-auto pt-3 border-t border-white/10 w-full text-center">
        <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] mb-0.5">{today}</p>
        <p className="text-lg font-black italic text-cyan-electric tracking-tighter uppercase">
          DRAFT <span className="text-white">PLAY</span>
        </p>
      </div>
    </div>
  );
};

// ── Modal principal ───────────────────────────────────────────────────────────
const ShareableCardModal = ({
  isOpen, onClose,
  // Modo ranking
  rankingType, rankingData,
  // Modo perfil individual
  profileData,
  // Comum
  babaName, babaLogo,
}) => {
  const cardRef  = useRef();
  const [sharing, setSharing] = useState(false);

  if (!isOpen) return null;

  const isProfileMode = rankingType === 'profile' || !!profileData;
  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  const captureCard = async () => {
    if (!cardRef.current) throw new Error('Card não encontrado');
    if (!window.html2canvas) throw new Error('html2canvas indisponível');
    return window.html2canvas(cardRef.current, {
      useCORS: true, backgroundColor: '#000000',
      scale: 3, logging: false,
      width: cardRef.current.offsetWidth,
      height: cardRef.current.offsetHeight,
    });
  };

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    const loadId = toast.loading('Gerando card...');
    try {
      const canvas = await captureCard();
      const blob   = await new Promise(res => canvas.toBlob(res, 'image/png'));
      const fname  = `DraftPlay_${(babaName || 'baba').replace(/\s+/g, '_')}.png`;
      const file   = new File([blob], fname, { type: 'image/png' });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: `${babaName} — Draft Play`, text: 'Veja as estatísticas do nosso baba! ⚽', files: [file] });
        toast.dismiss(loadId);
        toast.success('Compartilhado!');
      } else {
        const url  = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = url; link.download = fname;
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

  const handleDownload = async () => {
    if (sharing) return;
    setSharing(true);
    const loadId = toast.loading('Gerando imagem...');
    try {
      const canvas = await captureCard();
      const url    = canvas.toDataURL('image/png');
      const link   = document.createElement('a');
      link.href = url;
      link.download = `DraftPlay_${(babaName || 'baba').replace(/\s+/g, '_')}.png`;
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
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
      <div className="w-full max-w-xs flex flex-col items-center gap-4">

        {/* Fechar */}
        <div className="flex justify-end w-full">
          <button onClick={onClose} className="bg-white/10 p-2 rounded-full text-white/70 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Card 9:16 */}
        <div
          ref={cardRef}
          style={{ width: 320, height: 569 }}
          className="relative bg-black rounded-[2rem] overflow-hidden border-[5px] border-cyan-electric shadow-[0_0_60px_rgba(0,242,255,0.25)] flex flex-col"
        >
          {/* Faixa topo */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-cyan-electric shadow-[0_0_20px_#00f2ff]" />

          {/* Fundo decorativo */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-cyan-electric/5 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-cyan-electric/5 rounded-full blur-3xl" />
            <div className="absolute inset-0 opacity-5"
              style={{ backgroundImage: 'repeating-linear-gradient(0deg,#00f2ff,#00f2ff 1px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,#00f2ff,#00f2ff 1px,transparent 1px,transparent 40px)' }}
            />
          </div>

          {/* Conteúdo — troca conforme o modo */}
          {isProfileMode ? (
            <ProfileCardContent
              profileData={profileData}
              babaName={babaName}
              babaLogo={babaLogo}
              today={today}
            />
          ) : (
            <RankingCardContent
              rankingType={rankingType}
              rankingData={rankingData}
              babaName={babaName}
              babaLogo={babaLogo}
              today={today}
            />
          )}
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
