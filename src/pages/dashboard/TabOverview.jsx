// src/pages/dashboard/TabOverview.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Aba "Visão Geral" do Dashboard.
// Sprint 9: integração do WaitlistPanel + share via /join/:code
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Copy, Share2, RefreshCw, CheckCircle2 } from 'lucide-react';
import { DAY_FULL } from '../../utils/constants';
import PresenceBlock  from '../../components/PresenceBlock';
import DrawConfigBlock from '../../components/DrawConfigBlock';
import WaitlistPanel  from '../../components/WaitlistPanel'; // ← Sprint 9

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCountdown = (cd) => {
  if (!cd?.active) return null;
  const hh = String(cd.h).padStart(2, '0');
  const mm = String(cd.m).padStart(2, '0');
  const ss = String(cd.s).padStart(2, '0');
  return cd.d > 0 ? `${cd.d}d ${hh}h ${mm}m` : `${hh}:${mm}:${ss}`;
};

const formatGameDays = (baba) => {
  if (!Array.isArray(baba?.game_days) || baba.game_days.length === 0) return null;
  const time = baba.game_time ? String(baba.game_time).substring(0, 5) : '';
  return [...new Set(baba.game_days.map(Number))]
    .filter(d => d >= 0 && d <= 6)
    .sort((a, b) => a - b)
    .map(d => `${['DOM','SEG','TER','QUA','QUI','SEX','SÁB'][d]}${time ? ' ' + time : ''}`)
    .join(' · ');
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
  reloadConfirmations, // ← Sprint 9
  drawConfig,
  setDrawConfig,
  isDrawing,
  isPresident,
  loading,
  inviteExpiry,
  handleCopyCode,
  copied,
  generateInviteCode,
  onShowQR,
}) => {
  const navigate        = useNavigate();
  const gameDaysDisplay = formatGameDays(currentBaba);
  const cdStr           = formatCountdown(countdown);

  // Sprint 9: share via /join/:code em vez de ?code=
  const handleShareJoinLink = () => {
    if (!currentBaba?.invite_code) return;
    const url  = `${window.location.origin}/join/${currentBaba.invite_code}`;
    const text = `Entra no nosso baba "${currentBaba.name}"! 🏟️`;
    if (navigator.share) {
      navigator.share({ title: text, url }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
    }
  };

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

      {/* Presença + Config + Waitlist */}
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

          {/* ── Sprint 9: Lista de Espera ── */}
          {gameConfirmations.some(c => c.status === 'waitlist') && (
            <div className="pt-3 border-t border-border-subtle">
              <WaitlistPanel
                gameConfirmations={gameConfirmations}
                isPresident={isPresident}
                onUpdate={reloadConfirmations}
              />
            </div>
          )}

          {/* Convite com share via /join/:code */}
          {isPresident && canConfirm && currentBaba?.invite_code && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-surface-2 border border-border-subtle">
              <span className="text-[9px] text-text-muted font-black uppercase tracking-widest shrink-0">Convite</span>
              <span className="flex-1 text-sm font-black tracking-[0.3em] text-white text-center">
                {currentBaba.invite_code}
              </span>
              <button onClick={handleCopyCode} className={`p-2 rounded-xl border transition-all duration-300 ${
                copied
                  ? 'bg-green-500/20 border-green-500/30 text-green-400'
                  : 'bg-cyan-electric/10 border-cyan-electric/20 text-cyan-electric hover:bg-cyan-electric hover:text-black'
              }`}>
                {copied ? <CheckCircle2 size={13} /> : <Copy size={13} />}
              </button>
              {/* Sprint 9: share via /join/:code */}
              <button
                onClick={handleShareJoinLink}
                className="p-2 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 hover:bg-green-500/20 transition-all"
                title="Compartilhar link de entrada"
              >
                <Share2 size={13} />
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
              {/* Sprint 9: botão share WhatsApp com /join/:code */}
              <button
                onClick={handleShareJoinLink}
                className="w-full py-3 bg-green-500/10 border border-green-500/20 rounded-2xl text-green-400 font-black uppercase text-[10px] flex items-center justify-center gap-2 hover:bg-green-500/20 transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                Compartilhar link de entrada
              </button>
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
