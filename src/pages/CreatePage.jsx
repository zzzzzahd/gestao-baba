// src/pages/CreatePage.jsx
// Sprint 9.5 — Refatorado: lógica no useCreateWizard, UI em 3 steps separados.
// Rascunho salvo automaticamente no localStorage.

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBaba } from '../contexts/BabaContext';
import { ArrowLeft, Check, ChevronRight, Copy, Share2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

import { useCreateWizard } from '../hooks/useCreateWizard';
import StepIdentity from './create/StepIdentity';
import StepSchedule from './create/StepSchedule';
import StepConfirm  from './create/StepConfirm';

// ── Tela de sucesso ───────────────────────────────────────────────────────────

const SuccessScreen = ({ baba, onEnterDashboard }) => {
  const inviteCode = baba?.invite_code || '——';

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteCode);
    toast.success('Código copiado!');
  };

  const handleShare = async () => {
    const url  = `${window.location.origin}/join/${inviteCode}`;
    const text = `Entra no meu baba "${baba?.name}"! 🏟️`;
    if (navigator.share) {
      try { await navigator.share({ title: baba?.name, text, url }); } catch {}
    } else {
      navigator.clipboard.writeText(`${text} ${url}`);
      toast.success('Link copiado!');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6 py-12 space-y-8">
      <div
        className="w-24 h-24 rounded-[2rem] flex items-center justify-center shadow-[0_0_60px_rgba(0,242,255,0.2)]"
        style={{ background: 'linear-gradient(135deg, rgba(0,242,255,0.15), rgba(0,102,255,0.1))' }}
      >
        <Check size={40} className="text-cyan-electric" strokeWidth={3} />
      </div>

      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black italic uppercase tracking-tighter">Baba Criado!</h1>
        <p className="text-text-low text-sm">{baba?.name}</p>
      </div>

      {/* Código de convite */}
      <div className="w-full max-w-xs space-y-3">
        <p className="text-[9px] text-text-low font-black uppercase tracking-widest text-center">
          Código de convite
        </p>
        <div className="flex items-center gap-3 p-4 rounded-2xl border border-cyan-electric/20 bg-cyan-electric/5">
          <span className="flex-1 text-center text-2xl font-black tracking-[0.4em] text-white">
            {inviteCode}
          </span>
          <button
            onClick={handleCopy}
            className="p-2 rounded-xl bg-cyan-electric/10 border border-cyan-electric/20 text-cyan-electric hover:bg-cyan-electric hover:text-black transition-all"
          >
            <Copy size={16} />
          </button>
        </div>
        <p className="text-[10px] text-text-muted text-center">
          Compartilhe o link para seus jogadores entrarem diretamente.
        </p>
      </div>

      <div className="w-full max-w-xs space-y-3">
        <button
          onClick={handleShare}
          className="w-full py-4 rounded-2xl font-black uppercase text-sm flex items-center justify-center gap-2 active:scale-95 transition-all text-black"
          style={{ background: 'linear-gradient(135deg, #00f2ff, #0066ff)' }}
        >
          <Share2 size={18} /> Compartilhar Convite
        </button>
        <button
          onClick={onEnterDashboard}
          className="w-full py-4 rounded-2xl font-black uppercase text-sm flex items-center justify-center gap-2 active:scale-95 transition-all bg-surface-2 border border-border-mid text-text-mid hover:text-white hover:bg-surface-3"
        >
          Entrar no Baba <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};

// ── CreatePage ─────────────────────────────────────────────────────────────────

const STEP_LABELS = ['Info', 'Dias', 'Confirmar'];

const CreatePage = () => {
  const navigate = useNavigate();
  const { createBaba, setCurrentBaba } = useBaba();

  const wizard = useCreateWizard();
  const {
    form, step,
    dayEditing, setDayEditing,
    set, toggleDay, updateDayField,
    canProceed, goNext, goBack,
    resetWizard, buildPayload,
    MIN_PER_TEAM, MAX_PER_TEAM,
  } = wizard;

  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState(null);
  const [createdBaba, setCreatedBaba] = useState(null);

  const handleCreate = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const payload = buildPayload();
      const baba    = await createBaba(payload);
      if (!baba) throw new Error('Erro ao criar baba. Tente novamente.');
      if (typeof setCurrentBaba === 'function') setCurrentBaba(baba);
      resetWizard(); // limpa rascunho ao criar com sucesso
      setCreatedBaba(baba);
    } catch (err) {
      setError(err?.message || 'Erro desconhecido');
    } finally {
      setSaving(false);
    }
  };

  if (createdBaba) {
    return (
      <SuccessScreen
        baba={createdBaba}
        onEnterDashboard={() => navigate('/dashboard')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">

      {/* Header com progresso */}
      <div className="flex items-center gap-4 px-6 pt-6 pb-4">
        <button
          onClick={() => step > 1 ? goBack() : navigate('/home')}
          className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center border border-border-mid active:scale-90 transition-transform"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <h1 className="font-black uppercase text-sm">Criar Baba</h1>
          <p className="text-[10px] text-text-low">Passo {step} de {STEP_LABELS.length}</p>
        </div>
        {/* Indicador de rascunho salvo */}
        <span className="text-[8px] text-text-muted font-bold uppercase tracking-widest">
          💾 salvo
        </span>
      </div>

      {/* Barra de progresso */}
      <div className="px-6 mb-6">
        <div className="flex gap-1">
          {STEP_LABELS.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full flex-1 transition-all duration-300 ${
                i + 1 <= step ? 'bg-cyan-electric' : 'bg-surface-3'
              }`}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1">
          {STEP_LABELS.map((label, i) => (
            <span
              key={i}
              className={`text-[8px] font-black uppercase transition-colors ${
                i + 1 === step ? 'text-cyan-electric' : 'text-text-muted'
              }`}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Conteúdo do step */}
      <div className="flex-1 px-6 pb-6 overflow-y-auto">
        {step === 1 && (
          <StepIdentity
            form={form}
            set={set}
            MIN_PER_TEAM={MIN_PER_TEAM}
            MAX_PER_TEAM={MAX_PER_TEAM}
          />
        )}
        {step === 2 && (
          <StepSchedule
            form={form}
            toggleDay={toggleDay}
            updateDayField={updateDayField}
            dayEditing={dayEditing}
            setDayEditing={setDayEditing}
          />
        )}
        {step === 3 && (
          <StepConfirm
            form={form}
            buildPayload={buildPayload}
            error={error}
          />
        )}
      </div>

      {/* Botão de ação fixo */}
      <div className="px-6 pb-8 pt-4 border-t border-border-subtle">
        {step < 3 ? (
          <button
            disabled={!canProceed(step)}
            onClick={goNext}
            className={`w-full p-4 rounded-2xl font-black uppercase text-sm transition-all flex items-center justify-center gap-2 active:scale-95 ${
              canProceed(step)
                ? 'text-black'
                : 'bg-surface-2 text-text-muted cursor-not-allowed'
            }`}
            style={canProceed(step) ? { background: 'linear-gradient(135deg, #00f2ff, #0066ff)' } : {}}
          >
            Continuar <ChevronRight size={16} />
          </button>
        ) : (
          <button
            disabled={saving}
            onClick={handleCreate}
            className="w-full p-4 rounded-2xl font-black uppercase text-sm text-black flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-cyan-500/20"
            style={{ background: 'linear-gradient(135deg, #00f2ff, #0066ff)' }}
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <><Check size={16} /> Criar Baba</>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default CreatePage;
