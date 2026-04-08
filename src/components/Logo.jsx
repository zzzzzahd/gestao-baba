import React from 'react';

// Ícone SVG Personalizado e Corrigido: Presidente Tático Unificado
const TacticianPresidentUnifiedIcon = ({ className }) => (
  <svg
    viewBox="0 0 100 100" // Define o espaço de desenho
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Definições de Gradientes e Brilhos */}
    <defs>
      {/* Gradiente Metálico Suave Unificado (Branco a Cinza Muito Claro) */}
      <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#ffffff', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: '#f9fafb', stopOpacity: 1 }} />
      </linearGradient>

      {/* Gradiente Cyan Elétrico Original (Topo Branco, Base Cyan) */}
      <linearGradient id="cyanGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#ffffff', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: 'var(--cyan-electric)', stopOpacity: 1 }} />
      </linearGradient>
    </defs>

    {/* Grupo de Elementos Integrados - Centralizado */}
    <g transform="translate(50,50)"> 
      {/* Silhueta do Presidente Unificada (Cabeça e Terno) */}
      {/* Cabeça Unificada com o mesmo gradiente do corpo */}
      <circle cx="0" cy="-35" r="14" fill="url(#bodyGradient)" />

      {/* Terno (Corpo Principal) */}
      <path
        d="M -25 -15 L -20 -10 C -15 -5, -5 -5, 0 -10 L 5 -15 L 25 -15 L 25 20 C 25 30, 15 35, 10 35 L -10 35 C -15 35, -25 30, -25 20 Z"
        fill="url(#bodyGradient)"
      />

      {/* Detalhe da Gravata Tática (Escura) */}
      <polygon points="0,-10 3,-5 0,0 -3,-5" fill="#111827" opacity="0.9" />

      {/* Braço Direito (Anatomicamente Proporcional) */}
      <path
        d="M 25 0 L 35 10 L 35 25 L 30 30"
        stroke="url(#bodyGradient)"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
      />

      {/* Mão (Conectada ao Braço) Segurando a Prancheta */}
      <circle cx="30" cy="30" r="4" fill="url(#bodyGradient)" />

      {/* A Prancheta Segurada: Proporcional e com Interior Branco */}
      <g transform="translate(35, 20)"> 
        {/* Fundo da Prancheta Física (Pequena, Proporcional e Branca) */}
        <rect x="-10" y="-12" width="20" height="25" rx="2" fill="#ffffff" stroke="var(--cyan-electric)" strokeWidth="1" />
        
        {/* Prendedor da Prancheta (Cyan Elétrico) */}
        <path d="M -5 -11 L 5 -11 L 3 -8 L -3 -8 Z" fill="var(--cyan-electric)" />
        
        {/* Táticas na Prancheta (Desenhandas em Preto/Cinza Escuro para Contraste) */}
        <text x="-6" y="2" fill="#1f2937" fontSize="7" fontWeight="bold">X</text>
        <circle cx="3" cy="2" r="1.5" stroke="#1f2937" strokeWidth="0.8" fill="none" opacity="0.9" />
        
        {/* Seta Tática (Desenhanda em Preto/Cinza Escuro) */}
        <path d="M -6 10 L 6 10 L 4 12 M 6 10 L 4 8" stroke="#1f2937" strokeWidth="0.8" fill="none" strokeLinecap="round" opacity="0.9" />
      </g>
    </g>
  </svg>
);

const LogoRefinadoEUnificado = ({ size = 'large' }) => {
  const sizes = {
    small: {
      icon: 'w-16 h-16',
      text: 'text-2xl',
      sub: 'text-[9px]'
    },
    large: {
      icon: 'w-32 h-32',
      text: 'text-6xl',
      sub: 'text-sm'
    }
  };

  const s = sizes[size];

  return (
    <div className="flex flex-col items-center text-center animate-fade-in p-4">
      {/* Container Integrado do Ícone SVG Unificado */}
      <div className="relative mb-6 flex items-center justify-center w-full">
        {/* Novo Ícone SVG Anatomicamente Proporcional e Unificado */}
        <TacticianPresidentUnifiedIcon 
          className={`${s.icon} filter drop-shadow(0 4px 6px rgba(0,0,0,0.4))` }
        />
        
        {/* Aura de brilho atrás do logo integrado - Suave e Cyan Elétrico */}
        <div className="absolute inset-0 bg-cyan-500/10 blur-[30px] rounded-full -z-10"></div>
      </div>

      {/* Bloco de Texto Atualizado e Focado */}
      <div className="space-y-1">
        {/* Texto "DRAFT PLAY" Maiúsculo e com Gradiente */}
        <h1 
          className={`font-display font-black italic ${s.text} tracking-tighter`}
          style={{
            // Gradiente: Branco no topo, Azul Cyan Elétrico na base
            background: 'linear-gradient(180deg, #ffffff 50%, var(--cyan-electric) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 10px rgba(6,182,212,0.5))'
          }}
        >
          DRAFT PLAY
        </h1>
        
        {/* Subtítulo "BABA MANAGER" Todo Azul Cyan Elétrico */}
        <p className={`text-cyan-electric font-semibold tracking-[0.3em] ${s.sub} uppercase mt-1`}>
          BABA MANAGER
        </p>
      </div>
    </div>
  );
};

export default LogoRefinadoEUnificado;
