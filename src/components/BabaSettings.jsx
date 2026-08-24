// src/components/BabaSettings.jsx
// Corrigido: após salvar pela RPC, busca baba atualizado do banco
// e chama updateBaba para sincronizar o estado local (theme_color etc.)

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, ChevronDown, ChevronUp, ChevronRight, RefreshCw, Trash2, AlertTriangle, Clock, MapPin } from 'lucide-react';
import { supabase }  from '../services/supabase';
import { useBaba }   from '../contexts/BabaContext';
import { useAuth }   from '../contexts/AuthContext';
import ConfirmModal  from './ConfirmModal';
import toast         from 'react-hot-toast';

// ── Constantes ────────────────────────────────────────────────────────────────

const DAYS = [
  { short: 'DOM', label: 'Domingo', value: 0 },
  { short: 'SEG', label: 'Segunda', value: 1 },
  { short: 'TER', label: 'Terça',   value: 2 },
  { short: 'QUA', label: 'Quarta',  value: 3 },
  { short: 'QUI', label: 'Quinta',  value: 4 },
  { short: 'SEX', label: 'Sexta',   value: 5 },
  { short: 'SÁB', label: 'Sábado',  value: 6 },
];

const DEFAULT_DAY_TIME = '20:00';

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

const Field = ({ label, type = 'text', value, onChange, placeholder, min, max, maxLength, disabled }) => (
  <div>
    <label className="text-[9px] font-black uppercase tracking-widest text-text-low mb-1.5 block">
      {label}
    </label>
    <input
      type={type}
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      min={min} max={max} maxLength={maxLength}
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
  const { currentBaba, updateBaba, deleteBaba } = useBaba();
  const { user }                    = useAuth();
  const navigate                    = useNavigate();
  const [saving,   setSaving]   = useState(false);
  const [sections, setSections] = useState({ schedule: true, game: false, draw: false, rating: false, advanced: false, danger: false });
  const [isCoord,  setIsCoord]  = useState(false);
  const [dayEditing, setDayEditing] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm]  = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isPresident = String(currentBaba?.president_id) === String(user?.id);
  const canEditAll  = isPresident;

  const [form, setForm] = useState({
    name:                    '',
    location:               '',
    selectedDays:           [], // [{ day, time, location }]
    max_line_players:       '',
    max_goalkeepers:        5,
    max_substitutes:        5,
    confirmation_open_weekday: 5,
    confirmation_open_time: '11:59',
    allow_reserves:         false,
    auto_draw_enabled:      false,
    auto_draw_time:         '20:00',
    rating_enabled:         true,
    mvp_scope:              'all',
    rating_open_hours:      24,
    allow_guests:           false,
    guest_limit:            2,
    confirmation_open_days: 3,
    confirmation_deadline:  '20:00',
    theme_color:            '#06b6d4',
    pix_key:                '',
    players_per_team:       5,
    gk_mode:                'fixed',
    gk_fallback:            'lineplayer',
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
    const fallbackTime = (currentBaba.game_time || DEFAULT_DAY_TIME).slice(0, 5);
    const selectedDays = Array.isArray(currentBaba.game_days_config) && currentBaba.game_days_config.length > 0
      ? currentBaba.game_days_config.map(d => ({
          day:      d.day,
          time:     (d.time || fallbackTime).slice(0, 5),
          location: d.location || '',
        }))
      : (currentBaba.game_days || []).map(day => ({ day, time: fallbackTime, location: '' }));

    setForm({
      name:                    currentBaba.name                   ?? '',
      location:               currentBaba.location               ?? '',
      selectedDays:           selectedDays.sort((a, b) => a.day - b.day),
      max_line_players:       currentBaba.max_line_players       ?? currentBaba.max_players ?? '',
      max_goalkeepers:        currentBaba.max_goalkeepers        ?? 5,
      max_substitutes:        currentBaba.max_substitutes        ?? 5,
      confirmation_open_weekday: currentBaba.confirmation_open_weekday ?? 5,
      confirmation_open_time: currentBaba.confirmation_open_time ?? '11:59',
      allow_reserves:         currentBaba.allow_reserves         ?? false,
      auto_draw_enabled:      currentBaba.auto_draw_enabled      ?? false,
      auto_draw_time:         currentBaba.auto_draw_time         ?? '20:00',
      rating_enabled:         currentBaba.rating_enabled         ?? true,
      mvp_scope:              currentBaba.mvp_scope              ?? 'all',
      rating_open_hours:      currentBaba.rating_open_hours      ?? 24,
      allow_guests:           currentBaba.allow_guests           ?? false,
      guest_limit:            currentBaba.guest_limit            ?? 2,
      confirmation_open_days: currentBaba.confirmation_open_days ?? 3,
      confirmation_deadline:  currentBaba.confirmation_deadline  ?? '20:00',
      theme_color:            currentBaba.theme_color            ?? '#06b6d4',
      pix_key:                currentBaba.pix_key                ?? '',
      players_per_team:       currentBaba.players_per_team       ?? 5,
      gk_mode:                currentBaba.gk_mode                ?? 'fixed',
      gk_fallback:            currentBaba.gk_fallback            ?? 'lineplayer',
    });
  }, [currentBaba?.id]);

  const set    = (key) => (val) => setForm(prev => ({ ...prev, [key]: val }));
  const toggle = (id)  => setSections(prev => ({ ...prev, [id]: !prev[id] }));

  const toggleDay = (dayValue) => {
    setForm(prev => {
      const exists = prev.selectedDays.find(d => d.day === dayValue);
      return {
        ...prev,
        selectedDays: exists
          ? prev.selectedDays.filter(d => d.day !== dayValue)
          : [...prev.selectedDays, { day: dayValue, time: DEFAULT_DAY_TIME, location: '' }].sort((a, b) => a.day - b.day),
      };
    });
  };

  const updateDayField = (dayValue, field, val) => {
    setForm(prev => ({
      ...prev,
      selectedDays: prev.selectedDays.map(d => d.day === dayValue ? { ...d, [field]: val } : d),
    }));
  };

  const handleSave = async () => {
    if (!currentBaba) return;
    if (canEditAll && !form.name.trim()) {
      toast.error('O nome do baba não pode ficar vazio');
      return;
    }
    if (canEditAll && form.selectedDays.length === 0) {
      toast.error('Selecione pelo menos um dia de jogo');
      return;
    }
    setSaving(true);
    try {
      // 1. Salvar via RPC (campos avançados)
      const rpcSettings = {
        max_line_players:       form.max_line_players ? Number(form.max_line_players) : null,
        max_goalkeepers:        Number(form.max_goalkeepers) || 0,
        max_substitutes:        Number(form.max_substitutes) || 0,
        confirmation_open_weekday: Number(form.confirmation_open_weekday),
        confirmation_open_time: form.confirmation_open_time,
        auto_draw_enabled:      form.auto_draw_enabled,
        auto_draw_time:         form.auto_draw_time,
        confirmation_open_days: Number(form.confirmation_open_days) || 3,
        confirmation_deadline:  form.confirmation_deadline,
        allow_guests:           form.allow_guests,
        guest_limit:            Number(form.guest_limit) || 2,
        ...(canEditAll ? {
          rating_enabled:    form.rating_enabled,
          rating_open_hours: Number(form.rating_open_hours) || 24,
          mvp_scope:         form.mvp_scope,
          theme_color:       form.theme_color,
          players_per_team:  Number(form.players_per_team) || 5,
          gk_mode:           form.gk_mode,
          gk_fallback:       form.gk_fallback,
        } : {}),
      };

      const { error: rpcErr } = await supabase.rpc('update_baba_settings', {
        p_baba_id: currentBaba.id,
        p_settings: rpcSettings,
      });
      if (rpcErr) throw rpcErr;

      // 2. Campos que a RPC não cobre — update direto
      const cleanDays = [...form.selectedDays].sort((a, b) => a.day - b.day);
      const directUpdate = {
        allow_reserves: form.allow_reserves,
        ...(canEditAll && form.pix_key !== undefined ? { pix_key: form.pix_key || null } : {}),
        ...(canEditAll ? {
          name:             form.name.trim(),
          location:         form.location.trim() || null,
          game_days:        cleanDays.map(d => d.day),
          game_days_config: cleanDays.map(d => ({
            day:      d.day,
            time:     d.time || DEFAULT_DAY_TIME,
            location: d.location?.trim() || form.location?.trim() || null,
          })),
          game_time: `${cleanDays[0]?.time || DEFAULT_DAY_TIME}:00`,
        } : {}),
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

  const handleDeleteBaba = async () => {
    setDeleting(true);
    const ok = await deleteBaba(currentBaba.id);
    setDeleting(false);
    if (ok) navigate('/home');
  };

  if (!currentBaba) return null;

  return (
    <div className="space-y-3">

      {/* Identidade, Dias e Local — apenas presidente */}
      {canEditAll && (
        <Section title="Identidade, Dias e Local" expanded={sections.schedule} onToggle={() => toggle('schedule')}>
          <Field
            label="Nome do baba"
            value={form.name}
            onChange={set('name')}
            placeholder="Ex: Baba do Parque"
            maxLength={40}
          />

          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-text-low mb-2 block">
              Dias de jogo
            </label>
            <div className="grid grid-cols-7 gap-1 mb-3">
              {DAYS.map(d => {
                const selected = form.selectedDays.some(s => s.day === d.value);
                return (
                  <button
                    key={d.value}
                    onClick={() => toggleDay(d.value)}
                    className={`py-3 rounded-xl text-[9px] font-black uppercase transition-all active:scale-90 ${
                      selected
                        ? 'bg-cyan-electric text-black shadow-lg shadow-cyan-electric/20'
                        : 'bg-surface-3 text-text-low border border-border-mid hover:border-cyan-electric/30'
                    }`}
                  >
                    {d.short}
                  </button>
                );
              })}
            </div>
            {form.selectedDays.length === 0 && (
              <div className="text-center py-6 border border-dashed border-border-mid rounded-2xl mb-3">
                <p className="text-text-muted text-[10px] font-black uppercase">Selecione pelo menos um dia</p>
              </div>
            )}
          </div>

          <Field
            label="Local padrão"
            value={form.location}
            onChange={set('location')}
            placeholder="Ex: Quadra do Parque, Society Arena..."
          />

          {form.selectedDays.length > 0 && (
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-text-low block">
                Horário e local por dia
              </label>
              {form.selectedDays.map(sd => {
                const dayInfo = DAYS.find(d => d.value === sd.day);
                const isOpen  = dayEditing === sd.day;
                return (
                  <div key={sd.day} className="rounded-2xl border border-border-mid overflow-hidden">
                    <button
                      onClick={() => setDayEditing(isOpen ? null : sd.day)}
                      className="w-full p-3 flex justify-between items-center bg-surface-3 hover:bg-surface-1 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-xl bg-cyan-electric/10 flex items-center justify-center text-cyan-electric text-[9px] font-black border border-cyan-electric/20">
                          {dayInfo?.short}
                        </span>
                        <div className="text-left">
                          <p className="font-black text-xs text-white">{dayInfo?.label}</p>
                          <p className="text-[9px] text-text-low">
                            {sd.time}{sd.location ? ` · ${sd.location}` : ''}
                          </p>
                        </div>
                      </div>
                      <ChevronRight
                        size={13}
                        className={`text-text-low transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
                      />
                    </button>
                    {isOpen && (
                      <div className="p-3 space-y-3 bg-black/40 border-t border-border-subtle animate-in slide-in-from-top-1 duration-150">
                        <div className="space-y-1">
                          <label className="text-[9px] text-text-low uppercase font-black flex items-center gap-1">
                            <Clock size={8} /> Horário
                          </label>
                          <input
                            type="time"
                            value={sd.time}
                            onChange={e => updateDayField(sd.day, 'time', e.target.value)}
                            className="w-full p-2.5 bg-black/40 border border-border-mid rounded-xl font-black text-xs focus:border-cyan-electric/50 focus:outline-none transition-colors"
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
                            className="w-full p-2.5 bg-black/40 border border-border-mid rounded-xl font-black text-xs placeholder:text-text-muted focus:border-cyan-electric/50 focus:outline-none transition-colors"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      )}

      {/* Jogo e Confirmações */}
      <Section title="Jogo e Confirmações" expanded={sections.game} onToggle={() => toggle('game')}>
        <Field
          label="Máx. jogadores de linha"
          type="number" min="2" max="50"
          value={form.max_line_players}
          onChange={set('max_line_players')}
          placeholder="Ilimitado"
        />
        <Field
          label="Máx. goleiros"
          type="number" min="0" max="20"
          value={form.max_goalkeepers}
          onChange={set('max_goalkeepers')}
        />
        <Field
          label="Máx. suplentes (fila de linha)"
          type="number" min="0" max="20"
          value={form.max_substitutes}
          onChange={set('max_substitutes')}
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
        <div>
          <label className="text-[9px] font-black uppercase tracking-widest text-text-low mb-1.5 block">
            Lista abre toda(o)
          </label>
          <select
            value={form.confirmation_open_weekday}
            onChange={e => set('confirmation_open_weekday')(e.target.value)}
            className="w-full bg-surface-2 border border-border-mid rounded-xl px-3 py-2.5 text-[11px] font-bold text-text-high"
          >
            {['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'].map((d, i) => (
              <option key={i} value={i}>{d}</option>
            ))}
          </select>
        </div>
        <Field
          label="Horário de abertura"
          type="time"
          value={form.confirmation_open_time}
          onChange={set('confirmation_open_time')}
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
        <p className="text-[10px] text-text-low font-bold leading-relaxed -mt-1">
          Define se e quando o sorteio roda sozinho. O card "Sorteio de Hoje", na Visão Geral, deixa ajustar jogadores por time só para a partida do dia — aqui embaixo fica o padrão usado sempre que o sorteio automático rodar sozinho.
        </p>
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

        {canEditAll && (
          <>
            <Field
              label="Jogadores por time (padrão)"
              type="number" min="3" max="11"
              value={form.players_per_team}
              onChange={set('players_per_team')}
            />

            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-text-low mb-1.5 block">
                Goleiro no sorteio
              </label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { id: 'court',    label: 'Fila da quadra',  sub: 'Time fixo se a conta bater (1 por time); senão o goleiro é da quadra, não do time — troca sozinho quando o time perde' },
                  { id: 'fixed',    label: 'Conta no time',   sub: 'Goleiro é sempre 1 dos jogadores por time, o dia todo' },
                  { id: 'separate', label: 'Vaga à parte',    sub: 'Goleiro nunca entra na conta de linha' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => set('gk_mode')(opt.id)}
                    className={`text-left px-3 py-2.5 rounded-xl border transition-all ${
                      form.gk_mode === opt.id
                        ? 'bg-cyan-electric/10 border-cyan-electric text-cyan-electric'
                        : 'bg-surface-2 border-border-mid text-text-low hover:border-border-strong'
                    }`}
                  >
                    <p className="text-[10px] font-black uppercase">{opt.label}</p>
                    <p className="text-[8px] font-bold mt-0.5 opacity-80">{opt.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            {form.gk_mode !== 'court' && (
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-text-low mb-1.5 block">
                  Se faltar goleiro pra algum time
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'lineplayer', label: 'Vira jogador de linha', sub: 'Um jogador de linha joga no gol' },
                    { id: 'incomplete', label: 'Time fica incompleto',  sub: 'Time joga sem goleiro dedicado' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => set('gk_fallback')(opt.id)}
                      className={`text-left px-3 py-2.5 rounded-xl border transition-all ${
                        form.gk_fallback === opt.id
                          ? 'bg-cyan-electric/10 border-cyan-electric text-cyan-electric'
                          : 'bg-surface-2 border-border-mid text-text-low hover:border-border-strong'
                      }`}
                    >
                      <p className="text-[10px] font-black uppercase">{opt.label}</p>
                      <p className="text-[8px] font-bold mt-0.5 opacity-80">{opt.sub}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
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

          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-text-low mb-1.5 block">
              Quem pode ser MVP do dia
            </label>
            <div className="grid grid-cols-1 gap-2">
              {[
                { id: 'all',          label: 'Todos que jogaram',        sub: 'Qualquer jogador do dia entra na votação' },
                { id: 'winning_team', label: 'Só o time que mais ganhou', sub: 'Só os jogadores do time com mais pontos no dia' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => set('mvp_scope')(opt.id)}
                  className={`text-left px-3 py-2.5 rounded-xl border transition-all ${
                    form.mvp_scope === opt.id
                      ? 'bg-cyan-electric/10 border-cyan-electric text-cyan-electric'
                      : 'bg-surface-2 border-border-mid text-text-low hover:border-border-strong'
                  }`}
                >
                  <p className="text-[10px] font-black uppercase">{opt.label}</p>
                  <p className="text-[8px] font-bold mt-0.5 opacity-80">{opt.sub}</p>
                </button>
              ))}
            </div>
          </div>
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

      {/* Zona de Perigo — apenas presidente */}
      {canEditAll && (
        <div className="rounded-2xl bg-red-500/[0.04] border border-red-500/20 overflow-hidden">
          <button
            onClick={() => toggle('danger')}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-red-500/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={13} className="text-red-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-red-400">Zona de Perigo</span>
            </div>
            {sections.danger
              ? <ChevronUp   size={13} className="text-red-400/70" />
              : <ChevronDown size={13} className="text-red-400/70" />}
          </button>
          {sections.danger && (
            <div className="px-4 pb-4 border-t border-red-500/10 space-y-3 pt-3">
              <p className="text-[10px] text-text-low font-bold leading-relaxed">
                Excluir o baba apaga permanentemente jogadores, partidas, avaliações, cobranças e todo o histórico do grupo. Essa ação não pode ser desfeita.
              </p>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-text-low mb-1.5 block">
                  Digite <span className="text-red-400">{currentBaba.name}</span> para confirmar
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={e => setDeleteConfirmText(e.target.value)}
                  placeholder={currentBaba.name}
                  className="w-full bg-surface-2 border border-red-500/20 rounded-xl px-3 py-2.5 text-xs font-black text-white placeholder:text-text-muted focus:outline-none focus:border-red-500/50 transition-colors"
                />
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleteConfirmText.trim() !== currentBaba.name || deleting}
                className="w-full py-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-[11px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deleting
                  ? <><RefreshCw size={13} className="animate-spin" /> Excluindo...</>
                  : <><Trash2 size={13} /> Excluir baba permanentemente</>}
              </button>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        open={showDeleteConfirm}
        message={`Excluir "${currentBaba.name}"?`}
        description="Todos os dados do grupo serão apagados para sempre. Não é possível desfazer."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        danger
        onConfirm={handleDeleteBaba}
        onCancel={() => setShowDeleteConfirm(false)}
      />

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
