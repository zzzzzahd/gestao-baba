// src/components/GuiasLayout.jsx
// Cabeçalho + rodapé das páginas públicas /guias e /guias/:slug.
// O cabeçalho repete o da landing (mesmas classes) com o link "Guias" ativo.

import React from 'react';
import { Link } from 'react-router-dom';
import PublicPagesFooter from './PublicPagesFooter';

const GuiasLayout = ({ children }) => (
  <div className="min-h-screen bg-black text-white font-sans" style={{ overflowX: 'clip' }}>
    <header className="sticky top-0 z-20 bg-black/80 backdrop-blur border-b border-white/5">
      <nav aria-label="Menu principal" className="max-w-5xl mx-auto px-6 py-3 min-h-14 flex items-center justify-between text-xs font-bold">
        <Link to="/" className="text-base font-black italic tracking-tighter text-cyan-electric">
          DRAFT PLAY <span className="font-bold not-italic tracking-widest text-[9px] opacity-70">BABA MANAGER</span>
        </Link>
        <div className="flex items-center gap-5 text-text-mid">
          <Link to="/guias" className="text-white hover:text-cyan-electric transition-colors">Guias</Link>
          <Link to="/sobre" className="hover:text-cyan-electric transition-colors">Sobre</Link>
          <Link to="/login" className="bg-cyan-electric text-black font-black uppercase tracking-widest text-[10px] px-4 py-2 rounded-lg hover:brightness-110 transition">Entrar</Link>
        </div>
      </nav>
    </header>

    {/* Alvo do skip link do index.html: exatamente um <main> por página */}
    <main id="main-content" tabIndex={-1} className="outline-none">{children}</main>

    <div className="max-w-5xl mx-auto px-6 py-10 space-y-3 text-center">
      <PublicPagesFooter current="guias" className="opacity-80" />
      <p className="text-center text-[9px] font-bold opacity-20 uppercase tracking-[0.4em]">
        Draft Play Baba Manager
      </p>
    </div>
  </div>
);

export default GuiasLayout;
