import React from 'react';

// Mantendo o nome simples "Logo" para evitar erro de importação
const Logo = ({ size = 'large' }) => {
  const isLarge = size === 'large';

  return (
    <div className="flex flex-col items-center text-center animate-fade-in p-4">
      {/* O DESENHO DO PRESIDENTE TÁTICO */}
      <div className="relative mb-6">
        <svg
          viewBox="0 0 100 100"
          className={isLarge ? "w-32 h-32" : "w-16 h-16"}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="bodyGradHome" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#ffffff' }} />
              <stop offset="100%" style={{ stopColor: '#f3f4f6' }} />
            </linearGradient>
          </defs>

          <g transform="translate(50,50)">
            {/* Corpo e Cabeça */}
            <circle cx="0" cy="-35" r="14" fill="url(#bodyGradHome)" />
            <path
              d="M -25 -15 L -20 -10 C -15 -5, -5 -5, 0 -10 L 5 -15 L 25 -15 L 25 20 C 25 30, 15 35, 10 35 L -10 35 C -15 35, -25 30, -25 20 Z"
              fill="url(#bodyGradHome)"
            />
            <polygon points="0,-10 3,-5 0,0 -3,-5" fill="#111827" opacity="0.9" />

            {/* Braço Tático que você aprovou */}
            <path
              d="M 25 0 L 35 10 L 35 25 L 30 30"
              stroke="url(#bodyGradHome)"
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
            />
            <circle cx="30" cy="30" r="4" fill="url(#bodyGradHome)" />

            {/* Prancheta Branca */}
            <g transform="translate(35, 20)">
              <rect x="-10" y="-12" width="20" height="25" rx="2" fill="#ffffff" stroke="#00f2ff" strokeWidth="1" />
              <path d="M -5 -11 L 5 -11 L 3 -8 L -3 -8 Z" fill="#00f2ff" />
              <text x="-6" y="2" fill="#111827" fontSize="7" fontWeight="bold" fontFamily="Arial">X</text>
              <circle cx="3" cy="2" r="1.5" stroke="#111827" strokeWidth="0.8" fill="none" />
              <path d="M -6 10 L 6 10 L 4 12 M 6 10 L 4 8" stroke="#111827" strokeWidth="0.8" fill="none" strokeLinecap="round" />
            </g>
          </g>
        </svg>
        <div className="absolute inset-0 bg-cyan-500/10 blur-[30px] rounded-full -z-10"></div>
      </div>

      {/* TEXTO DRAFT PLAY MAIÚSCULO */}
      <div className="space-y-1">
        <h1 
          className="font-display font-black italic tracking-tighter"
          style={{
            fontSize: isLarge ? '3.5rem' : '1.5rem',
            background: 'linear-gradient(180deg, #ffffff 50%, #00f2ff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 10px rgba(0, 242, 255, 0.4))'
          }}
        >
          DRAFT PLAY
        </h1>
        <p className="text-[#00f2ff] font-semibold tracking-[0.4em] uppercase" style={{ fontSize: isLarge ? '0.8rem' : '0.5rem' }}>
          BABA MANAGER
        </p>
      </div>
    </div>
  );
};

export default Logo;
