// src/pages/dashboard/TabOverview.jsx
// Sprint 13 — InvitesPanel + Sprint 7 — ActivityFeed visível

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Link2, RefreshCw, Activity } from 'lucide-react';
import PresenceBlock       from '../../components/PresenceBlock';
import DrawConfigBlock     from '../../components/DrawConfigBlock';
import WaitlistPanel       from '../../components/WaitlistPanel';
import InvitesPanel        from '../../components/InvitesPanel';
import ActivityFeed        from '../../components/ActivityFeed';

const TabOverview = ({
  currentBaba,
  nextGameDay,
  countdown,
  gameConfirmations,
  myConfirmation,
  canConfirm,
  reloadConfirmations,
  drawConfig,
  setDrawConfig,
  isDrawing,
  isPresident,
  loading,
}) => {
  const navigate        = useNavigate();
  const [showInvites,  setShowInvites]  = useState(!nextGameDay);
  const [showActivity, setShowActivity] = useState(true);


  return (
    <div className="space-y-5">

      {/* Presença + Waitlist + Sorteio */}
      {nextGameDay ? (
        <div className="p-5 rounded-3xl bg-surface-1 border border-border-subtle space-y-4">
          <PresenceBlock
            nextGameDay={nextGameDay}
            gameConfirmations={gameConfirmations}
            myConfirmation={myConfirmation}
            canConfirm={canConfirm}
            countdown={countdown}
            loading={loading}
            drawConfig={drawConfig}
            currentBaba={currentBaba}
            onReload={reloadConfirmations}
          />

          {gameConfirmations.some(c => c.status === 'waitlist') && (
            <div className="pt-3 border-t border-border-subtle">
              <WaitlistPanel
                gameConfirmations={gameConfirmations}
                isPresident={isPresident}
                onUpdate={reloadConfirmations}
              />
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

      {/* ── ACTIVITY FEED (Sprint 7) ── */}
      <div className="rounded-3xl bg-surface-1 border border-border-subtle overflow-hidden">
        <button
          onClick={() => setShowActivity(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-2/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-cyan-electric" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white">
              Atividades Recentes
            </span>
          </div>
          <span className="text-[9px] font-black text-text-low uppercase">
            {showActivity ? 'Fechar' : 'Ver'}
          </span>
        </button>
        {showActivity && (
          <div className="px-5 pb-5 border-t border-border-subtle pt-4">
            <ActivityFeed babaId={currentBaba?.id} limit={8} />
          </div>
        )}
      </div>

      {/* Convidar Atletas — único ponto de convite (código principal + QR + convites específicos) */}
      {isPresident && (
        <div className="rounded-3xl bg-surface-1 border border-border-subtle overflow-hidden">
          <button
            onClick={() => setShowInvites(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-2/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Link2 size={14} className="text-cyan-electric" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Convidar Atletas</span>
            </div>
            <span className="text-[9px] font-black text-text-low uppercase">
              {showInvites ? 'Fechar' : 'Abrir'}
            </span>
          </button>
          {showInvites && (
            <div className="px-5 pb-5 border-t border-border-subtle">
              <div className="pt-4">
                <InvitesPanel babaId={currentBaba?.id} babaName={currentBaba?.name} isPresident={isPresident} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TabOverview;