// src/pages/create/StepConfirm.jsx
// Sprint 9.5 — Step 3: revisão e confirmação dos dados antes de criar

import React from 'react';

const DAYS_LABEL = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
const MODALITIES = { society: 'Society', futsal: 'Futsal', campo: 'Campo' };

const Row = ({ label, value }) => (
  <div className="p-4 flex justify-between items-center">
    <span className="text-[10px] text-text-low uppercase font-black">{label}</span>
    <span className="font-black text-sm text-right max-w-[60%] truncate">{value}</span>
  </div>
);

const StepConfirm = ({ form, buildPayload, error }) => {
  const payload = buildPayload();

  return (
    <div className="space-y-4">
      <p className="text-[10px] text-text-low uppercase font-black tracking-widest">
        Confirme os dados
      </p>

      <div className="rounded-3xl border border-border-mid overflow-hidden divide-y divide-white/5">
        <Row label="Nome"       value={form.name} />
        <Row label="Modalidade" value={MODALITIES[form.modality] || form.modality} />
        {form.location && <Row label="Local padrão" value={form.location} />}
        <Row
          label="Formato"
          value={`${form.playersPerTeam} x ${form.playersPerTeam} · ${form.playersPerTeam * 2} em campo`}
        />
        {form.pixKey && <Row label="Chave Pix" value={form.pixKey} />}

        {/* Agenda */}
        <div className="p-4">
          <p className="text-[9px] text-text-low uppercase font-black mb-3">Agenda</p>
          <div className="space-y-2">
            {payload.game_days_config.map(d => (
              <div key={d.day} className="flex justify-between items-center bg-surface-2 rounded-xl px-3 py-2">
                <span className="text-[11px] font-black">{DAYS_LABEL[d.day]}</span>
                <span className="text-[10px] text-cyan-electric font-bold">
                  {d.time}{d.location ? ` · ${d.location}` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Nota sobre lista de espera */}
      <div className="p-4 rounded-2xl bg-cyan-electric/5 border border-cyan-electric/20">
        <p className="text-[10px] text-cyan-electric font-black uppercase tracking-widest mb-1">
          Lista de espera automática
        </p>
        <p className="text-[10px] text-text-low leading-relaxed">
          Quando o baba atingir {form.playersPerTeam * 2} confirmados, os próximos entram automaticamente
          na lista de espera e são promovidos se alguém cancelar.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-black">
          {error}
        </div>
      )}
    </div>
  );
};

export default StepConfirm;
