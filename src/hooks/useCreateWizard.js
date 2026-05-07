// src/hooks/useCreateWizard.js
// Sprint 9.5 — Gerencia estado do wizard de criação de baba.
// Persiste rascunho em localStorage para não perder dados ao sair acidentalmente.

import { useState, useCallback } from 'react';

const STORAGE_KEY = 'create_baba_draft';

const DEFAULT_TIME = '20:00';
const MIN_PER_TEAM = 3;
const MAX_PER_TEAM = 11;

export const INITIAL_FORM = {
  name:           '',
  modality:       'society',
  location:       '',
  playersPerTeam: 5,
  selectedDays:   [],
  pixKey:         '',
  maxPlayers:     null, // null = auto (playersPerTeam * 2)
};

// ── Persistência ──────────────────────────────────────────────────────────────

const loadDraft = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Valida estrutura mínima
    if (!parsed?.name !== undefined && Array.isArray(parsed?.selectedDays)) return parsed;
    return parsed;
  } catch {
    return null;
  }
};

const saveDraft = (form) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  } catch {}
};

const clearDraft = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export const toDbTime = (t) => (t && t.length === 5 ? `${t}:00` : t || '20:00:00');

export const buildInsertPayload = ({ name, modality, location, playersPerTeam, selectedDays, pixKey, maxPlayers }) => {
  const cleanDays = [...selectedDays].sort((a, b) => a.day - b.day);
  const game_days_config = cleanDays.map(d => ({
    day:      d.day,
    time:     d.time || DEFAULT_TIME,
    location: d.location?.trim() || location?.trim() || null,
  }));
  return {
    name:            name.trim(),
    modality,
    location:        location.trim() || null,
    max_players:     maxPlayers ?? playersPerTeam * 2,
    game_days:       cleanDays.map(d => d.day),
    game_days_config,
    game_time:       toDbTime(cleanDays[0]?.time || DEFAULT_TIME),
    pix_key:         pixKey.trim() || null,
  };
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useCreateWizard() {
  const [form, setFormRaw] = useState(() => loadDraft() ?? INITIAL_FORM);
  const [step, setStep]    = useState(1);
  const [dayEditing, setDayEditing] = useState(null);

  // Atualiza campo e salva rascunho
  const set = useCallback((key, val) => {
    setFormRaw(prev => {
      const next = { ...prev, [key]: val };
      saveDraft(next);
      return next;
    });
  }, []);

  const toggleDay = useCallback((dayValue) => {
    setFormRaw(prev => {
      const exists = prev.selectedDays.find(d => d.day === dayValue);
      const next = exists
        ? { ...prev, selectedDays: prev.selectedDays.filter(d => d.day !== dayValue) }
        : {
            ...prev,
            selectedDays: [
              ...prev.selectedDays,
              { day: dayValue, time: DEFAULT_TIME, location: prev.location },
            ].sort((a, b) => a.day - b.day),
          };
      saveDraft(next);
      return next;
    });
  }, []);

  const updateDayField = useCallback((dayValue, field, val) => {
    setFormRaw(prev => {
      const next = {
        ...prev,
        selectedDays: prev.selectedDays.map(d =>
          d.day === dayValue ? { ...d, [field]: val } : d
        ),
      };
      saveDraft(next);
      return next;
    });
  }, []);

  const canProceed = (currentStep = step) => {
    if (currentStep === 1) return form.name.trim().length >= 2;
    if (currentStep === 2) return form.selectedDays.length > 0;
    return true;
  };

  const goNext = () => setStep(s => Math.min(s + 1, 3));
  const goBack = () => setStep(s => Math.max(s - 1, 1));

  const resetWizard = () => {
    clearDraft();
    setFormRaw(INITIAL_FORM);
    setStep(1);
    setDayEditing(null);
  };

  const hasDraft = () => {
    const draft = loadDraft();
    return !!draft && (draft.name?.trim().length > 0 || draft.selectedDays?.length > 0);
  };

  return {
    form, step,
    dayEditing, setDayEditing,
    set, toggleDay, updateDayField,
    canProceed, goNext, goBack,
    resetWizard, hasDraft,
    buildPayload: () => buildInsertPayload(form),
    MIN_PER_TEAM,
    MAX_PER_TEAM,
  };
}
