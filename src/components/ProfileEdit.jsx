// src/components/ProfileEdit.jsx
// Sprint 19 — Campos adicionais: bio, instagram_handle, preferred_position, is_public
// Mantém todos os campos originais (name, age, position, favorite_team)

import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import {
  User, Mail, Calendar, Target, Heart,
  Save, X, RefreshCw, Instagram, FileText,
  Globe, Lock,
} from 'lucide-react';
import toast from 'react-hot-toast';

const POSITION_OPTIONS = [
  // Society / Futebol de campo
  { value: 'goleiro',  label: 'Goleiro'  },
  { value: 'zagueiro', label: 'Zagueiro' },
  { value: 'lateral',  label: 'Lateral'  },
  { value: 'meia',     label: 'Meia'     },
  { value: 'atacante', label: 'Atacante' },
  { value: 'linha',    label: 'Linha'    },
  // Futsal
  { value: 'fixo',     label: 'Fixo'     },
  { value: 'ala',      label: 'Ala'      },
  { value: 'pivo',     label: 'Pivô'     },
];

const INPUT_CLASS =
  'w-full bg-surface-2 border border-border-mid rounded-2xl px-4 py-3.5 text-sm font-bold text-white placeholder:text-text-muted focus:outline-none focus:border-cyan-electric/50 focus:bg-white/[0.07] transition-all disabled:opacity-50';

const FieldLabel = ({ icon, children }) => (
  <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-low mb-2">
    {icon} {children}
  </label>
);

const Toggle = ({ label, sub, value, onChange, disabled }) => (
  <div className="flex items-center justify-between py-3">
    <div>
      <p className="text-xs font-black text-white">{label}</p>
      {sub && <p className="text-[9px] text-text-muted font-black mt-0.5">{sub}</p>}
    </div>
    <button
      onClick={() => onChange(!value)}
      disabled={disabled}
      className={`relative w-10 h-5 rounded-full transition-all duration-300 disabled:opacity-50 ${
        value ? 'bg-cyan-electric' : 'bg-surface-3'
      }`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${
        value ? 'translate-x-5' : ''
      }`} />
    </button>
  </div>
);

const ProfileEdit = ({ profile, onCancel, onSaved, onProfileRefresh }) => {
  const [formData, setFormData] = useState({
    // Campos originais
    name:               profile?.name               || '',
    age:                profile?.age                || '',
    position:           profile?.position           || '',
    favorite_team:      profile?.favorite_team      || '',
    // Campos Sprint 19
    bio:                profile?.bio                || '',
    instagram_handle:   profile?.instagram_handle   || '',
    preferred_position: profile?.preferred_position || profile?.position || '',
    is_public:          profile?.is_public          ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('O nome é obrigatório');
      return;
    }

    // Validar instagram (sem @, sem espaços)
    if (formData.instagram_handle) {
      const clean = formData.instagram_handle.replace(/^@/, '').trim();
      if (/\s/.test(clean)) {
        toast.error('Instagram não pode ter espaços');
        return;
      }
      formData.instagram_handle = clean;
    }

    // Limitar bio a 160 chars
    if (formData.bio && formData.bio.length > 160) {
      toast.error('Bio deve ter no máximo 160 caracteres');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          // Campos originais
          name:               formData.name.trim(),
          age:                formData.age ? parseInt(formData.age) : null,
          position:           formData.position           || null,
          favorite_team:      formData.favorite_team.trim() || null,
          // Campos Sprint 19
          bio:                formData.bio.trim()              || null,
          instagram_handle:   formData.instagram_handle.trim() || null,
          preferred_position: formData.preferred_position      || null,
          is_public:          formData.is_public,
        })
        .eq('id', profile.id);

      if (error) throw error;

      if (onProfileRefresh) await onProfileRefresh();
      toast.success('Perfil atualizado! ✅');
      if (onSaved) onSaved();
    } catch (e) {
      console.error('[ProfileEdit] save:', e);
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const bioLength = formData.bio?.length || 0;

  return (
    <div className="space-y-5">

      {/* ── Informações básicas ──────────────────────────────────────── */}
      <div className="px-1">
        <p className="text-[9px] font-black uppercase tracking-widest text-text-muted">
          Informações básicas
        </p>
      </div>

      {/* Nome */}
      <div>
        <FieldLabel icon={<User size={12} />}>Nome</FieldLabel>
        <input
          type="text" name="name" value={formData.name}
          onChange={handleChange} disabled={saving}
          placeholder="Seu nome"
          className={INPUT_CLASS}
        />
      </div>

      {/* Email (readonly) */}
      <div>
        <FieldLabel icon={<Mail size={12} />}>Email</FieldLabel>
        <div className="w-full bg-surface-1 border border-border-subtle rounded-2xl px-4 py-3.5 text-sm font-bold text-text-low cursor-not-allowed">
          {profile?.email || '—'}
        </div>
        <p className="text-[9px] text-text-muted mt-1 ml-1">Não pode ser alterado</p>
      </div>

      {/* Idade */}
      <div>
        <FieldLabel icon={<Calendar size={12} />}>Idade</FieldLabel>
        <input
          type="number" name="age" value={formData.age}
          onChange={handleChange} disabled={saving}
          min="10" max="99" placeholder="Ex: 28"
          className={INPUT_CLASS}
        />
      </div>

      {/* Posição principal */}
      <div>
        <FieldLabel icon={<Target size={12} />}>Posição em Campo</FieldLabel>
        <select
          name="position" value={formData.position}
          onChange={handleChange} disabled={saving}
          className={`${INPUT_CLASS} appearance-none`}
        >
          <option value="" className="bg-black">Selecione uma posição</option>
          {POSITION_OPTIONS.map(p => (
            <option key={p.value} value={p.value} className="bg-black">{p.label}</option>
          ))}
        </select>
      </div>

      {/* Time do coração */}
      <div>
        <FieldLabel icon={<Heart size={12} />}>Time do Coração</FieldLabel>
        <input
          type="text" name="favorite_team" value={formData.favorite_team}
          onChange={handleChange} disabled={saving}
          placeholder="Ex: Flamengo"
          className={INPUT_CLASS}
        />
      </div>

      {/* ── Perfil público (Sprint 19) ────────────────────────────────── */}
      <div className="pt-3 border-t border-border-subtle">
        <p className="text-[9px] font-black uppercase tracking-widest text-text-muted px-1 mb-4">
          Perfil público
        </p>

        {/* Bio */}
        <div className="mb-4">
          <FieldLabel icon={<FileText size={12} />}>Bio</FieldLabel>
          <div className="relative">
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              disabled={saving}
              placeholder="Conte um pouco sobre você como jogador..."
              rows={3}
              maxLength={160}
              className={`${INPUT_CLASS} resize-none`}
            />
            <span className={`absolute bottom-3 right-4 text-[9px] font-black ${
              bioLength > 140 ? 'text-yellow-400' : 'text-text-muted'
            }`}>
              {bioLength}/160
            </span>
          </div>
        </div>

        {/* Instagram */}
        <div className="mb-4">
          <FieldLabel icon={<Instagram size={12} />}>Instagram</FieldLabel>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-black text-sm">@</span>
            <input
              type="text"
              name="instagram_handle"
              value={formData.instagram_handle}
              onChange={handleChange}
              disabled={saving}
              placeholder="seu_usuario"
              className={`${INPUT_CLASS} pl-8`}
            />
          </div>
        </div>

        {/* Posição preferida */}
        <div className="mb-4">
          <FieldLabel icon={<Target size={12} />}>Posição preferida (exibida no perfil)</FieldLabel>
          <select
            name="preferred_position"
            value={formData.preferred_position}
            onChange={handleChange}
            disabled={saving}
            className={`${INPUT_CLASS} appearance-none`}
          >
            <option value="" className="bg-black">Selecione</option>
            {POSITION_OPTIONS.map(p => (
              <option key={p.value} value={p.value} className="bg-black">{p.label}</option>
            ))}
          </select>
        </div>

        {/* Visibilidade do perfil */}
        <div className="p-4 rounded-2xl bg-surface-1 border border-border-subtle">
          <Toggle
            label="Perfil público"
            sub={formData.is_public
              ? 'Qualquer pessoa com o link pode ver seu perfil'
              : 'Seu perfil está oculto para outros jogadores'}
            value={formData.is_public}
            onChange={(v) => setFormData(prev => ({ ...prev, is_public: v }))}
            disabled={saving}
          />
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border-subtle">
            {formData.is_public
              ? <Globe size={12} className="text-cyan-electric" />
              : <Lock  size={12} className="text-text-muted"    />
            }
            <p className="text-[9px] font-black text-text-muted">
              {formData.is_public
                ? 'Stats, badges e babas ficam visíveis publicamente'
                : 'Apenas membros do mesmo baba podem ver suas informações'}
            </p>
          </div>
        </div>
      </div>

      {/* Botões */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <button
          onClick={onCancel} disabled={saving}
          className="py-4 rounded-2xl bg-surface-2 border border-border-mid text-text-low font-black uppercase text-[10px] tracking-widest hover:bg-surface-3 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <X size={14} /> Cancelar
        </button>
        <button
          onClick={handleSave} disabled={saving}
          className="py-4 rounded-2xl bg-cyan-electric text-black font-black uppercase text-[10px] tracking-widest shadow-lg shadow-cyan-electric/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving
            ? <><RefreshCw size={12} className="animate-spin" /> Salvando...</>
            : <><Save size={12} /> Salvar</>
          }
        </button>
      </div>
    </div>
  );
};

export default ProfileEdit;
