import React from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { Zap, Play, ArrowLeft } from 'lucide-react';

const VisitorMode = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen p-6 flex flex-col items-center justify-center bg-black text-white font-sans">
      <div className="max-w-md w-full text-center space-y-12">
        
        {/* Logo centralizada com respiro */}
        <div className="flex justify-center">
          <Logo size="large" />
        </div>

        <div className="card-glass p-8 border border-cyan-electric/30 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,242,255,0.05)] relative overflow-hidden">
          {/* Brilho decorativo de fundo */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-electric/10 blur-[80px] rounded-full"></div>
          
          <div className="relative z-10">
            <div className="w-20 h-20 bg-cyan-electric/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-cyan-electric/20">
              <Bolt className="text-cyan-electric shadow-sm" size={40} />
            </div>
            
            <h2 className="text-2xl font-black mb-3 uppercase italic tracking-tighter">
              Modo Ferramenta Rápida
            </h2>
            
            <p className="text-xs font-medium opacity-50 mb-10 px-4 leading-relaxed uppercase tracking-wide">
              Acesse o sorteador e o cronômetro para organizar seu jogo agora, sem precisar de conta!
            </p>

            <button
              onClick={() => navigate('/home')}
              className="w-full py-5 rounded-2xl font-black text-black mb-6 shadow-[0_10px_30px_rgba(0,242,255,0.25)] transition-all active:scale-95 flex items-center justify-center gap-3 uppercase text-xs tracking-widest"
              style={{ background: 'linear-gradient(135deg, #00f2ff, #0066ff)' }}
            >
              <Play size={18} fill="black" /> ENTRAR E SORTEAR
            </button>

            <button 
              onClick={() => navigate('/login')}
              className="flex items-center justify-center gap-2 mx-auto text-[10px] font-black opacity-30 hover:opacity-100 transition-all uppercase tracking-[0.2em]"
            >
              <ArrowLeft size={12} /> Voltar para Login
            </button>
          </div>
        </div>

        <p className="text-[9px] font-bold opacity-20 uppercase tracking-[0.4em]">
          Powered by Draft Baba v3.0
        </p>
      </div>
    </div>
  );
};

export default VisitorMode;
