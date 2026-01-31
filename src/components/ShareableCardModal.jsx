import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import { Share2, X, Download } from 'lucide-react';
import toast from 'react-hot-toast';

const ShareableCardModal = ({ isOpen, onClose, rankingType, rankingData, babaName }) => {
  const cardRef = useRef();

  if (!isOpen) return null;

  const handleDownloadImage = async () => {
    if (!cardRef.current) return;
    try {
      const loadToast = toast.loading("Gerando imagem...");
      
      const canvas = await html2canvas(cardRef.current, {
        useCORS: true,
        backgroundColor: '#000000',
        scale: 2, // Alta qualidade
      });

      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `Destaque_${babaName}.png`;
      link.click();
      
      toast.dismiss(loadToast);
      toast.success("Pronto para postar!");
    } catch (error) {
      toast.error("Erro ao gerar imagem");
    }
  };

  const topPlayer = rankingData[0];

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-end mb-2">
          <button onClick={onClose} className="text-white/50"><X size={24}/></button>
        </div>

        {/* CARD QUE SERÁ TRANSFORMADO EM IMAGEM */}
        <div ref={cardRef} className="bg-black border-4 border-cyan-electric p-6 rounded-[40px] text-center relative overflow-hidden">
          {/* Decoração de Fundo */}
          <div className="absolute top-0 left-0 w-full h-1 bg-cyan-electric shadow-[0_0_15px_#00f2ff]"></div>
          
          <p className="text-cyan-electric font-black italic text-[10px] tracking-[0.3em] mb-2 uppercase">
            MELHORES DO MOMENTO
          </p>
          
          <h2 className="text-3xl font-black italic text-white uppercase mb-6 tracking-tighter">
            {babaName}
          </h2>

          {topPlayer && (
            <div className="flex flex-col items-center mb-6">
              <div className="w-32 h-32 rounded-full border-4 border-cyan-electric p-1 mb-4 shadow-[0_0_30px_rgba(0,242,255,0.3)]">
                <img 
                  src={topPlayer.photo || `https://ui-avatars.com/api/?name=${topPlayer.name}&background=111&color=fff`} 
                  className="w-full h-full object-cover rounded-full"
                  alt="Winner"
                />
              </div>
              <h3 className="text-2xl font-black italic text-white uppercase">{topPlayer.name}</h3>
              <p className="text-cyan-electric font-bold text-sm tracking-widest uppercase">
                {topPlayer.count} {rankingType === 'gols' ? 'GOLS' : 'ASSISTÊNCIAS'}
              </p>
            </div>
          )}

          {/* RODAPÉ COM LOGO PARA DIVULGAÇÃO */}
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Baixe o App</p>
            <p className="text-xl font-black italic text-cyan-electric tracking-tighter uppercase">BABARÁPIDO</p>
          </div>
        </div>

        <button 
          onClick={handleDownloadImage}
          className="w-full mt-6 bg-cyan-electric text-black py-4 rounded-2xl font-black uppercase text-sm flex items-center justify-center gap-2"
        >
          <Download size={20}/> Salvar Imagem
        </button>
      </div>
    </div>
  );
};

export default ShareableCardModal;
