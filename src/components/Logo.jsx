import React from 'react';
// Certifique-se de salvar a imagem na pasta assets e importar corretamente
import LogoImg from '../public/logo.png'; 

const Logo = ({ size = 'large' }) => {
  const isLarge = size === 'large';

  return (
    <div className="flex flex-col items-center text-center animate-fade-in p-4">
      
      {/* 1. O BONECO (IMAGEM PNG VETORIZADA) */}
      <div className="relative mb-2">
        <img 
          src={LogoImg} 
          alt="Logo Icon"
          className={isLarge ? "w-40 h-40" : "w-20 h-20"}
          style={{ 
            filter: 'drop-shadow(0 0 8px rgba(0, 242, 255, 0.2))' // Glow sutil no boneco
          }}
        />
        {/* Aura de brilho no fundo para integração */}
        <div className="absolute inset-0 bg-cyan-electric/5 blur-[40px] rounded-full -z-10"></div>
      </div>

      {/* 2. O TEXTO (CÓDIGO PURO PARA NITIDEZ MÁXIMA) */}
      <div className="space-y-1">
        <h1 
          className={`font-display font-black italic tracking-tighter ${isLarge ? 'text-6xl' : 'text-2xl'}`}
          style={{
            background: 'linear-gradient(180deg, #ffffff 50%, #00f2ff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 5px rgba(0, 242, 255, 0.3))'
          }}
        >
          DRAFT PLAY
        </h1>
        
        <p className="text-cyan-electric font-semibold tracking-[0.4em] uppercase" 
           style={{ fontSize: isLarge ? '0.8rem' : '0.5rem' }}>
          BABA MANAGER
        </p>
      </div>
    </div>
  );
};

export default Logo;
