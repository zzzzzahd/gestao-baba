import React from 'react';
import { useBaba } from '../contexts/BabaContext';
import { Users, Settings2 } from 'lucide-react';

const DrawConfigPanel = () => {
  const { drawConfig, setDrawConfig, gameConfirmations } = useBaba();

  const handlePlayersPerTeamChange = (delta) => {
    const newValue = Math.max(2, Math.min(11, drawConfig.playersPerTeam + delta));
    setDrawConfig({ ...drawConfig, playersPerTeam: newValue });
  };

  const handleStrategyChange = (strategy) => {
    setDrawConfig({ ...drawConfig, strategy });
  };

  // Calcular estimativas
  const confirmedCount = gameConfirmations?.length || 0;
  const estimatedTeams = Math.floor(confirmedCount / drawConfig.playersPerTeam);
  const estimatedReserves = confirmedCount % drawConfig.playersPerTeam;

  return (
    <div className="card-glass p-6 rounded-[2rem] border border-cyan-electric/30 bg-cyan-electric/5">
      <div className="flex items-center gap-3 mb-6">
        <Settings2 className="text-cyan-electric" size={20} />
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-white">
            Configuração do Sorteio
          </h3>
          <p className="text-[9px] font-black text-cyan-electric/60 uppercase tracking-widest">
            Apenas Presidente
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
              className="w-8 h-8 bg-white/5 rounded-lg border border-white/10 font-black text-lg hover:bg-white/10 active:scale-90 transition-all"
            >
              -
            </button>
            <span className="text-2xl font-black w-10 text-center text-cyan-electric">
              {drawConfig.playersPerTeam}
            </span>
            <button
              onClick={() => handlePlayersPerTeamChange(1)}
              className="w-8 h-8 bg-white/5 rounded-lg border border-white/10 font-black text-lg hover:bg-white/10 active:scale-90 transition-all"
            >
              +
            </button>
          </div>
        </div>
        <p className="text-[9px] text-white/40 text-center">
          Mínimo 2 • Máximo 11
        </p>
      </div>

      {/* Estratégia de Sobras */}
      <div className="mb-6">
        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3">
          Se a conta não for exata:
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleStrategyChange('reserve')}
            className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${
              drawConfig.strategy === 'reserve'
                ? 'bg-cyan-electric text-black border-cyan-electric shadow-[0_0_15px_rgba(0,242,255,0.3)]'
                : 'bg-white/5 text-white/40 border-white/10 hover:border-white/20'
            }`}
          >
            Ficar na Reserva
          </button>
          <button
            onClick={() => handleStrategyChange('substitute')}
            className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${
              drawConfig.strategy === 'substitute'
                ? 'bg-cyan-electric text-black border-cyan-electric shadow-[0_0_15px_rgba(0,242,255,0.3)]'
                : 'bg-white/5 text-white/40 border-white/10 hover:border-white/20'
            }`}
          >
            Time Incompleto
          </button>
        </div>
      </div>

      {/* Estimativa */}
      {confirmedCount >= drawConfig.playersPerTeam * 2 && (
        <div className="p-4 bg-black/30 rounded-xl border border-white/10">
          <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-2">
            Estimativa com {confirmedCount} confirmados:
          </p>
          <div className="flex justify-between items-center">
            <div className="text-center flex-1">
              <p className="text-2xl font-black text-cyan-electric">
                {estimatedTeams}
              </p>
              <p className="text-[8px] font-black text-white/40 uppercase">
                Times
              </p>
            </div>
            {estimatedReserves > 0 && (
              <>
                <div className="text-xl font-black text-white/20">+</div>
                <div className="text-center flex-1">
                  <p className="text-2xl font-black text-yellow-500">
                    {estimatedReserves}
                  </p>
                  <p className="text-[8px] font-black text-white/40 uppercase">
                    {drawConfig.strategy === 'reserve' ? 'Reservas' : 'Suplentes'}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {confirmedCount < drawConfig.playersPerTeam * 2 && (
        <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/30 text-center">
          <p className="text-xs font-black text-red-500">
            ⚠️ Mínimo {drawConfig.playersPerTeam * 2} confirmados necessário
          </p>
        </div>
      )}
    </div>
  );
};

export default DrawConfigPanel;
