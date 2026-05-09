// src/components/BabaSettings.jsx
// Sprint 15 — Configurações avançadas do baba via RPC update_baba_settings.

import React, { useState, useEffect } from 'react';
import { Save, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useBaba } from '../contexts/BabaContext';
import toast from 'react-hot-toast';

const Toggle = ({ label, sub, value, onChange }) => (
  <div className="flex items-center justify-between py-3 border-b border-border-subtle last:border-0">
    <div>
      <p className="text-xs font-black text-white">{label}</p>
      {sub && <p className="text-[9px] text-text-muted font-black mt-0.5">{sub}</p>}
    </div>
    <button
      onClick={() => onChange(!value)}
      className={`relative w-10 h-5 rounded-full transition-all duration-300 ${
        value ? 'bg-cyan-electric' : 'bg-surface-3'
      }`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${
        value ? 'translate-x-5' : ''
      }`} />
    </button>
  </div>
);

const Field = ({ label, type = 'text', value, onChange, placeholder, min, max, step }) => (
  <div>
    <label className="text-[9px] font-black uppercase tracking-widest text-text-low mb-1.5 block">{label}</label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      min={min} max={max} step={step}
      className="w-full bg-surface-2 border border-border-mid rounded-xl px-3 py-2.5 text-xs font-black text-white placeholder:text-text-muted focus:outline-none focus:border-cyan-electric/50 transition-colors"
    />
  </div>
);

export default function BabaSettings() {
  const { currentBaba, updateBaba } = useBaba();
  const [saving,   setSaving]   = useState(false);
  const [expanded, setExpanded] = useState({ game: true, draw: false, notifications: false, advanced: false });

  // Form state espelhando os campos do banco
  const [form, setForm] = useState({
    max_players:           '',
    allow_reserves:        false,
    auto_draw_enabled:     false,
    auto_draw_time:        '20:00',
    rating_enabled:        true,
    rating_open_hours:     24,
    allow_guests:          false,
    guest_limit:           2,
    confirmation_open_days: 3,
    confirmation_deadline: '20:00',
    theme_color:           '#06b6d4',
    pix_key:               '',
  });

  useEffect(() => {
    if (!currentBaba) return;
    setForm({
      max_players:            currentBaba.max_players           ?? '',
      allow_reserves:         currentBaba.allow_reserves        ?? false,
      auto_draw_enabled:      currentBaba.auto_draw_enabled     ?? false,
      auto_draw_time:         currentBaba.auto_draw_time        ?? '20:00',
      rating_enabled:         currentBaba.rating_enabled        ?? true,
      rating_open_hours:      currentBaba.rating_open_hours     ?? 24,
      allow_guests:           currentBaba.allow_guests          ?? false,
      guest_limit:            currentBaba.guest_limit           ?? 2,
      confirmation_open_days: currentBaba.confirmation_open_days ?? 3,
      confirmation_deadline:  currentBaba.confirmation_deadline  ?? '20:00',
      theme_color:            currentBaba.theme_color           ?? '#06b6d4',
      pix_key:                currentBaba.pix_key               ?? '',
    });
  }, [currentBaba?.id]);

  const set = (key) => (val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    if (!currentBaba) return;
    setSaving(true);
    try {
      // Usa RPC para campos avançados
      const { error: rpcErr } = await supabase.rpc('update_baba_settings', {
        p_baba_id: currentBaba.id,
        p_settings: {
          auto_draw_enabled:      form.auto_draw_enabled,
          auto_draw_time:         form.auto_draw_time,
          rating_enabled:         form.rating_enabled,
          rating_open_hours:      Number(form.rating_open_hours) || 24,
          allow_guests:           form.allow_guests,
          guest_limit:            Number(form.guest_limit) || 2,
          confirmation_open_days: Number(form.confirmation_open_days) || 3,
          confirmation_deadline:  form.confirmation_deadline,
          theme_color:            form.theme_color,
          max_players:            form.max_players ? Number(form.max_players) : null,
        },
      });
      if (rpcErr) throw rpcErr;

      // Campos básicos via updateBaba do contexto
      await updateBaba(currentBaba.id, {
        allow_reserves: form.allow_reserves,
        pix_key:        form.pix_key || null,
      });

      toast.success('Configurações salvas! ✅');
    } catch (err) {
      console.error('[BabaSettings]', err);
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  if (!currentBaba) return null;

  const Section = ({ id, title, icon: Icon, children }) => (
    <div className="rounded-2xl bg-surface-1 border border-border-mid overflow-hidden">
      <button
        onClick={() => setExpanded(p => ({ ...p, [id]: !p[id] }))}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-surface-2/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-cyan-electric" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white">{title}</span>
        </div>
        {expanded[id] ? <ChevronUp size={14} className="text-text-low" /> : <ChevronDown size={14} className="text-text-low" />}
      </button>
      {expanded[id] && (
        <div className="px-4 pb-4 space-y-3 border-t border-border-subtle">
          {children}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">

      {/* Jogo */}
      <Section id="game" title="Jogo" icon={Settings}>
        <div className="pt-1">
          <Field
            label="Máx. jogadores confirmados"
            type="number"
            value={form.max_players}
            onChange={set('max_players')}
            placeholder="Ilimitado"
            min="2" max="50"
          />
        </div>
        <Toggle
          label="Permitir reservas"
          sub="Jogadores acima do limite entram na fila"
          value={form.allow_reserves}
          onChange={set('allow_reserves')}
        />
        <Toggle
          label="Permitir convidados"
          sub="Membros podem levar visitantes"
          value={form.allow_guests}
          onChange={set('allow_guests')}
        />
        {form.allow_guests && (
          <Field
            label="Máx. convidados por membro"
            type="number"
            value={form.guest_limit}
            onChange={set('guest_limit')}
            min="1" max="5"
          />
        )}
      </Section>

      {/* Confirmações */}
      <Section id="draw" title="Confirmações" icon={Settings}>
        <div className="pt-1 space-y-3">
          <Field
            label="Abrir confirmações X dias antes"
            type="number"
            value={form.confirmation_open_days}
            onChange={set('confirmation_open_days')}
            min="1" max="7"
          />
          <Field
            label="Encerrar confirmações às (HH:MM)"
            type="time"
            value={form.confirmation_deadline}
            onChange={set('confirmation_deadline')}
          />
        </div>
        <Toggle
          label="Sorteio automático"
          sub="Sortear times automaticamente no horário definido"
          value={form.auto_draw_enabled}
          onChange={set('auto_draw_enabled')}
        />
        {form.auto_draw_enabled && (
          <Field
            label="Horário do sorteio automático"
            type="time"
            value={form.auto_draw_time}
            onChange={set('auto_draw_time')}
          />
        )}
      </Section>

      {/* Avaliações */}
      <Section id="notifications" title="Avaliações" icon={Settings}>
        <div className="pt-1">
          <Toggle
            label="Habilitar avaliações"
            sub="Jogadores avaliam uns aos outros após a partida"
            value={form.rating_enabled}
            onChange={set('rating_enabled')}
          />
          {form.rating_enabled && (
            <div className="mt-3">
              <Field
                label="Janela de avaliação (horas após jogo)"
                type="number"
                value={form.rating_open_hours}
                onChange={set('rating_open_hours')}
                min="1" max="72"
              />
            </div>
          )}
        </div>
      </Section>

      {/* Avançado */}
      <Section id="advanced" title="Avançado" icon={Settings}>
        <div className="pt-1 space-y-3">
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-text-low mb-1.5 block">
              Cor do tema
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.theme_color}
                onChange={e => set('theme_color')(e.target.value)}
                className="w-10 h-10 rounded-xl border border-border-mid bg-surface-2 cursor-pointer"
              />
              <span className="text-xs font-mono text-text-low">{form.theme_color}</span>
            </div>
          </div>
          <Field
            label="Chave PIX"
            value={form.pix_key}
            onChange={set('pix_key')}
            placeholder="CPF, e-mail, telefone ou chave aleatória"
          />
        </div>
      </Section>

      {/* Salvar */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3.5 rounded-2xl bg-cyan-electric text-black text-[11px] font-black uppercase tracking-widest hover:bg-cyan-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {saving
          ? <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
          : <Save size={14} />}
        {saving ? 'Salvando...' : 'Salvar configurações'}
      </button>
    </div>
  );
}
