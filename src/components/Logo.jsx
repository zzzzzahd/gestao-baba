import React from 'react';

const Logo = ({ size = 'large' }) => {
  const isLarge = size === 'large';

  return (
    <div className="flex flex-col items-center text-center p-4 overflow-visible">
      
      {/* 1. O BONECO VETORIZADO (Lido da pasta public) */}
      <div className="relative mb-2">
        <img 
          src="/logo.svg" 
          alt="Draft Play Icon"
          className={isLarge ? "w-44 h-44" : "w-20 h-20"}
          style={{ 
            // O brilho (glow) que faz o boneco parecer "aceso" como na foto
            filter: 'drop-shadow(0 0 15px rgba(0, 242, 255, 0.45)) brightness(1.1)' 
          }}
        />
        {/* Aura de profundidade para o ícone não parecer "chapado" */}
        <div className="absolute inset-0 bg-cyan-electric/5 blur-[50px] rounded-full -z-10"></div>
      </div>

      {/* 2. O TEXTO (Código puro para garantir o gradiente e a nitidez) */}
      <div className="flex flex-col items-center">
        <h1 
          className={`font-display font-black italic tracking-tighter leading-none ${isLarge ? 'text-6xl' : 'text-3xl'}`}
          style={{
            // Gradiente idêntico ao modelo: Branco -> Cyan
            background: 'linear-gradient(180deg, #ffffff 40%, #00f2ff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            // Efeito de neon no texto
            filter: 'drop-shadow(0 0 10px rgba(0, 242, 255, 0.5))'
          }}
        >
          DRAFT PLAY
        </h1>
        
        {/* Subtítulo com o espaçamento tático correto */}
        <p className="text-cyan-electric font-bold tracking-[0.5em] uppercase mt-2" 
           style={{ fontSize: isLarge ? '0.9rem' : '0.6rem' }}>
          BABA MANAGER
        </p>
      </div>
    </div>
  );
};

export default Logo;
