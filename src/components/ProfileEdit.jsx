import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { User, Mail, Calendar, Target, Heart, Save, X, RefreshCw } from 'lucide-react';
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
  'w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm font-bold text-white placeholder:text-white/20 focus:outline-none focus:border-cyan-electric/50 focus:bg-white/[0.07] transition-all disabled:opacity-50';

const FieldLabel = ({ icon, children }) => (
  <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">
    {icon} {children}
  </label>
);

const ProfileEdit = ({ profile, onCancel, onSaved, onProfileRefresh }) => {
  const [formData, setFormData] = useState({
    name:          profile?.name          || '',
    age:           profile?.age           || '',
    position:      profile?.position      || '',
    favorite_team: profile?.favorite_team || '',
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
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name:          formData.name.trim(),
          age:           formData.age ? parseInt(formData.age) : null,
          position:      formData.position || null,
          favorite_team: formData.favorite_team.trim() || null,
        })
        .eq('id', profile.id);
      if (error) throw error;

      if (onProfileRefresh) await onProfileRefresh();
      toast.success('Perfil atualizado!');
      if (onSaved) onSaved();
    } catch (e) {
      console.error('[ProfileEdit] save:', e);
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">

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
        <div className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-3.5 text-sm font-bold text-white/30 cursor-not-allowed">
          {profile?.email || '—'}
        </div>
        <p className="text-[9px] text-white/20 mt-1 ml-1">Não pode ser alterado</p>
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

      {/* Posição */}
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

      {/* Botões */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <button
          onClick={onCancel} disabled={saving}
          className="py-4 rounded-2xl bg-white/5 border border-white/10 text-white/40 font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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

