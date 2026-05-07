// src/pages/create/StepIdentity.jsx
// Sprint 9.5 — Step 1: nome, modalidade, local, jogadores por time, chave Pix

import React from 'react';
import { MapPin, Users, Minus, Plus, Key } from 'lucide-react';

const MODALITIES = [
  { value: 'society', label: 'Society', emoji: '⚽' },
  { value: 'futsal',  label: 'Futsal',  emoji: '🥅' },
  { value: 'campo',   label: 'Campo',   emoji: '🏟️' },
];

const StepIdentity = ({ form, set, MIN_PER_TEAM, MAX_PER_TEAM }) => (
  <div className="space-y-6">

    {/* Nome */}
    <div className="space-y-2">
      <label className="text-[10px] text-text-low uppercase font-black tracking-widest">
        Nome do Baba *
      </label>
      <input
        value={form.name}
        onChange={e => set('name', e.target.value)}
        placeholder="Ex: Baba da Pelada"
        maxLength={40}
        autoFocus
        className="w-full p-4 bg-black/40 border border-border-mid rounded-2xl font-black placeholder:text-text-muted focus:border-cyan-electric/50 focus:outline-none transition-colors"
      />
      <p className="text-[9px] text-text-muted text-right">{form.name.length}/40</p>
    </div>

    {/* Modalidade */}
    <div className="space-y-2">
      <label className="text-[10px] text-text-low uppercase font-black tracking-widest">
        Modalidade
      </label>
      <div className="grid grid-cols-3 gap-2">
        {MODALITIES.map(m => (
          <button
            key={m.value}
            onClick={() => set('modality', m.value)}
            className={`p-3 rounded-2xl flex flex-col items-center gap-1 transition-all active:scale-95 ${
              form.modality === m.value
                ? 'bg-cyan-electric text-black'
                : 'bg-surface-2 text-text-mid border border-border-mid hover:border-cyan-electric/30'
            }`}
          >
            <span className="text-lg">{m.emoji}</span>
            <span className="text-[10px] font-black uppercase">{m.label}</span>
          </button>
        ))}
      </div>
    </div>

    {/* Local */}
    <div className="space-y-2">
      <label className="text-[10px] text-text-low uppercase font-black tracking-widest flex items-center gap-1">
        <MapPin size={10} /> Local (padrão)
      </label>
      <input
        value={form.location}
        onChange={e => set('location', e.target.value)}
        placeholder="Quadra do bairro, Arena..."
        maxLength={80}
        className="w-full p-4 bg-black/40 border border-border-mid rounded-2xl font-black placeholder:text-text-muted focus:border-cyan-electric/50 focus:outline-none transition-colors"
      />
    </div>

    {/* Jogadores por time */}
    <div className="space-y-2">
      <label className="text-[10px] text-text-low uppercase font-black tracking-widest flex items-center gap-1">
        <Users size={10} /> Jogadores por time
      </label>
      <div className="flex items-center gap-4 p-4 bg-black/40 border border-border-mid rounded-2xl">
        <button
          onClick={() => set('playersPerTeam', Math.max(MIN_PER_TEAM, form.playersPerTeam - 1))}
          className="w-10 h-10 rounded-xl bg-surface-3 flex items-center justify-center hover:bg-surface-2 active:scale-90 transition-all"
        >
          <Minus size={14} />
        </button>
        <div className="flex-1 text-center">
          <span className="text-3xl font-black text-cyan-electric tabular-nums">
            {form.playersPerTeam}
          </span>
          <p className="text-[9px] text-text-muted mt-0.5">
            {form.playersPerTeam * 2} em campo · máx {form.playersPerTeam * 2} confirmados
          </p>
        </div>
        <button
          onClick={() => set('playersPerTeam', Math.min(MAX_PER_TEAM, form.playersPerTeam + 1))}
          className="w-10 h-10 rounded-xl bg-surface-3 flex items-center justify-center hover:bg-surface-2 active:scale-90 transition-all"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>

    {/* Chave Pix (Sprint 8.1 integrado ao wizard) */}
    <div className="space-y-2">
      <label className="text-[10px] text-text-low uppercase font-black tracking-widest flex items-center gap-1">
        <Key size={10} /> Chave Pix (opcional)
      </label>
      <input
        value={form.pixKey}
        onChange={e => set('pixKey', e.target.value)}
        placeholder="CPF, e-mail, telefone ou chave aleatória"
        maxLength={77}
        className="w-full p-4 bg-black/40 border border-border-mid rounded-2xl font-black placeholder:text-text-muted focus:border-cyan-electric/50 focus:outline-none transition-colors"
      />
      <p className="text-[9px] text-text-muted">
        Para os jogadores pagarem a mensalidade direto pelo app.
      </p>
    </div>
  </div>
);

export default StepIdentity;
