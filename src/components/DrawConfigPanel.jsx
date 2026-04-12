import React from 'react';
import { useBaba } from '../contexts/BabaContext';
import { Users, Settings2, Swords } from 'lucide-react';

const DrawConfigPanel = () => {
  const { drawConfig, setDrawConfig, gameConfirmations, isDrawing } = useBaba();

  // ✅ 1. FALLBACK SEGURO (Impede quebra no primeiro render)
  const safeConfig = drawConfig || { playersPerTeam: 5, strategy: 'reserve' };
  const confirmedCount = gameConfirmations?.length || 0;
  const minRequired = safeConfig.playersPerTeam * 2;

  // ✅ 2. SET MAIS SEGURO (Padrão funcional para evitar Race Conditions)
  const handlePlayersPerTeamChange = (delta) => {
    const newValue = Math.max(2, Math.min(11, safeConfig.playersPerTeam + delta));
    setDrawConfig(prev => ({ ...prev, playersPerTeam: newValue }));
  };

  const handleStrategyChange = (strategy) => {
    setDrawConfig(prev => ({ ...prev, strategy }));
  };

  // ✅ 3. CÁLCULO DE TIMES E PARTIDAS (Precisão matemática)
  const totalTeams = Math.floor(confirmedCount / safeConfig.playersPerTeam);
  const totalMatches = Math.floor(totalTeams / 2);
  const extraTeams = totalTeams % 2; // Time que sobra sem adversário imediato
  const reserves = confirmedCount % safeConfig.playersPerTeam;

  return (
    <div className="card-glass p-6 rounded-[2rem] border border-cyan-electric/30 bg-cyan-electric/5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Settings2 className={`text-cyan-electric ${isDrawing ? 'animate-spin' : ''}`} size={20} />
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-white">
            Configuração do Sorteio
          </h3>
          <p className="text-[9px] font-black text-cyan-electric/60 uppercase tracking-widest">
            {isDrawing ? 'Sorteio em andamento...' : 'Apenas Presidente'}
          </p>
        </div>
      </div>

      {/* Jogadores por Time */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="text-cyan-electric" size={16} />
            <span className="text-xs font-black uppercase text-white/80">
              Jogadores por Time
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handlePlayersPerTeamChange(-1)}
              disabled={isDrawing} // ✅ Bloqueio de segurança
              className="w-8 h-8 bg-white/5 rounded-lg border border-white/10 font-black text-lg hover:bg-white/10 active:scale-90 transition-all disabled:opacity-30"
            >
              -
            </button>
            <span className="text-2xl font-black w-10 text-center text-cyan-electric">
              {safeConfig.playersPerTeam}
            </span>
            <button
              onClick={() => handlePlayersPerTeamChange(1)}
              disabled={isDrawing}
              className="w-8 h-8 bg-white/5 rounded-lg border border-white/10 font-black text-lg hover:bg-white/10 active:scale-90 transition-all disabled:opacity-30"
            >
              +
            </button>
          </div>
        </div>
        <p className="text-[9px] text-white/40 text-center italic">
          Configurado para {safeConfig.playersPerTeam} vs {safeConfig.playersPerTeam}
        </p>
      </div>

      {/* Estratégia de Sobras */}
      <div className="mb-6">
        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3">
          Estratégia para suplentes:
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleStrategyChange('reserve')}
            disabled={isDrawing}
            className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${
              safeConfig.strategy === 'reserve'
                ? 'bg-cyan-electric text-black border-cyan-electric shadow-[0_0_15px_rgba(0,242,255,0.3)]'
                : 'bg-white/5 text-white/40 border-white/10 hover:border-white/20'
            } disabled:opacity-50`}
          >
            Ficar na Reserva
          </button>
          <button
            onClick={() => handleStrategyChange('substitute')}
            disabled={isDrawing}
            className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${
              safeConfig.strategy === 'substitute'
                ? 'bg-cyan-electric text-black border-cyan-electric shadow-[0_0_15px_rgba(0,242,255,0.3)]'
                : 'bg-white/5 text-white/40 border-white/10 hover:border-white/20'
            } disabled:opacity-50`}
          >
            Time Incompleto
          </button>
        </div>
      </div>

      {/* ✅ ESTIMATIVA PREMIUM (Cálculo de Partidas + Sobras) */}
      {confirmedCount >= minRequired ? (
        <div className="p-4 bg-black/30 rounded-xl border border-white/10">
          <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-3">
            Simulação do Próximo Baba:
          </p>
          
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <p className="text-xl font-black text-cyan-electric">{totalMatches}</p>
              <p className="text-[7px] font-black text-white/30 uppercase leading-tight">Partidas<br/>Iniciais</p>
            </div>
            
            <div className="text-center border-x border-white/5">
              <p className="text-xl font-black text-white">{totalTeams}</p>
              <p className="text-[7px] font-black text-white/30 uppercase leading-tight">Total de<br/>Times</p>
            </div>

            <div className="text-center">
              <p className={`text-xl font-black ${reserves > 0 ? 'text-yellow-500' : 'text-white/20'}`}>
                {reserves + (extraTeams * safeConfig.playersPerTeam)}
              </p>
              <p className="text-[7px] font-black text-white/30 uppercase leading-tight">Atletas<br/>Aguardando</p>
            </div>
          </div>

          {extraTeams > 0 && (
            <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-center gap-2">
              <Swords size={12} className="text-yellow-500" />
              <p className="text-[8px] font-bold text-yellow-500/80 uppercase">
                {extraTeams} time(s) aguardando próxima partida
              </p>
            </div>
          )}
        </div>
      ) : (
        /* ✅ PADRONIZAÇÃO VISUAL (Igual ao Presence) */
        <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/30 text-center">
          <p className="text-xs font-black text-red-500 flex items-center justify-center gap-2">
            <span>⚠️ {confirmedCount} de {minRequired} confirmados</span>
          </p>
          <p className="text-[8px] text-white/30 uppercase mt-1">
            Mínimo de 2 times necessário para o sorteio
          </p>
        </div>
      )}
    </div>
  );
};

export default DrawConfigPanel;
