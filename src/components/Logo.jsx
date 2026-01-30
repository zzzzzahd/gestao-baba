import React from 'react';

const Logo = ({ size = 'large' }) => {
  const sizes = {
    small: {
      icon: 'text-3xl',
      clipboard: 'text-xl',
      text: 'text-2xl',
      subtitle: 'text-xs'
    },
    large: {
      icon: 'text-7xl',
      clipboard: 'text-3xl',
      text: 'text-6xl',
      subtitle: 'text-sm'
    }
  };

  const s = sizes[size];

  return (
    <div className="text-center animate-fade-in">
      <div className="relative inline-block mb-4">
        <i className={`fas fa-user-tie ${s.icon} text-white`}></i>
        <div className="absolute -bottom-1 -right-4 bg-cyber-dark p-2 rounded-lg">
          <i 
            className={`fas fa-clipboard-list ${s.clipboard}`}
            style={{
              color: 'var(--cyan-electric)',
              filter: 'drop-shadow(0 0 5px var(--cyan-electric))'
            }}
          ></i>
        </div>
      </div>
      
      <h1 
        className={`font-display font-black italic ${s.text}`}
        style={{
          background: 'linear-gradient(180deg, #fff 50%, var(--cyan-electric))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}
      >
        DRAFT
      </h1>
      
      <p 
        className={`text-cyan-electric font-bold tracking-[0.4em] ${s.subtitle} mt-1`}
      >
        TACTICAL COACH
      </p>
    </div>
  );
};

export default Logo;
