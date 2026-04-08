import React from 'react';

const Logo = ({ size = 'large' }) => {
  const isLarge = size === 'large';

  // Configurações de tamanho responsivo
  const dimensions = isLarge
    ? { icon: 'w-44 h-44', title: 'text-6xl', sub: 'text-sm' }
    : { icon: 'w-24 h-24', title: 'text-3xl', sub: 'text-[10px]' };

  return (
    <div className="flex flex-col items-center text-center animate-fade-in p-4 overflow-visible">
      {/* 1. O ÍCONE (IMAGEM REAL COM GRAVATA BRANCA E FUNDO CORTADO) */}
      <div className="relative mb-2 flex flex-col items-center">
        <img 
          src="/logo.png" 
          alt="Draft Play Icon" 
          className={`${dimensions.icon} object-contain`} 
          style={{ 
            // BRILHO SUTIL NO ÍCONE:
            // O segredo é um raio pequeno (3px ou 4px) e opacidade baixa (0.2 ou 0.3)
            filter: 'drop-shadow(0 0 4px rgba(0, 242, 255, 0.25))' 
          }}
        />
        
        {/* Aura de profundidade - Mantida sutil (5%) */}
        <div className="absolute inset-0 bg-cyan-electric/5 blur-[50px] rounded-full -z-10"></div>
      </div>

      {/* 2. O TEXTO COM BRILHO TÁTICO (CORRIGIDO SEM CORTAR O 'Y') */}
      <div className="flex flex-col items-center overflow-visible">
        <h1 
          className={`font-display font-black italic tracking-tighter leading-none ${dimensions.title} overflow-visible`}
          style={{
            // Gradiente Sólido: Branco -> Azul Cyan Elétrico
            background: 'linear-gradient(180deg, #ffffff 45%, #00f2ff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            
            // BRILHO TÁTICO NO TEXTO (O ajuste que você queria):
            // '0 0 6px' é um raio pequeno e '0.35' é uma opacidade média.
            // Isso cria um contorno limpo, sem o efeito "nuvem" de antes.
            filter: 'drop-shadow(0 0 6px rgba(0, 242, 255, 0.35))',
            
            // SEGURANÇA PARA O 'Y' (Sempre visível):
            paddingRight: '0.2em', 
            paddingBottom: '0.1em',
            display: 'inline-block',
            overflow: 'visible'
          }}
        >
          DRAFT PLAY
        </h1>
        
        {/* Subtítulo Clean */}
        <p className={`text-cyan-electric font-semibold tracking-[0.5em] uppercase ${dimensions.sub} mt-1`}>
          BABA MANAGER
        </p>
      </div>
    </div>
  );
};

export default Logo;
