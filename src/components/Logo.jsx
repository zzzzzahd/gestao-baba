import React from 'react';

const Logo = ({ size = 'large' }) => {
  const isLarge = size === 'large';

  return (
    <div className="flex flex-col items-center text-center animate-fade-in p-4">
      {/* 1. SVG Aumentado para melhor proporção (w-40) | 3. Espaçamento reduzido (mb-3) */}
      <div className="relative mb-3">
        <svg
          viewBox="0 0 100 100"
          className={isLarge ? "w-40 h-40" : "w-20 h-20"}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="logoGradFinal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#ffffff' }} />
              <stop offset="100%" style={{ stopColor: '#f3f4f6' }} />
            </linearGradient>
          </defs>

          <g transform="translate(50,50)">
            {/* Boneco Presidente */}
            <circle cx="0" cy="-35" r="14" fill="url(#logoGradFinal)" />
            <path
              d="M -25 -15 L -20 -10 C -15 -5, -5 -5, 0 -10 L 5 -15 L 25 -15 L 25 20 C 25 30, 15 35, 10 35 L -10 35 C -15 35, -25 30, -25 20 Z"
              fill="url(#logoGradFinal)"
            />
            <polygon points="0,-10 3,-5 0,0 -3,-5" fill="#111827" opacity="0.9" />

            {/* Braço Tático Proporcional */}
            <path
              d="M 25 0 L 35 10 L 35 25 L 30 30"
              stroke="url(#logoGradFinal)"
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
            />
            <circle cx="30" cy="30" r="4" fill="url(#logoGradFinal)" />

            {/* 4. Prancheta Simplificada (Linhas Clean em vez de X e O) */}
            <g transform="translate(35, 20)">
              <rect x="-10" y="-12" width="20" height="25" rx="2" fill="#ffffff" stroke="#00f2ff" strokeWidth="1" />
              <path d="M -5 -11 L 5 -11 L 3 -8 L -3 -8 Z" fill="#00f2ff" />
              
              {/* Linhas táticas minimalistas */}
              <line x1="-5" y1="0" x2="5" y2="0" stroke="#111827" strokeWidth="1.2" />
              <line x1="-5" y1="5" x2="3" y2="5" stroke="#111827" strokeWidth="1.2" />
              <line x1="-5" y1="10" x2="1" y2="10" stroke="#111827" strokeWidth="1.2" />
            </g>
          </g>
        </svg>
        
        {/* Glow de fundo muito mais sutil */}
        <div className="absolute inset-0 bg-cyan-500/5 blur-[40px] rounded-full -z-10"></div>
      </div>

      <div className="space-y-1">
        {/* 2. Glow reduzido (0.2 opacity) | 5. Tamanho do texto ajustado (3rem) */}
        <h1 
          className="font-display font-black italic tracking-tighter"
          style={{
            fontSize: isLarge ? '3rem' : '1.3rem',
            background: 'linear-gradient(180deg, #ffffff 50%, #00f2ff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 4px rgba(0, 242, 255, 0.2))'
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
