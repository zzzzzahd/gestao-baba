import React from 'react';

const Logo = ({ size = 'large' }) => {
  const isLarge = size === 'large';

  return (
    <div className="flex flex-col items-center text-center p-4">

      {/* IMAGEM DO BONECO */}
      <div className="relative mb-2">
        <img
          src="/logo.png"
          alt="Draft Play Logo"
          className={isLarge ? "w-44" : "w-20"}
          style={{
            filter: 'drop-shadow(0 0 20px rgba(0, 242, 255, 0.35))'
          }}
        />

        {/* glow de fundo */}
        <div className="absolute inset-0 bg-cyan-400/10 blur-[50px] rounded-full -z-10"></div>
      </div>

      {/* TEXTO */}
      <div className="flex flex-col items-center leading-none">

        <h1
          className="font-black italic tracking-tight"
          style={{
            fontSize: isLarge ? '3.2rem' : '1.4rem',
            background: 'linear-gradient(180deg, #ffffff 40%, #00f2ff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 10px rgba(0, 242, 255, 0.4))'
          }}
        >
          DRAFT PLAY
        </h1>

        <p
          className="text-[#00f2ff] font-bold tracking-[0.5em] uppercase mt-2"
          style={{
            fontSize: isLarge ? '0.9rem' : '0.6rem'
          }}
        >
          BABA MANAGER
        </p>

      </div>
    </div>
  );
};

export default Logo;
