import React from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { useAuth } from '../contexts/AuthContext';

const VisitorMode = () => {
  const navigate = useNavigate();
  // Pegamos a função de login (se o seu contexto permitir) ou apenas simulamos
  const { user } = useAuth();

  const handleEnterAsGuest = () => {
    // Aqui avisamos ao sistema que, embora não logado, o usuário quer ver as ferramentas
    // Redirecionamos direto para a página de jogo/cronômetro
    navigate('/match'); 
  };

  return (
    <div className="min-h-screen p-5 flex items-center justify-center bg-black">
      <div className="max-w-md w-full text-center">
        <Logo size="large" />
        
        <div className="card-glass p-8 mt-12 animate-slide-in">
          <i className="fas fa-bolt text-6xl text-cyan-electric mb-6"></i>
          
          <h2 className="text-2xl font-bold mb-4 text-white">
            MODO FERRAMENTA RÁPIDA
          </h2>
          
          <p className="text-sm opacity-70 mb-6 text-gray-300">
            Use agora o sorteio e o cronômetro sem precisar de cadastro. 
            Ideal para organizar o baba na beira da quadra!
          </p>
          
          <div className="space-y-3">
            <button
              onClick={handleEnterAsGuest}
              className="btn-primary w-full py-4 text-lg font-bold"
              style={{ background: 'linear-gradient(90deg, #00f2ff, #0066ff)', color: '#000' }}
            >
              <i className="fas fa-play mr-2"></i>
              INICIAR SORTEIO / JOGO
            </button>
            
            <button
              onClick={() => navigate('/login')}
              className="w-full text-sm opacity-50 hover:opacity-100 transition-all text-white mt-4"
            >
              <i className="fas fa-user-plus mr-2"></i>
              Criar conta para salvar histórico
            </button>
          </div>
        </div>

        <div className="mt-8 text-xs opacity-40 text-gray-400">
          <p>
            Os dados do modo rápido não ficam salvos permanentemente no banco.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VisitorMode;
