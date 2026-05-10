// src/components/BabaSettings.jsx
// Corrigido: após salvar pela RPC, busca baba atualizado do banco
// e chama updateBaba para sincronizar o estado local (theme_color etc.)

import React, { useState, useEffect } from 'react';
import { Save, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { supabase }  from '../services/supabase';
import { useBaba }   from '../contexts/BabaContext';
import { useAuth }   from '../contexts/AuthContext';
import toast         from 'react-hot-toast';

// ── Subcomponentes ────────────────────────────────────────────────────────────

const Toggle = ({ label, sub, value, onChange, disabled }) => (
  <div className="flex items-center justify-between py-3 border-b border-border-subtle last:border-0">
    <div className="pr-4">
      <p className="text-xs font-black text-white">{label}</p>
      {sub && <p className="text-[9px] text-text-muted font-black mt-0.5">{sub}</p>}
    </div>
    <button
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      className={`relative w-10 h-5 rounded-full transition-all duration-300 flex-shrink-0 disabled:opacity-40 ${
        value ? 'bg-cyan-electric' : 'bg-surface-3'
      }`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${
        value ? 'translate-x-5' : ''
      }`} />
    </button>
  </div>
);

const Field = ({ label, type = 'text', value, onChange, placeholder, min, max, disabled }) => (
  <div>
    <label className="text-[9px] font-black uppercase tracking-widest text-text-low mb-1.5 block">
      {label}
    </label>
    <input
      type={type}
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      min={min} max={max}
      disabled={disabled}
      className="w-full bg-surface-2 border border-border-mid rounded-xl px-3 py-2.5 text-xs font-black text-white placeholder:text-text-muted focus:outline-none focus:border-cyan-electric/50 transition-colors disabled:opacity-40"
    />
  </div>
);

const Section = ({ title, expanded, onToggle, children }) => (
  <div className="rounded-2xl bg-surface-2 border border-border-mid overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-surface-3/50 transition-colors"
    >
      <span className="text-[10px] font-black uppercase tracking-widest text-white">{title}</span>
      {expanded
        ? <ChevronUp   size={13} className="text-text-low" />
        : <ChevronDown size={13} className="text-text-low" />}
    </button>
    {expanded && (
      <div className="px-4 pb-4 border-t border-border-subtle space-y-3 pt-3">
        {children}
      </div>
    )}
  </div>
);

// ── BabaSettings ──────────────────────────────────────────────────────────────

export default function BabaSettings() {
  const { currentBaba, updateBaba } = useBaba();
  const { user }                    = useAuth();
  const [saving,   setSaving]   = useState(false);
  const [sections, setSections] = useState({ game: true, draw: false, rating: false, advanced: false });
  const [isCoord,  setIsCoord]  = useState(false);

  const isPresident = String(currentBaba?.president_id) === String(user?.id);
  const canEditAll  = isPresident;

  const [form, setForm] = useState({
    max_players:            '',
    allow_reserves:         false,
    auto_draw_enabled:      false,
    auto_draw_time:         '20:00',
    rating_enabled:         true,
    rating_open_hours:      24,
    allow_guests:           false,
    guest_limit:            2,
    confirmation_open_days: 3,
    confirmation_deadline:  '20:00',
    theme_color:            '#06b6d4',
    pix_key:                '',
  });

  // Verificar se é coordenador
  useEffect(() => {
    if (!currentBaba?.id || !user?.id || isPresident) return;
    supabase
      .from('user_roles')
      .select('role')
      .eq('baba_id', currentBaba.id)
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()
      .then(({ data }) => setIsCoord(!!data));
  }, [currentBaba?.id, user?.id, isPresident]);

  // Sync form com currentBaba
  useEffect(() => {
    if (!currentBaba) return;
    setForm({
      max_players:            currentBaba.max_players            ?? '',
      allow_reserves:         currentBaba.allow_reserves         ?? false,
      auto_draw_enabled:      currentBaba.auto_draw_enabled      ?? false,
      auto_draw_time:         currentBaba.auto_draw_time         ?? '20:00',
      rating_enabled:         currentBaba.rating_enabled         ?? true,
      rating_open_hours:      currentBaba.rating_open_hours      ?? 24,
      allow_guests:           currentBaba.allow_guests           ?? false,
      guest_limit:            currentBaba.guest_limit            ?? 2,
      confirmation_open_days: currentBaba.confirmation_open_days ?? 3,
      confirmation_deadline:  currentBaba.confirmation_deadline  ?? '20:00',
      theme_color:            currentBaba.theme_color            ?? '#06b6d4',
      pix_key:                currentBaba.pix_key                ?? '',
    });
  }, [currentBaba?.id]);

  const set    = (key) => (val) => setForm(prev => ({ ...prev, [key]: val }));
  const toggle = (id)  => setSections(prev => ({ ...prev, [id]: !prev[id] }));

  const handleSave = async () => {
    if (!currentBaba) return;
    setSaving(true);
    try {
      // 1. Salvar via RPC (campos avançados)
      const rpcSettings = {
        max_players:            form.max_players ? Number(form.max_players) : null,
        auto_draw_enabled:      form.auto_draw_enabled,
        auto_draw_time:         form.auto_draw_time,
        confirmation_open_days: Number(form.confirmation_open_days) || 3,
        confirmation_deadline:  form.confirmation_deadline,
        allow_guests:           form.allow_guests,
        guest_limit:            Number(form.guest_limit) || 2,
        ...(canEditAll ? {
          rating_enabled:    form.rating_enabled,
          rating_open_hours: Number(form.rating_open_hours) || 24,
          theme_color:       form.theme_color,
        } : {}),
      };

      const { error: rpcErr } = await supabase.rpc('update_baba_settings', {
        p_baba_id: currentBaba.id,
        p_settings: rpcSettings,
      });
      if (rpcErr) throw rpcErr;

      // 2. Campos que a RPC não cobre — update direto
      const directUpdate = {
        allow_reserves: form.allow_reserves,
        ...(canEditAll && form.pix_key !== undefined ? { pix_key: form.pix_key || null } : {}),
      };

      // 3. ← CORREÇÃO PRINCIPAL: buscar baba atualizado e sincronizar estado local
      // Isso garante que theme_color e outros campos apareçam sem precisar recarregar
      const { data: updatedBaba, error: fetchErr } = await supabase
        .from('babas')
        .update(directUpdate)
        .eq('id', currentBaba.id)
        .select('*')
        .single();

      if (fetchErr) throw fetchErr;

      // updateBaba do contexto atualiza setCurrentBaba e setMyBabas
      // Passamos o baba completo atualizado do banco
      if (updateBaba && updatedBaba) {
        // Forçar sync de todos os campos incluindo os da RPC
        const { data: freshBaba } = await supabase
          .from('babas')
          .select('*')
          .eq('id', currentBaba.id)
          .single();

        if (freshBaba) {
          // Atualizar contexto diretamente com dados frescos do banco
          await updateBaba(currentBaba.id, {
            ...freshBaba,
            // não passar game_days_config para não disparar sanitize
          });
        }
      }

      toast.success('Configurações salvas! ✅');
    } catch (err) {
      console.error('[BabaSettings]', err);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  if (!currentBaba) return null;

  return (
    <div className="space-y-3">

      {/* Jogo e Confirmações */}
      <Section title="Jogo e Confirmações" expanded={sections.game} onToggle={() => toggle('game')}>
        <Field
          label="Máx. jogadores confirmados"
          type="number" min="2" max="50"
          value={form.max_players}
          onChange={set('max_players')}
          placeholder="Ilimitado"
        />
        <Toggle
          label="Permitir lista de espera"
          sub="Jogadores acima do limite entram na fila"
          value={form.allow_reserves}
          onChange={set('allow_reserves')}
          disabled={!canEditAll}
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
            type="number" min="1" max="5"
            value={form.guest_limit}
            onChange={set('guest_limit')}
          />
        )}
        <Field
          label="Abrir confirmações X dias antes"
          type="number" min="1" max="7"
          value={form.confirmation_open_days}
          onChange={set('confirmation_open_days')}
        />
        <Field
          label="Encerrar confirmações às"
          type="time"
          value={form.confirmation_deadline}
          onChange={set('confirmation_deadline')}
        />
      </Section>

      {/* Sorteio Automático */}
      <Section title="Sorteio Automático" expanded={sections.draw} onToggle={() => toggle('draw')}>
        <Toggle
          label="Sorteio automático"
          sub="Sortear times automaticamente no horário definido"
          value={form.auto_draw_enabled}
          onChange={set('auto_draw_enabled')}
        />
        {form.auto_draw_enabled && (
          <Field
            label="Horário do sorteio"
            type="time"
            value={form.auto_draw_time}
            onChange={set('auto_draw_time')}
          />
        )}
      </Section>

      {/* Avaliações — apenas presidente */}
      {canEditAll && (
        <Section title="Avaliações" expanded={sections.rating} onToggle={() => toggle('rating')}>
          <Toggle
            label="Habilitar avaliações"
            sub="Jogadores avaliam uns aos outros após a partida"
            value={form.rating_enabled}
            onChange={set('rating_enabled')}
          />
          {form.rating_enabled && (
            <Field
              label="Janela de avaliação (horas após jogo)"
              type="number" min="1" max="72"
              value={form.rating_open_hours}
              onChange={set('rating_open_hours')}
            />
          )}
        </Section>
      )}

      {/* Avançado — apenas presidente */}
      {canEditAll && (
        <Section title="Avançado" expanded={sections.advanced} onToggle={() => toggle('advanced')}>
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
        </Section>
      )}

      {/* Aviso coordenador */}
      {!canEditAll && isCoord && (
        <p className="text-[9px] font-black text-text-muted text-center uppercase tracking-widest">
          Avaliações e configurações avançadas são exclusivas do presidente
        </p>
      )}

      {/* Botão salvar */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3.5 rounded-2xl bg-cyan-electric text-black text-[11px] font-black uppercase tracking-widest hover:bg-cyan-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
      >
        {saving
          ? <><RefreshCw size={13} className="animate-spin" /> Salvando...</>
          : <><Save size={13} /> Salvar configurações</>}
      </button>
    </div>
  );
}
