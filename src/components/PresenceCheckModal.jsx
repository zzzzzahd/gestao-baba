// src/components/PresenceCheckModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Conferência de presença exibida antes da primeira partida de cada time
// sorteado. Presidente/coordenador marca quem faltou ou chegou atrasado;
// faltas disparam substituição automática (reserva → lista de espera).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useMemo } from 'react';
import { X, UserCheck, UserX, Clock3, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { fetchConfirmations } from '../services/matchService';
import {
  recordAttendanceEvent,
  pickSubstitute,
  applyAbsenceToTeams,
  persistDrawResultTeams,
  confirmWaitlistSubstitute,
} from '../services/attendanceService';
import toast from 'react-hot-toast';

const STATUS_CYCLE = ['present', 'no_show', 'late'];

const STATUS_META = {
  present: { label: 'Presente', icon: UserCheck, color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/20' },
  no_show: { label: 'Faltou',   icon: UserX,     color: 'text-red-400',   bg: 'bg-red-400/10 border-red-400/20' },
  late:    { label: 'Atrasado', icon: Clock3,    color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20' },
};

const PresenceCheckModal = ({ babaId, gameDate, teams, reserves, onCancel, onConfirmed }) => {
  const { user } = useAuth();
  const [statuses,    setStatuses]    = useState({});
  const [waitlist,    setWaitlist]    = useState([]);
  const [saving,       setSaving]      = useState(false);

  const allPlayers = useMemo(
    () => teams.flatMap(t => (t.players || []).map(p => ({ ...p, teamName: t.name }))),
    [teams],
  );

  useEffect(() => {
    fetchConfirmations(babaId, gameDate)
      .then(confs => setWaitlist(confs.filter(c => c.status === 'waitlist')))
      .catch(err => console.error('[PresenceCheckModal] fetchConfirmations:', err));
  }, [babaId, gameDate]);

  const cycleStatus = (playerId) => {
    setStatuses(prev => {
      const current = prev[playerId] || 'present';
      const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length];
      return { ...prev, [playerId]: next };
    });
  };

  const handleConfirm = async () => {
    const absentIds = Object.entries(statuses).filter(([, s]) => s === 'no_show').map(([id]) => id);
    const lateIds    = Object.entries(statuses).filter(([, s]) => s === 'late').map(([id]) => id);

    if (absentIds.length === 0 && lateIds.length === 0) {
      onConfirmed({ teams, reserves });
      return;
    }

    setSaving(true);
    try {
      let workingTeams    = teams;
      let workingReserves = reserves;
      const usedWaitlistConfirmationIds = new Set();

      for (const absentId of absentIds) {
        const alreadyUsedIds = [
          ...workingTeams.flatMap(t => t.players.map(p => p.id)),
          ...workingReserves.map(p => p.id),
        ];

        const freeWaitlist = waitlist.filter(c => !usedWaitlistConfirmationIds.has(c.id));
        const picked = pickSubstitute({
          reserves: workingReserves,
          waitlistConfirmations: freeWaitlist,
          excludePlayerIds: alreadyUsedIds,
        });

        const substitute = picked ? { ...picked.player, __source: picked.source } : null;

        const result = applyAbsenceToTeams({
          teams: workingTeams,
          reserves: workingReserves,
          absentPlayerId: absentId,
          substitute,
        });
        workingTeams    = result.teams;
        workingReserves = result.reserves;

        await recordAttendanceEvent({
          babaId,
          playerId: absentId,
          gameDate,
          type: 'no_show',
          replacedByPlayerId: substitute?.id,
          createdBy: user?.id,
        });

        if (picked?.source === 'waitlist') {
          usedWaitlistConfirmationIds.add(picked.confirmationId);
          await confirmWaitlistSubstitute(picked.confirmationId);
        }

        if (!substitute) {
          toast(`${allPlayers.find(p => p.id === absentId)?.name || 'Jogador'} saiu sem substituto — sem reserva disponível`, { icon: '⚠️' });
        }
      }

      for (const lateId of lateIds) {
        await recordAttendanceEvent({ babaId, playerId: lateId, gameDate, type: 'late', createdBy: user?.id });
      }

      await persistDrawResultTeams(babaId, gameDate, workingTeams, workingReserves);

      toast.success('Presença conferida!');
      onConfirmed({ teams: workingTeams, reserves: workingReserves });
    } catch (err) {
      console.error('[PresenceCheckModal] confirm:', err);
      toast.error(err.message || 'Erro ao conferir presença');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[#0d0d0d] border border-border-mid rounded-t-3xl sm:rounded-3xl p-6 max-w-md w-full max-h-[85vh] flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black uppercase italic tracking-tighter">Todos presentes?</h3>
            <p className="text-[10px] text-text-muted font-bold mt-0.5">Toque no jogador para marcar falta ou atraso</p>
          </div>
          <button onClick={onCancel} className="text-text-low hover:text-white shrink-0">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 -mx-1 px-1">
          {allPlayers.map(p => {
            const status = statuses[p.id] || 'present';
            const meta   = STATUS_META[status];
            const Icon   = meta.icon;
            return (
              <button
                key={p.id}
                onClick={() => cycleStatus(p.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all active:scale-[0.98] ${meta.bg}`}
              >
                <Icon size={16} className={`${meta.color} shrink-0`} />
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-[11px] font-black uppercase truncate">{p.name}</p>
                  <p className="text-[9px] text-text-muted uppercase">{p.teamName}</p>
                </div>
                <span className={`text-[9px] font-black uppercase shrink-0 ${meta.color}`}>{meta.label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={handleConfirm}
          disabled={saving}
          className="w-full py-4 rounded-2xl font-black uppercase italic tracking-tighter text-black flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #00f2ff, #0066ff)' }}
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : 'Confirmar e iniciar partida'}
        </button>
      </div>
    </div>
  );
};

export default PresenceCheckModal;
