import React from 'react';

const Logo = ({ size = 'large' }) => {
  const isLarge = size === 'large';

  return (
    <div className="flex flex-col items-center text-center animate-fade-in p-4 overflow-visible">
      
      {/* 1. O ÍCONE (Sua imagem PNG com fundo transparente e bordas cortadas) */}
      <div className="relative mb-2 flex flex-col items-center">
        <img 
          src="/logo.png" 
          alt="Draft Play Icon" 
          className={isLarge ? "w-44 h-44" : "w-24 h-24"} 
          style={{ 
            // Brilho tático para destacar o boneco no fundo preto
            filter: 'drop-shadow(0 0 12px rgba(0, 242, 255, 0.4))' 
          }}
        />
        
        {/* Aura de profundidade atrás do ícone */}
        <div className="absolute inset-0 bg-cyan-electric/5 blur-[50px] rounded-full -z-10"></div>
      </div>

      {/* 2. O TEXTO (Corrigido para não cortar o 'Y') */}
      <div className="flex flex-col items-center overflow-visible px-6 pb-4">
        <h1 
          className={`font-display font-black italic tracking-tighter leading-none ${isLarge ? 'text-6xl' : 'text-3xl'} overflow-visible`}
          style={{
            // Gradiente: Branco no topo, Cyan Elétrico na base
            background: 'linear-gradient(180deg, #ffffff 45%, #00f2ff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            // Filtro de brilho para o texto (Neon)
            filter: 'drop-shadow(0 0 10px rgba(0, 242, 255, 0.5))',
            // Adiciona um pequeno padding à direita via estilo para garantir que o 'Y' apareça
            paddingRight: '0.1em'
          }}
        >
          DRAFT PLAY
        </h1>
        
        {/* Subtítulo com espaçamento largo (estilo tático) */}
        <p className="text-cyan-electric font-bold tracking-[0.5em] uppercase mt-2" 
           style={{ fontSize: isLarge ? '0.9rem' : '0.65rem' }}>
          BABA MANAGER
        </p>
      </div>
    </div>
  );
};

export default Logo;
