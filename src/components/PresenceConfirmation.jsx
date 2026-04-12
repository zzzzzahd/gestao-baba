import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useBaba } from '../contexts/BabaContext';
import { Clock, CheckCircle2, XCircle, Users, AlertCircle, Zap } from 'lucide-react';

const DAY_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const PresenceConfirmation = () => {
  const navigate = useNavigate();
  const {
    gameConfirmations,
    myConfirmation,
    canConfirm,
    confirmationDeadline,
    confirmPresence,
    cancelConfirmation,
    loading,
    currentMatch,
    isDrawing,
    nextGameDay,
    countdown,
    drawConfig,
  } = useBaba();

  // Helpers de Formatação
  const getGameTime = () => nextGameDay?.time?.substring(0, 5) || '--:--';
  const getDeadlineTime = () => {
    if (!confirmationDeadline) return '--:--';
    return confirmationDeadline.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  // ✅ CORREÇÃO SEGURA: Fallback para evitar quebra caso drawConfig demore
  const minPlayersRequired = (drawConfig?.playersPerTeam || 5) * 2;

  // ── ESTADO 1: SEM JOGO AGENDADO ──
  if (!nextGameDay) {
    return (
      <div className="card-glass p-6 rounded-[2rem] border border-white/10 bg-white/5">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="text-white/30" size={18} />
          <h3 className="text-sm font-black uppercase tracking-wider text-white/40">
            Confirmação de Presença
          </h3>
        </div>
        <p className="text-xs text-white/30 text-center py-3 italic">
          Nenhum jogo agendado no momento.
        </p>
      </div>
    );
  }

  // ── ESTADO 2: PERÍODO DE CONFIRMAÇÃO ABERTO ──
  if (canConfirm) {
    return (
      <div className="card-glass p-6 rounded-[2rem] border border-cyan-electric/20 bg-cyan-electric/5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="text-cyan-electric" size={20} />
            <h3 className="text-sm font-black uppercase tracking-wider">Confirmar Presença</h3>
          </div>
          <div className="flex items-center gap-2 bg-cyan-electric/10 px-3 py-1 rounded-xl">
            <Users size={14} className="text-cyan-electric" />
            <span className="text-xs font-black text-cyan-electric">
              {gameConfirmations.length} confirmado{gameConfirmations.length !== 1 && 's'}
            </span>
          </div>
        </div>

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

        {/* ✅ CRONÔMETRO COM PADSTART (Sincronizado e sem pulos visuais) */}
        <div className="mb-4 p-4 bg-black/20 rounded-xl border border-white/5 text-center">
          <p className="text-[9px] font-black text-white/40 uppercase mb-2">Tempo Restante</p>
          <p className={`text-2xl font-black font-mono ${
            countdown.d > 0 || countdown.h > 0 || countdown.m >= 5 
              ? 'text-green-400' 
              : 'text-red-500 animate-pulse'
          }`}>
            {countdown.active 
              ? `${countdown.d > 0 ? countdown.d + 'd ' : ''}${String(countdown.h).padStart(2, '0')}:${String(countdown.m).padStart(2, '0')}:${String(countdown.s).padStart(2, '0')}` 
              : 'Encerrado'}
          </p>
        </div>

        {myConfirmation ? (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
              <CheckCircle2 className="text-green-500" size={20} />
              <span className="text-sm font-black text-green-500 uppercase">Presença Confirmada</span>
            </div>
            <button
              onClick={() => cancelConfirmation()}
              disabled={loading}
              className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-white/60 text-xs font-black uppercase hover:bg-white/10 transition-all"
            >
              {loading ? 'Processando...' : 'Cancelar Presença'}
            </button>
          </div>
        ) : (
          <button
            onClick={() => confirmPresence()}
            disabled={loading}
            className="w-full py-5 rounded-2xl bg-gradient-to-r from-cyan-electric to-blue-600 text-black font-black uppercase italic tracking-tighter shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? 'Confirmando...' : '✓ Confirmar Presença'}
          </button>
        )}
      </div>
    );
  }

  // ── ESTADO 3: PRAZO ENCERRADO / SORTEIO EM ANDAMENTO ──
  return (
    <div className="card-glass p-6 rounded-[2rem] border border-yellow-500/20 bg-yellow-500/5">
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle className="text-yellow-500" size={20} />
        <h3 className="text-sm font-black uppercase tracking-wider text-yellow-500">
          Prazo Encerrado
        </h3>
      </div>

      <div className="mb-4 p-4 bg-black/20 rounded-xl border border-white/5 text-center">
        <div className="flex items-center justify-center gap-2">
          <Users className="text-cyan-electric" size={16} />
          <span className="text-lg font-black text-cyan-electric">
             {/* ✅ UX MELHORADA: Texto mais fluido */}
            {gameConfirmations.length} confirmados de {minPlayersRequired}
          </span>
        </div>
      </div>

      {isDrawing ? (
        <div className="p-4 bg-cyan-electric/10 border border-cyan-electric/30 rounded-xl text-center">
          <div className="w-8 h-8 border-4 border-cyan-electric border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs font-black text-cyan-electric uppercase">Gerando Escalação...</p>
        </div>
      ) : currentMatch ? (
        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-center">
          <CheckCircle2 className="text-green-500 mx-auto mb-2" size={24} />
          <p className="text-xs font-black text-green-500 uppercase mb-3">Times Definidos!</p>
          <button
            onClick={() => navigate('/teams')}
            className="w-full py-3 bg-green-500 text-black font-black uppercase text-xs rounded-xl hover:bg-green-400 transition-all"
          >
            Ver Confrontos
          </button>
        </div>
      ) : gameConfirmations.length >= minPlayersRequired ? (
        <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-center">
          <p className="text-[9px] font-black text-white/40 uppercase mb-2 italic">
            Processando sorteio automático...
          </p>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-cyan-electric rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-cyan-electric rounded-full animate-bounce [animation-delay:0.2s]" />
            <div className="w-2 h-2 bg-cyan-electric rounded-full animate-bounce [animation-delay:0.4s]" />
          </div>
        </div>
      ) : (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-center">
          <XCircle className="text-red-500 mx-auto mb-2" size={24} />
          <p className="text-xs font-black text-red-500 uppercase">Quórum Insuficiente</p>
          <p className="text-[9px] text-white/40 mt-1">Mínimo necessário: {minPlayersRequired} atletas.</p>
        </div>
      )}

      <div className={`flex items-center justify-center gap-2 p-3 rounded-xl mt-4 border ${
        myConfirmation ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'
      }`}>
        {myConfirmation ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
        <span className="text-[10px] font-black uppercase">
          {myConfirmation ? 'Você participou deste sorteio' : 'Você ficou de fora'}
        </span>
      </div>
    </div>
  );
};

export default PresenceConfirmation;
