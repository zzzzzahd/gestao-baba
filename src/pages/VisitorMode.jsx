import React from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';

const VisitorMode = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen p-5 flex items-center justify-center">
      <div className="max-w-md w-full text-center">
        <Logo size="large" />
        
        <div className="card-glass p-8 mt-12 animate-slide-in">
          <i className="fas fa-exclamation-triangle text-6xl text-cyan-electric mb-6"></i>
          
          <h2 className="text-2xl font-bold mb-4">
            MODO VISITANTE
          </h2>
          
          <p className="text-sm opacity-70 mb-6">
            O modo visitante permite testar funcionalidades básicas do sistema,
            mas recursos avançados como criação de babas, confirmação de presença
            e acesso a rankings estão disponíveis apenas para usuários cadastrados.
          </p>
          
          <div className="space-y-3">
            <button
              onClick={() => navigate('/login')}
              className="btn-primary"
            >
              <i className="fas fa-user-plus mr-2"></i>
              CRIAR CONTA GRÁTIS
            </button>
            
            <button
              onClick={() => navigate('/login')}
              className="btn-visitor"
            >
              <i className="fas fa-arrow-left mr-2"></i>
              VOLTAR
            </button>
          </div>
        </div>

        <div className="mt-8 text-xs opacity-40">
          <p>
            Cadastre-se gratuitamente para ter acesso completo a todas as funcionalidades!
          </p>
        </div>
      </div>
    </div>
  );
};

export default VisitorMode;
