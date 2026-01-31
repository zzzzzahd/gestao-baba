import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-cyan-electric/10 rounded-3xl flex items-center justify-center mb-6 border border-cyan-electric/20 shadow-[0_0_50px_rgba(0,242,255,0.15)]">
        <Trophy className="text-cyan-electric" size={40} />
      </div>
      
      <h1 className="text-4xl font-black italic tracking-tighter uppercase mb-2">
        BABA <span className="text-cyan-electric">RÁPIDO</span>
      </h1>
      <p className="text-white/40 text-sm font-bold uppercase tracking-widest mb-12">
        Sorteio e Gestão de Babas
      </p>

      <div className="w-full max-w-xs space-y-4">
        <button 
          onClick={() => navigate('/login')}
          className="w-full bg-cyan-electric text-black py-5 rounded-2xl font-black uppercase italic shadow-[0_10px_30px_rgba(0,242,255,0.2)] active:scale-95 transition-all"
        >
          Entrar no Meu Baba
        </button>
        
        <button 
          onClick={() => navigate('/visitor-match')}
          className="w-full bg-white/5 border border-white/10 text-white/60 py-5 rounded-2xl font-black uppercase italic active:scale-95 transition-all"
        >
          Modo Visitante (Sorteio)
        </button>
      </div>

      <p className="absolute bottom-10 text-[10px] text-white/20 font-black uppercase tracking-widest">
        Versão 2.0 • 2026
      </p>
    </div>
  );
};

export default LandingPage;
