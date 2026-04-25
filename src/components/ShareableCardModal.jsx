import React, { useRef } from 'react';
import { X, Download } from 'lucide-react';
import toast from 'react-hot-toast';

const ShareableCardModal = ({ isOpen, onClose, rankingType, rankingData, babaName }) => {
  const cardRef = useRef();

  if (!isOpen) return null;

  const handleDownloadImage = async () => {
    if (!cardRef.current) {
      toast.error('Erro ao localizar o card.');
      return;
    }

    // SEC fallback: html2canvas carregado via CDN pode não estar disponível offline
    if (!window.html2canvas) {
      toast.error('Recurso indisponível offline. Conecte-se à internet e tente novamente.');
      return;
    }

    try {
      const loadToast = toast.loading('Gerando seu card de craque...');

      const canvas = await window.html2canvas(cardRef.current, {
        useCORS:         true,
        backgroundColor: '#000000',
        scale:           2,
        logging:         false,
      });

      const image = canvas.toDataURL('image/png');
      const link  = document.createElement('a');
      link.href     = image;
      link.download = `Destaque_${babaName.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.dismiss(loadToast);
      toast.success('Imagem salva! Agora é só postar.');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao gerar imagem. Tente novamente.');
    }
  };

  const topPlayer = rankingData?.length > 0 ? rankingData[0] : null;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="w-full max-w-sm">

        <div className="flex justify-end mb-4">
          <button
            onClick={onClose}
            className="bg-white/10 p-2 rounded-full text-white/70 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Card de captura */}
        <div
          ref={cardRef}
          className="bg-black border-[6px] border-cyan-electric p-8 rounded-[3rem] text-center relative overflow-hidden shadow-[0_0_50px_rgba(0,242,255,0.2)]"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-cyan-electric shadow-[0_0_20px_#00f2ff]" />
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-cyan-electric/10 rounded-full blur-3xl" />

          <p className="text-cyan-electric font-black italic text-[10px] tracking-[0.4em] mb-4 uppercase">
            MELHORES DO MOMENTO
          </p>

          <h2 className="text-4xl font-black italic text-white uppercase mb-8 tracking-tighter leading-none">
            {babaName}
          </h2>

          {topPlayer ? (
            <div className="flex flex-col items-center">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-cyan-electric rounded-full blur-xl opacity-20 animate-pulse" />
                <div className="w-36 h-36 rounded-full border-4 border-cyan-electric p-1.5 relative z-10 bg-black">
                  <img
                    src={topPlayer.avatar_url || `https://ui-avatars.com/api/?name=${topPlayer.name}&background=111&color=fff`}
                    className="w-full h-full object-cover rounded-full"
                    alt="Craque"
                  />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-black w-10 h-10 rounded-full flex items-center justify-center border-4 border-black z-20">
                  <i className="fas fa-crown text-xs" />
                </div>
              </div>

              <h3 className="text-3xl font-black italic text-white uppercase mb-1 tracking-tight">
                {topPlayer.name}
              </h3>

              <div className="flex items-center gap-2 mb-8">
                <div className="h-[2px] w-4 bg-cyan-electric" />
                <p className="text-cyan-electric font-black text-lg italic uppercase">
                  {topPlayer.total_goals_month || topPlayer.total_goals_year || topPlayer.count || 0} GOLS
                </p>
                <div className="h-[2px] w-4 bg-cyan-electric" />
              </div>
            </div>
          ) : (
            <p className="text-white/30 font-black italic py-10">SEM DADOS PARA EXIBIR</p>
          )}

          <div className="mt-4 pt-6 border-t border-white/10 relative z-10">
            <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-1">
              Acompanhe as estatísticas no
            </p>
            <p className="text-2xl font-black italic text-cyan-electric tracking-tighter uppercase">
              DRAFT <span className="text-white">BABA</span>
            </p>
          </div>
        </div>

        <button
          onClick={handleDownloadImage}
          className="w-full mt-8 bg-cyan-electric text-black py-5 rounded-[2rem] font-black uppercase text-sm flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-[0_10px_30px_rgba(0,242,255,0.3)]"
        >
          <Download size={20} /> SALVAR E COMPARTILHAR
        </button>

        <p className="text-center mt-4 text-[10px] font-bold text-white/30 uppercase tracking-widest">
          A imagem será salva na sua galeria
        </p>
      </div>
    </div>
  );
};

export default ShareableCardModal;
