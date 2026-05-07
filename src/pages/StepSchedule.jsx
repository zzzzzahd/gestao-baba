// src/pages/create/StepSchedule.jsx
// Sprint 9.5 — Step 2: dias da semana, horário e local por dia

import React from 'react';
import { Clock, MapPin, ChevronRight } from 'lucide-react';

const DAYS = [
  { short: 'DOM', label: 'Domingo', value: 0 },
  { short: 'SEG', label: 'Segunda', value: 1 },
  { short: 'TER', label: 'Terça',   value: 2 },
  { short: 'QUA', label: 'Quarta',  value: 3 },
  { short: 'QUI', label: 'Quinta',  value: 4 },
  { short: 'SEX', label: 'Sexta',   value: 5 },
  { short: 'SÁB', label: 'Sábado',  value: 6 },
];

const StepSchedule = ({ form, toggleDay, updateDayField, dayEditing, setDayEditing }) => (
  <div className="space-y-4">

    <div>
      <p className="text-[10px] text-text-low uppercase font-black tracking-widest mb-3">
        Dias de jogo *
      </p>

      {/* Seletor de dias */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {DAYS.map(d => {
          const selected = form.selectedDays.some(s => s.day === d.value);
          return (
            <button
              key={d.value}
              onClick={() => toggleDay(d.value)}
              className={`py-3 rounded-xl text-[9px] font-black uppercase transition-all active:scale-90 ${
                selected
                  ? 'bg-cyan-electric text-black shadow-lg shadow-cyan-electric/20'
                  : 'bg-surface-2 text-text-low border border-border-mid hover:border-cyan-electric/30'
              }`}
            >
              {d.short}
            </button>
          );
        })}
      </div>

      {form.selectedDays.length === 0 && (
        <div className="text-center py-8 border border-dashed border-border-mid rounded-2xl">
          <p className="text-text-muted text-[11px] font-black uppercase">
            Selecione pelo menos um dia
          </p>
        </div>
      )}
    </div>

    {/* Configurações por dia */}
    <div className="space-y-2">
      {form.selectedDays.map(sd => {
        const dayInfo = DAYS.find(d => d.value === sd.day);
        const isOpen  = dayEditing === sd.day;

        return (
          <div key={sd.day} className="rounded-2xl border border-border-mid overflow-hidden">
            {/* Header do dia */}
            <button
              onClick={() => setDayEditing(isOpen ? null : sd.day)}
              className="w-full p-4 flex justify-between items-center bg-surface-2 hover:bg-surface-3 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-cyan-electric/10 flex items-center justify-center text-cyan-electric text-[10px] font-black border border-cyan-electric/20">
                  {dayInfo?.short}
                </span>
                <div className="text-left">
                  <p className="font-black text-sm">{dayInfo?.label}</p>
                  <p className="text-[10px] text-text-low">
                    {sd.time}
                    {sd.location ? ` · ${sd.location}` : ''}
                  </p>
                </div>
              </div>
              <ChevronRight
                size={14}
                className={`text-text-low transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
              />
            </button>

            {/* Detalhes expandidos */}
            {isOpen && (
              <div className="p-4 space-y-3 bg-black/40 border-t border-border-subtle animate-in slide-in-from-top-1 duration-150">
                <div className="space-y-1">
                  <label className="text-[9px] text-text-low uppercase font-black flex items-center gap-1">
                    <Clock size={8} /> Horário
                  </label>
                  <input
                    type="time"
                    value={sd.time}
                    onChange={e => updateDayField(sd.day, 'time', e.target.value)}
                    className="w-full p-3 bg-black/40 border border-border-mid rounded-xl font-black focus:border-cyan-electric/50 focus:outline-none transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-text-low uppercase font-black flex items-center gap-1">
                    <MapPin size={8} /> Local deste dia (opcional)
                  </label>
                  <input
                    value={sd.location}
                    onChange={e => updateDayField(sd.day, 'location', e.target.value)}
                    placeholder={form.location || 'Local específico para este dia'}
                    maxLength={80}
                    className="w-full p-3 bg-black/40 border border-border-mid rounded-xl font-black placeholder:text-text-muted focus:border-cyan-electric/50 focus:outline-none transition-colors"
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

export default StepSchedule;
