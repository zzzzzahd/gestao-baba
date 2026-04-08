import React from 'react';

const Logo = ({ size = 'large' }) => {
  const isLarge = size === 'large';

  return (
    <div className="flex flex-col items-center text-center animate-fade-in p-4 overflow-visible">
      {/* 1. O BONECO TÁTICO (SVG PURO - SEM FUNDO) */}
      <div className="relative mb-3">
        <svg
          viewBox="0 0 100 100"
          className={isLarge ? "w-44 h-44" : "w-20 h-20"}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="gradCorpo" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#ffffff' }} />
              <stop offset="100%" style={{ stopColor: '#f1f5f9' }} />
            </linearGradient>
          </defs>

          <g transform="translate(50,50)"> 
            {/* Cabeça e Corpo Robustos */}
            <circle cx="0" cy="-35" r="14" fill="url(#gradCorpo)" />
            <path
              d="M -25 -15 L -20 -10 C -15 -5, -5 -5, 0 -10 L 5 -15 L 25 -15 L 25 20 C 25 30, 15 35, 10 35 L -10 35 C -15 35, -25 30, -25 20 Z"
              fill="url(#gradCorpo)"
            />
            {/* Gravata Escura */}
            <polygon points="0,-10 3,-5 0,0 -3,-5" fill="#111827" />
            {/* Braço e Prancheta */}
            <path d="M 25 0 L 35 10 L 35 25 L 30 30" stroke="url(#gradCorpo)" strokeWidth="6" fill="none" strokeLinecap="round" />
            <g transform="translate(35, 20)">
              <rect x="-10" y="-12" width="20" height="25" rx="2" fill="#ffffff" stroke="#00f2ff" strokeWidth="1" />
              <path d="M -5 -11 L 5 -11 L 3 -8 L -3 -8 Z" fill="#00f2ff" />
              <line x1="-5" y1="0" x2="5" y2="0" stroke="#111827" strokeWidth="1.2" />
              <line x1="-5" y1="5" x2="3" y2="5" stroke="#111827" strokeWidth="1.2" />
            </g>
          </g>
        </svg>
        {/* Glow de fundo idêntico à foto modelo */}
        <div className="absolute inset-0 bg-cyan-electric/10 blur-[45px] rounded-full -z-10"></div>
      </div>

      {/* 2. O TEXTO (NITIDEZ MÁXIMA) */}
      <div className="space-y-1">
        <h1 
          className={`font-display font-black italic tracking-tighter ${isLarge ? 'text-6xl' : 'text-3xl'}`}
          style={{
            background: 'linear-gradient(180deg, #ffffff 50%, #00f2ff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 10px rgba(0, 242, 255, 0.4))'
          }}
        >
          DRAFT PLAY
        </h1>
        <p className="text-cyan-electric font-semibold tracking-[0.4em] uppercase text-xs">
          BABA MANAGER
        </p>
      </div>
    </div>
  );
};

export default Logo;
