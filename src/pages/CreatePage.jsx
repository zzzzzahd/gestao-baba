import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBaba } from '../contexts/BabaContext';
import {
  ArrowLeft,
  Check,
  Plus,
  Minus,
  MapPin,
  Clock,
  Users,
  ChevronRight,
} from 'lucide-react';

// ─────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────

const DAYS = [
  { short: 'DOM', label: 'Domingo', value: 0 },
  { short: 'SEG', label: 'Segunda', value: 1 },
  { short: 'TER', label: 'Terça', value: 2 },
  { short: 'QUA', label: 'Quarta', value: 3 },
  { short: 'QUI', label: 'Quinta', value: 4 },
  { short: 'SEX', label: 'Sexta', value: 5 },
  { short: 'SÁB', label: 'Sábado', value: 6 },
];

// 🔥 CORREÇÃO: somente modalidades que existem no banco
const MODALITIES = [
  { value: 'society', label: 'Society' },
  { value: 'futsal', label: 'Futsal' },
];

const DEFAULT_TIME = '20:00';
const MIN_PER_TEAM = 3;
const MAX_PER_TEAM = 11;

// ─────────────────────────────────────
// ESTADO INICIAL
// ─────────────────────────────────────

const INITIAL = {
  name: '',
  modality: 'society',
  location: '',
  playersPerTeam: 5,
  selectedDays: [], // [{ day, time, location }]
};

// ─────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────

const CreatePage = () => {
  const navigate = useNavigate();
  const { createBaba } = useBaba();

  const [form, setForm] = useState(INITIAL);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [dayEditing, setDayEditing] = useState(null);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const toggleDay = useCallback((dayValue) => {
    setForm(f => {
      const exists = f.selectedDays.find(d => d.day === dayValue);
      if (exists) {
        return { ...f, selectedDays: f.selectedDays.filter(d => d.day !== dayValue) };
      }
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

  // 🔥 CORREÇÃO PRINCIPAL AQUI
  const handleCreate = async () => {
    if (saving) return;
    setSaving(true);

    try {
      const baba = await createBaba({
        name: form.name.trim(),
        modality: form.modality,
        location: form.location.trim() || null,
        players_per_team: form.playersPerTeam,

        // 🔥 ESSENCIAL PRO BANCO
        game_days: form.selectedDays.map(d => d.day),

        // 🔥 CONFIG COMPLETA (igual BabaSettings)
        game_days_config: form.selectedDays,
      });

      if (baba) navigate('/dashboard');
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────
  // STEPS
  // ─────────────────────────────────────

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
          className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl font-black placeholder:text-white/20 focus:border-cyan-electric/50 focus:outline-none"
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] text-white/40 uppercase font-black tracking-widest">
          Modalidade
        </label>
        <div className="grid grid-cols-2 gap-2">
          {MODALITIES.map(m => (
            <button
              key={m.value}
              onClick={() => set('modality', m.value)}
              className={`p-3 rounded-2xl text-[11px] font-black uppercase ${
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
          placeholder="Quadra do bairro..."
          className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl font-black"
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] text-white/40 uppercase font-black tracking-widest flex items-center gap-1">
          <Users size={10} /> Jogadores por time
        </label>
        <div className="flex items-center gap-4 p-4 bg-black/40 border border-white/10 rounded-2xl">
          <button onClick={() => set('playersPerTeam', Math.max(3, form.playersPerTeam - 1))}>
            <Minus size={14} />
          </button>
          <span className="flex-1 text-center font-black text-2xl text-cyan-electric">
            {form.playersPerTeam}
          </span>
          <button onClick={() => set('playersPerTeam', Math.min(11, form.playersPerTeam + 1))}>
            <Plus size={14} />
          </button>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">

      <div className="grid grid-cols-7 gap-1">
        {DAYS.map(d => {
          const selected = form.selectedDays.some(s => s.day === d.value);
          return (
            <button
              key={d.value}
              onClick={() => toggleDay(d.value)}
              className={selected ? 'bg-cyan-electric text-black' : 'bg-white/5 text-white/40'}
            >
              {d.short}
            </button>
          );
        })}
      </div>

      {form.selectedDays.map(sd => {
        const isOpen = dayEditing === sd.day;
        return (
          <div key={sd.day}>

            <button onClick={() => setDayEditing(isOpen ? null : sd.day)}>
              {sd.time} - {sd.location}
            </button>

            {isOpen && (
              <div>

                <input
                  type="time"
                  value={sd.time}
                  onChange={e => updateDayField(sd.day, 'time', e.target.value)}
                />

                <input
                  value={sd.location}
                  onChange={e => updateDayField(sd.day, 'location', e.target.value)}
                />

              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderStep3 = () => (
    <div>
      <p>{form.name}</p>
    </div>
  );

  return (
    <div>

      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}

      {step < 3 ? (
        <button onClick={() => setStep(s => s + 1)} disabled={!canProceed()}>
          Continuar
        </button>
      ) : (
        <button onClick={handleCreate} disabled={saving}>
          Criar Baba
        </button>
      )}
    </div>
  );
};

export default CreatePage;
