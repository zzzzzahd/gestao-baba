import React from 'react';

const Logo = ({ size = 'large' }) => {
  const isLarge = size === 'large';

  return (
    <div className="flex flex-col items-center text-center animate-fade-in p-4">
      
      {/* 1. O BONECO (IMAGEM DA PASTA PUBLIC) */}
      <div className="relative mb-2">
        <img 
          src="/logo.png" // Caminho direto para a pasta public
          alt="Draft Play Logo Icon"
          className={isLarge ? "w-40 h-40 object-contain" : "w-20 h-20 object-contain"}
          style={{ 
            // Filtro para dar um leve brilho cyan e integrar com o fundo
            filter: 'drop-shadow(0 0 12px rgba(0, 242, 255, 0.25))' 
          }}
          // Caso a imagem demore a carregar ou mude de nome, evita quebrar o layout
          onError={(e) => { e.target.style.display = 'none'; }} 
        />
        
        {/* Brilho (Glow) tático de fundo para não parecer "colado" */}
        <div className="absolute inset-0 bg-cyan-electric/10 blur-[45px] rounded-full -z-10"></div>
      </div>

      {/* 2. O TEXTO (CÓDIGO PURO PARA NITIDEZ TOTAL) */}
      <div className="space-y-1">
        <h1 
          className={`font-display font-black italic tracking-tighter ${isLarge ? 'text-6xl' : 'text-3xl'}`}
          style={{
            // Gradiente idêntico à imagem: Branco em cima, Cyan em baixo
            background: 'linear-gradient(180deg, #ffffff 45%, #00f2ff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 8px rgba(0, 242, 255, 0.4))'
          }}
        >
          DRAFT PLAY
        </h1>
        
        {/* Subtítulo com espaçamento tático (Tracking) */}
        <p className="text-cyan-electric font-semibold tracking-[0.4em] uppercase" 
           style={{ fontSize: isLarge ? '0.9rem' : '0.6rem' }}>
          BABA MANAGER
        </p>
      </div>
    </div>
  );
};

export default Logo;
