import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBaba } from '../contexts/BabaContext';
import { Clock, CheckCircle2, XCircle, Users, AlertCircle } from 'lucide-react';

const PresenceConfirmation = () => {
  const navigate = useNavigate();
  const { 
    currentBaba, 
    gameConfirmations, 
    myConfirmation, 
    canConfirm, 
    confirmationDeadline,
    confirmPresence,
    cancelConfirmation,
    loading,
    // ⭐ Sorteio
    currentMatch,
    isDrawing,
    drawTeamsIntelligent, // ⭐ CORRETO: drawTeamsIntelligent
  } = useBaba();

  const [timeRemaining, setTimeRemaining] = useState('');

  // Calcular tempo restante até o deadline
  useEffect(() => {
    if (!confirmationDeadline) return;

    const updateTimeRemaining = () => {
      const now = new Date();
      const diff = confirmationDeadline - now;

      if (diff <= 0) {
        setTimeRemaining('Encerrado');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}min`);
      } else if (minutes > 0) {
        setTimeRemaining(`${minutes}min ${seconds}s`);
      } else {
        setTimeRemaining(`${seconds}s`);
      }
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [confirmationDeadline]);

  // ⭐ NOVO: Auto-sorteio após deadline
  useEffect(() => {
    if (!canConfirm && gameConfirmations.length >= 4 && !currentMatch && !isDrawing) {
      // Deadline passou, tem jogadores suficientes, e ainda não sorteou
      const timer = setTimeout(() => {
        drawTeamsIntelligent().then((match) => {
          if (match) {
            // Navegar para tela de times após 2 segundos
            setTimeout(() => {
              navigate('/teams');
            }, 2000);
          }
        });
      }, 3000); // Aguarda 3 segundos após deadline

      return () => clearTimeout(timer);
    }
  }, [canConfirm, gameConfirmations, currentMatch, isDrawing, drawTeamsIntelligent, navigate]);

  // Calcular horário do jogo e deadline
  const getGameTime = () => {
    if (!currentBaba?.game_time) return '--:--';
    return currentBaba.game_time.substring(0, 5); // HH:MM
  };

  const getDeadlineTime = () => {
    if (!confirmationDeadline) return '--:--';
    return confirmationDeadline.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // ESTADO: ANTES DO DEADLINE
  if (canConfirm) {
    return (
      <div className="card-glass p-6 rounded-[2rem] border border-cyan-electric/20 bg-cyan-electric/5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="text-cyan-electric" size={20} />
            <h3 className="text-sm font-black uppercase tracking-wider">
              Confirmar Presença
            </h3>
          </div>
          <div className="flex items-center gap-2 bg-cyan-electric/10 px-3 py-1 rounded-xl">
            <Users size={14} className="text-cyan-electric" />
            <span className="text-xs font-black text-cyan-electric">
              {gameConfirmations.length} confirmado{gameConfirmations.length !== 1 && 's'}
            </span>
          </div>
        </div>

        {/* Horários */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white/5 p-3 rounded-xl border border-white/5">
            <p className="text-[9px] font-black text-white/40 uppercase mb-1">Horário do Jogo</p>
            <p className="text-lg font-black text-white">{getGameTime()}</p>
          </div>
          <div className="bg-white/5 p-3 rounded-xl border border-white/5">
            <p className="text-[9px] font-black text-white/40 uppercase mb-1">Prazo até</p>
            <p className="text-lg font-black text-yellow-500">{getDeadlineTime()}</p>
          </div>
        </div>

        {/* Contador */}
        <div className="mb-4 p-4 bg-black/20 rounded-xl border border-white/5 text-center">
          <p className="text-[9px] font-black text-white/40 uppercase mb-2">Tempo Restante</p>
          <p className={`text-2xl font-black font-mono ${
            timeRemaining.includes('min') || timeRemaining.includes('h') 
              ? 'text-green-400' 
              : 'text-red-500 animate-pulse'
          }`}>
            {timeRemaining}
          </p>
        </div>

        {/* Botão de Ação */}
        {myConfirmation ? (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
              <CheckCircle2 className="text-green-500" size={20} />
              <span className="text-sm font-black text-green-500 uppercase">
                Presença Confirmada
              </span>
            </div>
            <button
              onClick={cancelConfirmation}
              disabled={loading}
              className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-white/60 text-xs font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
            >
              {loading ? 'Cancelando...' : 'Cancelar Confirmação'}
            </button>
          </div>
        ) : (
          <button
            onClick={confirmPresence}
            disabled={loading}
            className="w-full py-5 rounded-2xl bg-gradient-to-r from-cyan-electric to-blue-600 text-black font-black uppercase italic tracking-tighter shadow-[0_10px_40px_rgba(0,255,242,0.2)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? 'Confirmando...' : '✓ Confirmar Presença'}
          </button>
        )}

        {/* Lista de Confirmados */}
        {gameConfirmations.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/5">
            <p className="text-[9px] font-black text-white/40 uppercase mb-2">
              Confirmados ({gameConfirmations.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {gameConfirmations.slice(0, 8).map((conf, i) => (
                <div 
                  key={i}
                  className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg border border-white/5"
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    conf.player?.position === 'goleiro' ? 'bg-yellow-400' : 'bg-cyan-electric'
                  }`}></div>
                  <span className="text-[9px] font-bold text-white/80">
                    {conf.player?.name || 'Jogador'}
                  </span>
                </div>
              ))}
              {gameConfirmations.length > 8 && (
                <span className="text-[9px] font-black text-white/40 px-2 py-1">
                  +{gameConfirmations.length - 8}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ESTADO: APÓS O DEADLINE
  return (
    <div className="card-glass p-6 rounded-[2rem] border border-yellow-500/20 bg-yellow-500/5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle className="text-yellow-500" size={20} />
        <h3 className="text-sm font-black uppercase tracking-wider text-yellow-500">
          Confirmações Encerradas
        </h3>
      </div>

      {/* Info */}
      <div className="mb-4 p-4 bg-black/20 rounded-xl border border-white/5 text-center">
        <p className="text-xs text-white/60 mb-2">
          O prazo para confirmação de presença terminou.
        </p>
        <div className="flex items-center justify-center gap-2 mt-3">
          <Users className="text-cyan-electric" size={16} />
          <span className="text-lg font-black text-cyan-electric">
            {gameConfirmations.length} confirmado{gameConfirmations.length !== 1 && 's'}
          </span>
        </div>
      </div>

      {/* Status de sorteio */}
      {isDrawing ? (
        <div className="p-4 bg-cyan-electric/10 border border-cyan-electric/30 rounded-xl text-center">
          <div className="w-8 h-8 border-4 border-cyan-electric border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs font-black text-cyan-electric uppercase">
            Sorteando times...
          </p>
        </div>
      ) : currentMatch ? (
        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-center">
          <CheckCircle2 className="text-green-500 mx-auto mb-2" size={24} />
          <p className="text-xs font-black text-green-500 uppercase mb-3">
            Times sorteados!
          </p>
          <button
            onClick={() => navigate('/teams')}
            className="w-full py-3 bg-green-500 text-black font-black uppercase text-xs rounded-xl hover:bg-green-400 transition-all"
          >
            Ver Times
          </button>
        </div>
      ) : gameConfirmations.length >= 4 ? (
        <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-center">
          <p className="text-[9px] font-black text-white/40 uppercase mb-2">
            Sorteio automático em andamento...
          </p>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-cyan-electric rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-cyan-electric rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
            <div className="w-2 h-2 bg-cyan-electric rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-center">
          <XCircle className="text-red-500 mx-auto mb-2" size={24} />
          <p className="text-xs font-black text-red-500 uppercase">
            Jogadores insuficientes
          </p>
          <p className="text-[9px] text-white/40 mt-1">
            Mínimo 4 jogadores necessários
          </p>
        </div>
      )}

      {/* Status do usuário */}
      {myConfirmation ? (
        <div className="flex items-center justify-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl mt-4">
          <CheckCircle2 className="text-green-500" size={18} />
          <span className="text-xs font-black text-green-500 uppercase">
            Você confirmou presença
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl mt-4">
          <XCircle className="text-red-500" size={18} />
          <span className="text-xs font-black text-red-500 uppercase">
            Você não confirmou
          </span>
        </div>
      )}

      {/* Lista de Confirmados */}
      {gameConfirmations.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/5">
          <p className="text-[9px] font-black text-white/40 uppercase mb-2">
            Lista de Confirmados ({gameConfirmations.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {gameConfirmations.map((conf, i) => (
              <div 
                key={i}
                className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg border border-white/5"
              >
                <div className={`w-1.5 h-1.5 rounded-full ${
                  conf.player?.position === 'goleiro' ? 'bg-yellow-400' : 'bg-cyan-electric'
                }`}></div>
                <span className="text-[9px] font-bold text-white/80">
                  {conf.player?.name || 'Jogador'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PresenceConfirmation;
