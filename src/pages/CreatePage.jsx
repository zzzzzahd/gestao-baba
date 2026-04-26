import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBaba } from '../contexts/BabaContext';
import {
  ArrowLeft, Check, Plus, Minus,
  MapPin, Clock, Users, ChevronRight,
} from 'lucide-react';

// ─────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────

const DAYS = [
  { short: 'DOM', label: 'Domingo', value: 0 },
  { short: 'SEG', label: 'Segunda', value: 1 },
  { short: 'TER', label: 'Terça',   value: 2 },
  { short: 'QUA', label: 'Quarta',  value: 3 },
  { short: 'QUI', label: 'Quinta',  value: 4 },
  { short: 'SEX', label: 'Sexta',   value: 5 },
  { short: 'SÁB', label: 'Sábado',  value: 6 },
];

const MODALITIES = [
  { value: 'society', label: 'Society' },
  { value: 'futsal',  label: 'Futsal'  },
  { value: 'campo',   label: 'Campo'   },
];

const DEFAULT_TIME  = '20:00';
const MIN_PER_TEAM  = 3;
const MAX_PER_TEAM  = 11;

const INITIAL = {
  name:           '',
  modality:       'society',
  location:       '',
  playersPerTeam: 5,
  selectedDays:   [],
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const toDbTime = (t) => (t && t.length === 5 ? `${t}:00` : t || '20:00:00');

const buildInsertPayload = ({ name, modality, location, playersPerTeam, selectedDays }) => {
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
    max_players:     playersPerTeam * 2,
    game_days:       cleanDays.map(d => d.day),
    game_days_config,
    game_time:       toDbTime(cleanDays[0]?.time || DEFAULT_TIME),
  };
};

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────

const CreatePage = () => {
  const navigate = useNavigate();
  const { createBaba, setCurrentBaba } = useBaba();

  const [form,       setForm]       = useState(INITIAL);
  const [step,       setStep]       = useState(1);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState(null);
  const [dayEditing, setDayEditing] = useState(null);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const toggleDay = useCallback((dayValue) => {
    setForm(f => {
      const exists = f.selectedDays.find(d => d.day === dayValue);
      if (exists) return { ...f, selectedDays: f.selectedDays.filter(d => d.day !== dayValue) };
      return {
        ...f,
        selectedDays: [
          ...f.selectedDays,
          { day: dayValue, time: DEFAULT_TIME, location: f.location },
        ].sort((a, b) => a.day - b.day),
      };
    });
  }, []);

  const updateDayField = (dayValue, field, val) => {
    setForm(f => ({
      ...f,
      selectedDays: f.selectedDays.map(d =>
        d.day === dayValue ? { ...d, [field]: val } : d
      ),
    }));
  };

  const canProceed = () => {
    if (step === 1) return form.name.trim().length >= 2;
    if (step === 2) return form.selectedDays.length > 0;
    return true;
  };

  const handleCreate = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const payload = buildInsertPayload(form);
      const baba    = await createBaba(payload);
      if (!baba) throw new Error('Erro ao criar baba. Tente novamente.');
      if (typeof setCurrentBaba === 'function') setCurrentBaba(baba);
      navigate('/dashboard', { state: { openSettings: true, babaId: baba.id } });
    } catch (err) {
      setError(err?.message || 'Erro desconhecido');
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────────
  // STEPS
  // ─────────────────────────────────────────────

  const renderStep1 = () => (
    <div className="space-y-5">

      <div className="space-y-2">
        <label className="text-[10px] text-white/40 uppercase font-black tracking-widest">
          Nome do Baba *
        </label>
        <input
          value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="Ex: Baba da Pelada"
          maxLength={40}
          className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl font-black placeholder:text-white/20 focus:border-cyan-electric/50 focus:outline-none transition-colors"
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] text-white/40 uppercase font-black tracking-widest">
          Modalidade
        </label>
        <div className="grid grid-cols-3 gap-2">
          {MODALITIES.map(m => (
            <button
              key={m.value}
              onClick={() => set('modality', m.value)}
              className={`p-3 rounded-2xl text-[11px] font-black uppercase transition-all ${
                form.modality === m.value
                  ? 'bg-cyan-electric text-black'
                  : 'bg-white/5 text-white/60 border border-white/10'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] text-white/40 uppercase font-black tracking-widest flex items-center gap-1">
          <MapPin size={10} /> Local (padrão)
        </label>
        <input
          value={form.location}
          onChange={e => set('location', e.target.value)}
          placeholder="Quadra do bairro, Arena..."
          maxLength={80}
          className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl font-black placeholder:text-white/20 focus:border-cyan-electric/50 focus:outline-none transition-colors"
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] text-white/40 uppercase font-black tracking-widest flex items-center gap-1">
          <Users size={10} /> Jogadores por time
        </label>
        <div className="flex items-center gap-4 p-4 bg-black/40 border border-white/10 rounded-2xl">
          <button
            onClick={() => set('playersPerTeam', Math.max(MIN_PER_TEAM, form.playersPerTeam - 1))}
            className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center active:bg-white/20 transition"
          >
            <Minus size={14} />
          </button>
          <span className="flex-1 text-center font-black text-2xl text-cyan-electric">
            {form.playersPerTeam}
          </span>
          <button
            onClick={() => set('playersPerTeam', Math.min(MAX_PER_TEAM, form.playersPerTeam + 1))}
            className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center active:bg-white/20 transition"
          >
            <Plus size={14} />
          </button>
        </div>
        {/* UX-005 FIX: linguagem amigável, sem expor nomes de colunas do banco */}
        <p className="text-[10px] text-white/30 text-center">
          {form.playersPerTeam} jogadores por time · {form.playersPerTeam * 2} em campo por partida
        </p>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <p className="text-[10px] text-white/40 uppercase font-black tracking-widest">
        Dias de jogo *
      </p>

      <div className="grid grid-cols-7 gap-1">
        {DAYS.map(d => {
          const selected = form.selectedDays.some(s => s.day === d.value);
          return (
            <button
              key={d.value}
              onClick={() => toggleDay(d.value)}
              className={`py-3 rounded-xl text-[9px] font-black uppercase transition-all ${
                selected
                  ? 'bg-cyan-electric text-black'
                  : 'bg-white/5 text-white/40 border border-white/10'
              }`}
            >
              {d.short}
            </button>
          );
        })}
      </div>

      {form.selectedDays.length === 0 && (
        <p className="text-center text-white/20 text-[11px] py-4">
          Selecione pelo menos um dia
        </p>
      )}

      <div className="space-y-3">
        {form.selectedDays.map(sd => {
          const dayLabel = DAYS.find(d => d.value === sd.day)?.label;
          const isOpen   = dayEditing === sd.day;
          return (
            <div key={sd.day} className="rounded-2xl border border-white/10 overflow-hidden">
              <button
                onClick={() => setDayEditing(isOpen ? null : sd.day)}
                className="w-full p-4 flex justify-between items-center bg-white/5"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-cyan-electric/10 flex items-center justify-center text-cyan-electric text-[10px] font-black">
                    {DAYS.find(d => d.value === sd.day)?.short}
                  </span>
                  <div className="text-left">
                    <p className="font-black text-sm">{dayLabel}</p>
                    <p className="text-[10px] text-white/40">
                      {sd.time} {sd.location ? `· ${sd.location}` : ''}
                    </p>
                  </div>
                </div>
                <ChevronRight
                  size={14}
                  className={`text-white/30 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                />
              </button>

              {isOpen && (
                <div className="p-4 space-y-3 bg-black/40 border-t border-white/5">
                  <div className="space-y-1">
                    <label className="text-[9px] text-white/30 uppercase font-black flex items-center gap-1">
                      <Clock size={8} /> Horário
                    </label>
                    <input
                      type="time"
                      value={sd.time}
                      onChange={e => updateDayField(sd.day, 'time', e.target.value)}
                      className="w-full p-3 bg-black/40 border border-white/10 rounded-xl font-black focus:border-cyan-electric/50 focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-white/30 uppercase font-black flex items-center gap-1">
                      <MapPin size={8} /> Local específico (opcional)
                    </label>
                    <input
                      value={sd.location}
                      onChange={e => updateDayField(sd.day, 'location', e.target.value)}
                      placeholder={form.location || 'Local deste dia em particular'}
                      maxLength={80}
                      className="w-full p-3 bg-black/40 border border-white/10 rounded-xl font-black placeholder:text-white/20 focus:border-cyan-electric/50 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderStep3 = () => {
    const modLabel = MODALITIES.find(m => m.value === form.modality)?.label;
    const payload  = buildInsertPayload(form);
    return (
      <div className="space-y-4">
        <p className="text-[10px] text-white/40 uppercase font-black tracking-widest">
          Confirme os dados
        </p>

        <div className="rounded-3xl border border-white/10 overflow-hidden divide-y divide-white/5">
          <Row label="Nome"       value={form.name} />
          <Row label="Modalidade" value={modLabel} />
          {form.location && <Row label="Local padrão" value={form.location} />}
          {/* UX-005 FIX: linguagem amigável no step de confirmação */}
          <Row
            label="Formato"
            value={`${form.playersPerTeam} x ${form.playersPerTeam} — ${form.playersPerTeam * 2} em campo`}
          />

          <div className="p-4">
            <p className="text-[9px] text-white/30 uppercase font-black mb-2">Agenda</p>
            <div className="space-y-1">
              {payload.game_days_config.map(d => {
                const dayLabel = DAYS.find(day => day.value === d.day)?.label;
                return (
                  <div key={d.day} className="flex justify-between items-center">
                    <span className="text-[11px] font-black">{dayLabel}</span>
                    <span className="text-[10px] text-white/40">
                      {d.time}{d.location ? ` · ${d.location}` : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-black">
            {error}
          </div>
        )}
      </div>
    );
  };

  // ─────────────────────────────────────────────
  // LAYOUT
  // ─────────────────────────────────────────────

  const STEPS = ['Info', 'Dias', 'Confirmar'];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">

      <div className="flex items-center gap-4 px-6 pt-6 pb-4">
        <button
          onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/home')}
          className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <h1 className="font-black uppercase text-sm">Criar Baba</h1>
          <p className="text-[10px] text-white/30">Passo {step} de {STEPS.length}</p>
        </div>
      </div>

      <div className="px-6 mb-6">
        <div className="flex gap-1">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full flex-1 transition-all ${i + 1 <= step ? 'bg-cyan-electric' : 'bg-white/10'}`}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1">
          {STEPS.map((label, i) => (
            <span
              key={i}
              className={`text-[8px] font-black uppercase transition-colors ${i + 1 === step ? 'text-cyan-electric' : 'text-white/20'}`}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="flex-1 px-6 pb-6 overflow-y-auto">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>

      <div className="px-6 pb-8 pt-4 border-t border-white/5">
        {step < 3 ? (
          <button
            disabled={!canProceed()}
            onClick={() => setStep(s => s + 1)}
            className={`w-full p-4 rounded-2xl font-black uppercase text-sm transition-all flex items-center justify-center gap-2 ${
              canProceed()
                ? 'bg-cyan-electric text-black'
                : 'bg-white/5 text-white/20 cursor-not-allowed'
            }`}
          >
            Continuar <ChevronRight size={16} />
          </button>
        ) : (
          <button
            disabled={saving}
            onClick={handleCreate}
            className="w-full p-4 rounded-2xl font-black uppercase text-sm bg-green-500 text-black flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
          >
            {saving
              ? <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              : <><Check size={16} /> Criar Baba</>
            }
          </button>
        )}
      </div>
    </div>
  );
};

const Row = ({ label, value }) => (
  <div className="p-4 flex justify-between items-center">
    <span className="text-[10px] text-white/30 uppercase font-black">{label}</span>
    <span className="font-black text-sm">{value}</span>
  </div>
);

export default CreatePage;
