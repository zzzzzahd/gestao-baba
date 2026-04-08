import React from 'react';
// Certifique-se de salvar a imagem do ícone (sem fundo) na sua pasta assets 
// e importá-la corretamente aqui. Exemplo:
// import IconImg from '../assets/icon.png';

const Logo = ({ size = 'large' }) => {
  const isLarge = size === 'large';

  // Configurações de tamanho responsivo
  const dimensions = isLarge
    ? { icon: 'w-48 h-48', title: 'text-6xl', sub: 'text-sm' }
    : { icon: 'w-24 h-24', title: 'text-3xl', sub: 'text-[10px]' };

  return (
    <div className="flex flex-col items-center text-center animate-fade-in p-4 overflow-visible">
      {/* 1. O ÍCONE (USANDO UMA IMAGEM REAL) */}
      <div className="relative mb-3 flex flex-col items-center">
        {/* Substitua o placeholder abaixo pela tag img que importa sua imagem */}
        {/* <img 
          src={IconImg} 
          alt="Draft Play Icon" 
          className={`${dimensions.icon} object-contain`} 
          style={{ 
            // Adiciona um leve brilho para integrar com o fundo
            filter: 'drop-shadow(0 0 10px rgba(0, 242, 255, 0.3))' 
          }}
        /> */}
        
        {/* Placeholder visual apenas para o exemplo (Remova quando colocar sua img) */}
        <div className={`${dimensions.icon} bg-gray-600 rounded-full flex items-center justify-center text-xs text-white`}>
          [ÍCONE PNG]
        </div>

        {/* Aura de brilho atrás do ícone para profundidade */}
        <div className="absolute inset-0 bg-cyan-electric/5 blur-[50px] rounded-full -z-10"></div>
      </div>

      {/* 2. O TEXTO E EFEITOS (CÓDIGO PURO PARA NITIDEZ) */}
      <div className="space-y-1">
        <h1 
          className={`font-display font-black italic tracking-tighter ${dimensions.title}`}
          style={{
            // Gradiente Tático: Branco -> Azul Cyan Elétrico
            background: 'linear-gradient(180deg, #ffffff 40%, #00f2ff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 8px rgba(0, 242, 255, 0.4))' // Glow Neon Limpo
          }}
        >
          DRAFT PLAY
        </h1>
        
        {/* Subtítulo Clean e Totalmente Azul com tracking tático */}
        <p className={`text-cyan-electric font-semibold tracking-[0.4em] uppercase ${dimensions.sub} mt-1`}>
          BABA MANAGER
        </p>
      </div>
    </div>
  );
};

export default Logo;
