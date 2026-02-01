import React from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { LogIn, Zap } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full text-center space-y-12">
        
        {/* Logo */}
        <div className="flex justify-center animate-fade-in">
          <Logo size="large" />
        </div>

        {/* Card Principal */}
        <div className="card-glass p-8 border border-cyan-electric/30 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,242,255,0.05)] relative overflow-hidden animate-slide-up">
          
          {/* Brilho decorativo */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-electric/10 blur-[80px] rounded-full"></div>
          
          <div className="relative z-10 space-y-6">
            
            {/* Título */}
            <div>
              <h1 className="text-3xl font-black mb-2 uppercase italic tracking-tighter bg-gradient-to-r from-white via-cyan-electric to-white bg-clip-text text-transparent">
                Bem-vindo ao DRAFT
              </h1>
              <p className="text-xs font-medium opacity-50 px-4 leading-relaxed uppercase tracking-wide">
                Sistema profissional de gestão de peladas e babas
              </p>
            </div>

            {/* Botão: Entrar no Meu Baba */}
            <button
              onClick={() => navigate('/login')}
              className="w-full py-5 rounded-2xl font-black text-black shadow-[0_10px_30px_rgba(0,242,255,0.25)] transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 uppercase text-sm tracking-widest"
              style={{ background: 'linear-gradient(135deg, #00f2ff, #0066ff)' }}
            >
              <LogIn size={20} />
              Entrar no Meu Baba
            </button>

            {/* Divisor */}
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-[9px] uppercase font-black tracking-[0.3em]">
                <span className="bg-black px-4 text-white/20">
                  ou
                </span>
              </div>
            </div>

            {/* Botão: Modo Visitante */}
            <button
              onClick={() => navigate('/visitor')}
              className="w-full py-4 rounded-2xl font-black bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all active:scale-95 flex items-center justify-center gap-3 uppercase text-xs tracking-widest"
            >
              <Zap size={18} />
              Modo Visitante (Sem Conta)
            </button>

            {/* Recursos */}
            <div className="pt-6 space-y-2 text-left">
              <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-30 mb-3">
                Recursos:
              </p>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="flex items-center gap-2 opacity-60">
                  <i className="fas fa-check text-cyan-electric text-xs"></i>
                  <span>Sorteio de Times</span>
                </div>
                <div className="flex items-center gap-2 opacity-60">
                  <i className="fas fa-check text-cyan-electric text-xs"></i>
                  <span>Placar ao Vivo</span>
                </div>
                <div className="flex items-center gap-2 opacity-60">
                  <i className="fas fa-check text-cyan-electric text-xs"></i>
                  <span>Rankings</span>
                </div>
                <div className="flex items-center gap-2 opacity-60">
                  <i className="fas fa-check text-cyan-electric text-xs"></i>
                  <span>Gestão Financeira</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <p className="text-[9px] font-bold opacity-20 uppercase tracking-[0.4em]">
          Powered by Draft Baba v3.0
        </p>
      </div>
    </div>
  );
};

export default LandingPage;
