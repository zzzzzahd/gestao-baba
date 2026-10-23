// src/components/DrawConfigBlock.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Resumo do sorteio do dia na Visão Geral (presidente/coordenador).
//
// SOMENTE LEITURA. Antes este bloco tinha controles próprios (jogadores por
// time, suplentes) que só valiam pra este navegador e um formulário de
// convidados duplicado e incompleto. Como o sorteio automático lê as
// configurações salvas no baba (Configurações › Sorteio), qualquer ajuste local
// aqui era ignorado pelo automático — então este bloco só MOSTRA o que vai
// valer e leva o presidente ao lugar certo pra mudar.
//   • padrões do sorteio ........ Gestão › Configurações do Grupo › Sorteio
//   • convidados ................ Gestão › Convidados (e no wizard manual)
//   • restrições juntos/separados Gestão › Configurações do Grupo › Sorteio
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings2, ChevronRight } from 'lucide-react';
import {
  getDrawDefaults,
  describeStrategy,
  describeGkMode,
  isCountedConfirmation,
  getMinRequired,
} from '../services/drawService';
import { getDrawMoment, formatHM } from '../utils/drawSchedule';

const Chip = ({ label, value }) => (
  <div className="flex-1 min-w-0 px-3 py-2.5 rounded-2xl bg-surface-2 border border-border-subtle">
    <p className="text-[8px] font-black uppercase tracking-widest text-text-muted">{label}</p>
    <p className="text-[11px] font-black text-white truncate mt-0.5">{value}</p>
  </div>
);

const DrawConfigBlock = ({ currentBaba, nextGameDay, gameConfirmations, isDrawing }) => {
  const navigate = useNavigate();

  const cfg            = getDrawDefaults(currentBaba);
  const auto           = !!currentBaba?.auto_draw_enabled;
  const confirmedCount = (gameConfirmations || []).filter(isCountedConfirmation).length;
  const minRequired    = getMinRequired(cfg);
  const totalTeams     = Math.floor(confirmedCount / cfg.playersPerTeam);
  const totalMatches   = Math.floor(totalTeams / 2);
  const waiting        = confirmedCount % cfg.playersPerTeam
    + (totalTeams % 2) * cfg.playersPerTeam;

  const drawAt = auto && nextGameDay?.date instanceof Date
    ? formatHM(getDrawMoment(currentBaba, nextGameDay.date))
    : null;

  return (
    <div className="space-y-3 pt-3 border-t border-border-subtle">

      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Settings2
            size={13}
            className={`text-cyan-electric ${isDrawing ? 'animate-spin' : ''}`}
          />
          <span className="text-[10px] font-black text-text-low uppercase tracking-widest">
            Sorteio do dia
          </span>
        </div>
        <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">
          {auto ? (drawAt ? `Automático às ${drawAt}` : 'Automático') : 'Manual'}
        </span>
      </div>

      {/* O que vai valer no sorteio (padrões do baba) */}
      <div className="flex gap-2">
        <Chip label="Por time"  value={cfg.playersPerTeam} />
        <Chip label="Suplentes" value={describeStrategy(cfg.strategy)} />
        <Chip label="Goleiro"   value={describeGkMode(currentBaba?.gk_mode)} />
      </div>

      {/* Prévia — só com quórum */}
      {confirmedCount >= minRequired ? (
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: totalMatches, label: 'Partidas',   color: 'text-cyan-electric'                              },
            { value: totalTeams,   label: 'Times',      color: 'text-white'                                      },
            { value: waiting,      label: 'Aguardando', color: waiting > 0 ? 'text-yellow-500' : 'text-text-muted' },
          ].map((item) => (
            <div key={item.label} className="text-center p-3 bg-surface-2 rounded-2xl border border-border-subtle">
              <p className={`text-2xl font-black ${item.color}`}>{item.value}</p>
              <p className="text-[8px] text-text-low uppercase font-black mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-[10px] text-text-low font-black uppercase tracking-widest py-1">
          faltam {minRequired - confirmedCount} confirmação{minRequired - confirmedCount !== 1 ? 'ões' : ''} para o sorteio
        </p>
      )}

      <p className="text-[9px] text-text-muted font-bold leading-relaxed px-1">
        {auto
          ? 'Na hora marcada os times são sorteados sozinhos com estas configurações (e as restrições salvas) e ficam visíveis pra todo mundo.'
          : 'Sorteio manual: o presidente ou coordenador sorteia em Gestão › Iniciar sorteio.'}
      </p>

      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/dashboard?tab=manage')}
          className="flex-1 flex items-center justify-between px-4 py-3 rounded-2xl bg-surface-2 border border-border-subtle text-[10px] font-black uppercase text-text-mid hover:bg-surface-3 transition-colors"
        >
          Alterar padrões do sorteio <ChevronRight size={12} />
        </button>
        {!auto && confirmedCount >= minRequired && (
          <button
            onClick={() => navigate('/draw')}
            className="px-4 py-3 rounded-2xl text-[10px] font-black uppercase text-black active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg, #00f2ff, #0066ff)' }}
          >
            Sortear
          </button>
        )}
      </div>
    </div>
  );
};

export default DrawConfigBlock;
