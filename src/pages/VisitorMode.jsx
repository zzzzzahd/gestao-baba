import React from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';

const VisitorMode = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen p-5 flex items-center justify-center bg-black text-white">
      <div className="max-w-md w-full text-center">
        <Logo size="large" />
        <div className="card-glass p-8 mt-12 border border-cyan-electric/50">
          <i className="fas fa-bolt text-6xl text-cyan-electric mb-6"></i>
          <h2 className="text-2xl font-bold mb-4">MODO FERRAMENTA RÁPIDA</h2>
          <p className="opacity-70 mb-8">Acesse o sorteador e o cronômetro para organizar seu jogo agora!</p>
          <button
            onClick={() => navigate('/home')}
            className="w-full py-4 rounded-xl font-black text-black mb-4"
            style={{ background: 'linear-gradient(90deg, #00f2ff, #0066ff)' }}
          >
            <i className="fas fa-play mr-2"></i> ENTRAR E SORTEAR
          </button>
        </div>
      </div>
    </div>
  );
};
export default VisitorMode;
