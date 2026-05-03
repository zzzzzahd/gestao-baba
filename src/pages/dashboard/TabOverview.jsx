// src/pages/dashboard/TabOverview.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Aba "Visão Geral" do Dashboard. Fase 3.
// Conteúdo: countdown, presença, convite, config de sorteio.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Copy, Share2, RefreshCw } from 'lucide-react';
import { DAY_FULL } from '../../utils/constants';
import PresenceBlock   from '../../components/PresenceBlock';
import DrawConfigBlock from '../../components/DrawConfigBlock';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCountdown = (cd) => {
  if (!cd?.active) return null;
  const hh = String(cd.h).padStart(2, '0');
  const mm = String(cd.m).padStart(2, '0');
  const ss = String(cd.s).padStart(2, '0');
  return cd.d > 0 ? `${cd.d}d ${hh}h ${mm}m` : `${hh}:${mm}:${ss}`;
};

const formatGameDays = (baba, DAY_SHORT) => {
  if (!Array.isArray(baba?.game_days) || baba.game_days.length === 0) return null;
  const time = baba.game_time ? String(baba.game_time).substring(0, 5) : '';
  return [...new Set(baba.game_days.map(Number))]
    .filter(d => d >= 0 && d <= 6)
    .sort((a, b) => a - b)
    .map(d => `${['DOM','SEG','TER','QUA','QUI','SEX','SÁB'][d]}${time ? ' ' + time : ''}`)
    .join(' · ');
};

const computeExpiryLabel = (expiresAt) => {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expirado';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `Expira em ${h}h ${m}min` : `Expira em ${m}min`;
};

// ─── Componente ───────────────────────────────────────────────────────────────

const TabOverview = ({
  currentBaba,
  nextGameDay,
  countdown,
  gameConfirmations,
  myConfirmation,
  canConfirm,
  confirmPresence,
  cancelConfirmation,
  drawConfig,
  setDrawConfig,
  isDrawing,
  isPresident,
  loading,
  inviteExpiry,
  handleCopyCode,
  generateInviteCode,
  onShowQR,
}) => {
  const navigate       = useNavigate();
  const gameDaysDisplay = formatGameDays(currentBaba);
  const cdStr           = formatCountdown(countdown);

  return (
    <div className="space-y-5">

      {/* Countdown do próximo baba */}
      {nextGameDay && (
        <div className="bg-gradient-to-r from-cyan-electric/20 to-transparent p-[1px] rounded-[2rem] border border-cyan-electric/30">
          <div className="bg-black/40 backdrop-blur-md rounded-[2rem] p-6">
            <div className="flex justify-between items-center mb-4 text-[10px] font-black uppercase tracking-widest text-text-low">
              <span>Próximo Baba em</span>
              <span className="text-cyan-electric">
                {nextGameDay.daysAhead === 0 ? 'Hoje'
                  : nextGameDay.daysAhead === 1 ? 'Amanhã'
                  : DAY_FULL[nextGameDay.day]}
              </span>
            </div>
            <div className="flex justify-between items-end">
              <div>
                <div className="text-4xl font-black font-mono tabular-nums leading-none tracking-tighter text-white">
                  {cdStr
                    ? <span>{cdStr}</span>
                    : <span className="text-2xl uppercase text-cyan-electric animate-pulse">Em breve...</span>
                  }
                </div>
                <div className="flex items-center gap-2 mt-2 text-[10px] font-black text-text-low uppercase truncate max-w-[200px]">
                  <MapPin size={12} className="text-cyan-electric flex-shrink-0" />
                  <span className="truncate">
                    {nextGameDay.location || currentBaba?.location || 'Arena Principal'}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xl font-black text-cyan-electric italic uppercase">PARTIDA</span>
                <p className="text-[10px] font-black text-text-low uppercase tracking-widest mt-1">
                  {nextGameDay.time?.substring(0, 5)}
                </p>
              </div>
            </div>
            {gameDaysDisplay && (
              <div className="mt-4 pt-4 border-t border-border-subtle flex items-center gap-2 text-[10px] font-black text-text-low uppercase">
                <Calendar size={12} className="text-text-muted" />
                <span>{gameDaysDisplay}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Presença + Config */}
      {nextGameDay ? (
        <div className="p-5 rounded-3xl bg-surface-1 border border-border-subtle space-y-4">
          <PresenceBlock
            nextGameDay={nextGameDay}
            gameConfirmations={gameConfirmations}
            myConfirmation={myConfirmation}
            canConfirm={canConfirm}
            confirmPresence={confirmPresence}
            cancelConfirmation={cancelConfirmation}
            countdown={countdown}
            loading={loading}
            drawConfig={drawConfig}
          />

          {isPresident && canConfirm && currentBaba?.invite_code && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-surface-2 border border-border-subtle">
              <span className="text-[9px] text-text-muted font-black uppercase tracking-widest shrink-0">Convite</span>
              <span className="flex-1 text-sm font-black tracking-[0.3em] text-white text-center">
                {currentBaba.invite_code}
              </span>
              <button onClick={handleCopyCode} className="p-2 bg-cyan-electric/10 border border-cyan-electric/20 rounded-xl text-cyan-electric hover:bg-cyan-electric hover:text-black transition-all">
                <Copy size={13} />
              </button>
              <button onClick={onShowQR} className="p-2 bg-surface-2 border border-border-subtle rounded-xl text-text-low hover:text-white transition-all">
                <Share2 size={13} />
              </button>
              <button onClick={generateInviteCode} className="p-2 bg-surface-2 border border-border-subtle rounded-xl text-text-muted hover:text-white transition-all">
                <RefreshCw size={13} />
              </button>
            </div>
          )}

          {isPresident && canConfirm && (
            <DrawConfigBlock
              drawConfig={drawConfig}
              setDrawConfig={setDrawConfig}
              gameConfirmations={gameConfirmations}
              isDrawing={isDrawing}
              nextGameDay={nextGameDay}
            />
          )}

          {isDrawing && (
            <div className="flex items-center justify-center gap-3 py-5 border border-cyan-electric/20 rounded-2xl bg-cyan-electric/5">
              <RefreshCw size={14} className="text-cyan-electric animate-spin" />
              <span className="text-[11px] font-black text-cyan-electric uppercase tracking-widest">
                Sorteando automaticamente...
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-10 rounded-3xl bg-surface-1 border border-dashed border-border-mid space-y-3">
          <Calendar size={32} className="text-text-muted mx-auto" />
          <p className="text-[10px] text-text-muted font-black uppercase tracking-widest">
            Nenhum baba agendado
          </p>
          {isPresident && (
            <p className="text-[9px] text-text-muted font-bold">
              Configure os dias do baba nas configurações do grupo
            </p>
          )}
        </div>
      )}

      {/* Convite sem jogo agendado */}
      {isPresident && !nextGameDay && (
        <div className="p-6 rounded-[2.5rem] border border-cyan-electric/20 bg-cyan-electric/5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-cyan-electric">Convite do Grupo</h3>
              <p className="text-[9px] text-text-low font-bold uppercase">
                {inviteExpiry || 'Gere um novo código'}
              </p>
            </div>
            <button className="p-2 bg-cyan-electric/10 rounded-xl" onClick={onShowQR}>
              <Share2 size={16} className="text-cyan-electric" />
            </button>
          </div>
          {currentBaba?.invite_code ? (
            <>
              <div className="flex gap-2">
                <div className="flex-1 bg-black/60 border border-border-mid rounded-2xl p-4 flex items-center justify-center">
                  <span className="text-2xl font-black tracking-[0.4em] text-white">{currentBaba.invite_code}</span>
                </div>
                <button onClick={handleCopyCode} className="px-6 bg-cyan-electric text-black rounded-2xl font-black uppercase text-[10px] flex items-center gap-2 active:scale-95 transition-all">
                  <Copy size={14} /> Copiar
                </button>
              </div>
              <div className="flex justify-center">
                <button onClick={generateInviteCode} className="text-[9px] font-black uppercase text-text-muted hover:text-cyan-electric transition-colors flex items-center gap-2">
                  <RefreshCw size={10} /> Atualizar Código
                </button>
              </div>
            </>
          ) : (
            <button onClick={generateInviteCode} className="w-full py-5 bg-surface-2 border border-dashed border-border-strong rounded-2xl text-[10px] font-black uppercase hover:border-cyan-electric/50 transition-all flex items-center justify-center gap-2">
              <RefreshCw size={14} className="animate-pulse" /> Gerar Código de Convite
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TabOverview;
