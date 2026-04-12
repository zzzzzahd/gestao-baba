import React, { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBaba, sanitizeGameDaysConfig } from '../contexts/BabaContext';
import { X, Trash2, Save, AlertTriangle, Image, Loader2, MapPin, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const DAY_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const DAY_SHORT  = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

const initGameDaysConfig = (baba) => {
  if (Array.isArray(baba?.game_days_config) && baba.game_days_config.length > 0) {
    return sanitizeGameDaysConfig(baba.game_days_config);
  }
  if (Array.isArray(baba?.game_days) && baba.game_days.length > 0) {
    const time = baba.game_time?.substring(0, 5) || '20:00';
    return sanitizeGameDaysConfig(
      baba.game_days.map((d) => ({ day: Number(d), time, location: baba.location || '' }))
    );
  }
  return [];
};

const isValidTime = (time) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);

const BabaSettings = ({ baba, onClose }) => {
  const navigate = useNavigate();
  const { updateBaba, deleteBaba, uploadBabaImage } = useBaba();

  const avatarInputRef = useRef(null);
  const coverInputRef  = useRef(null);

  const [name, setName] = useState(baba.name || '');
  const [modality, setModality] = useState(baba.modality || 'futsal');
  const [matchDuration, setMatchDuration] = useState(baba.match_duration || 10);
  const [location, setLocation] = useState(baba.location || '');
  const [gameDaysConfig, setGameDaysConfig] = useState(() => initGameDaysConfig(baba));

  // ✅ CORRIGIDO: usa logo_url (campo real do banco) em vez de avatar_url
  const [avatarPreview, setAvatarPreview] = useState(baba.logo_url || null);
  const [coverPreview, setCoverPreview]   = useState(baba.cover_url || null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover]   = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const usedDays = useMemo(() => new Set(gameDaysConfig.map(c => c.day)), [gameDaysConfig]);
  const availableDays = useMemo(() => [0,1,2,3,4,5,6].filter(d => !usedDays.has(d)), [usedDays]);
  const initials = useMemo(() => (name || baba.name || '?').charAt(0).toUpperCase(), [name, baba.name]);
  const agendaSummary = useMemo(() =>
    [...gameDaysConfig].sort((a, b) => a.day - b.day).map(d => `${DAY_SHORT[d.day]} ${d.time}`).join(' · '),
    [gameDaysConfig]
  );

  const handleImageChange = async (e, type) => {
    if (uploadingAvatar || uploadingCover) return;
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Selecione uma imagem válida');
    if (file.size > 5 * 1024 * 1024) return toast.error('Máximo 5MB permitido');

    try {
      type === 'avatar' ? setUploadingAvatar(true) : setUploadingCover(true);
      const res = await uploadBabaImage(file, type);
      if (!res) throw new Error();
      const reader = new FileReader();
      reader.onload = (ev) => type === 'avatar'
        ? setAvatarPreview(ev.target.result)
        : setCoverPreview(ev.target.result);
      reader.readAsDataURL(file);
      toast.success('Imagem atualizada');
    } catch {
      toast.error('Erro no upload');
    } finally {
      type === 'avatar' ? setUploadingAvatar(false) : setUploadingCover(false);
    }
  };

  const handleAddDay = () => {
    if (availableDays.length === 0) return toast.error('Agenda cheia');
    const dayToAdd = availableDays[0];
    setGameDaysConfig(prev =>
      sanitizeGameDaysConfig([...prev, { day: dayToAdd, time: '20:00', location: '' }])
        .sort((a, b) => a.day - b.day)
    );
    toast.success(`${DAY_LABELS[dayToAdd]} adicionado`);
  };

  const handleRemoveDay = (idx) => {
    setGameDaysConfig(prev => prev.filter((_, i) => i !== idx));
  };

  const updateDayField = (index, field, value) => {
    setGameDaysConfig(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: field === 'day' ? Number(value) : value };
      return field === 'day'
        ? sanitizeGameDaysConfig(updated).sort((a, b) => a.day - b.day)
        : updated;
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    if (!name.trim()) return toast.error('Nome obrigatório');
    const invalid = gameDaysConfig.find(c => !isValidTime(c.time));
    if (invalid) return toast.error(`Horário inválido na ${DAY_LABELS[invalid.day]}`);

    setIsSaving(true);
    try {
      const cleanConfig = sanitizeGameDaysConfig(gameDaysConfig);
      const updates = {
        name: name.trim(),
        modality,
        match_duration: Number(matchDuration),
        location: location.trim(),
        // ✅ game_days_config agora existe no banco (após rodar o SQL)
        game_days_config: cleanConfig,
        // Mantém game_days e game_time sincronizados para compatibilidade
        game_days: cleanConfig.map(c => c.day),
        game_time: cleanConfig[0]?.time || '20:00',
      };

      const result = await updateBaba(baba.id, updates);
      if (result) onClose();
    } catch {
      toast.error('Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex justify-center z-[60] p-0 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-black border-x border-white/5 sm:border sm:rounded-[2.5rem] sm:my-auto overflow-hidden shadow-2xl relative animate-in fade-in duration-300">

        {/* Sticky Header */}
        <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-xl border-b border-white/5 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black uppercase italic text-white tracking-tighter">Administração do Grupo</h2>
            <p className="text-[9px] font-black text-cyan-electric uppercase tracking-[0.2em] opacity-60 mt-1 truncate max-w-[200px]">
              {agendaSummary || 'Sem dias configurados'}
            </p>
          </div>
          <button onClick={onClose} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-all active:scale-95">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-8 pb-32">

          {/* Imagens */}
          <div className="space-y-4">
            <div
              className="relative h-40 rounded-[2rem] bg-gray-900 border border-white/10 overflow-hidden cursor-pointer group"
              onClick={() => !uploadingCover && coverInputRef.current?.click()}
            >
              {coverPreview
                ? <img src={coverPreview} className={`w-full h-full object-cover transition-all duration-500 ${uploadingCover ? 'opacity-20' : 'opacity-40 group-hover:opacity-60'}`} alt="" />
                : <div className="absolute inset-0 flex flex-col items-center justify-center text-white/10"><Image size={40} /></div>
              }
              {uploadingCover && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 size={32} className="animate-spin text-cyan-electric" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
              <input ref={coverInputRef} type="file" className="hidden" accept="image/*" onChange={e => handleImageChange(e, 'cover')} />
            </div>

            <div className="flex items-center gap-6 px-2">
              <div
                className="relative w-24 h-24 rounded-[2.5rem] bg-gray-800 border-4 border-black -mt-12 z-10 overflow-hidden cursor-pointer group shadow-2xl"
                onClick={() => !uploadingAvatar && avatarInputRef.current?.click()}
              >
                {avatarPreview
                  ? <img src={avatarPreview} className={`w-full h-full object-cover transition-transform group-hover:scale-110 ${uploadingAvatar ? 'opacity-20' : ''}`} alt="" />
                  : <div className="w-full h-full flex items-center justify-center bg-cyan-electric/10 text-cyan-electric text-4xl font-black italic">{initials}</div>
                }
                {uploadingAvatar && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 size={24} className="animate-spin text-cyan-electric" />
                  </div>
                )}
                <input ref={avatarInputRef} type="file" className="hidden" accept="image/*" onChange={e => handleImageChange(e, 'avatar')} />
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-black uppercase text-white/40 tracking-widest ml-1">Nome do Baba</label>
                <input
                  type="text" value={name} onChange={e => setName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 mt-1 font-bold outline-none focus:border-cyan-electric/50 transition-colors"
                  required
                />
              </div>
            </div>
          </div>

          {/* Dados Básicos */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-white/40 tracking-widest ml-1">Modalidade</label>
              <select value={modality} onChange={e => setModality(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 font-bold outline-none appearance-none cursor-pointer">
                <option value="futsal">Futsal</option>
                <option value="society">Society</option>
                <option value="campo">Campo</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-white/40 tracking-widest ml-1">Duração (min)</label>
              <input type="number" value={matchDuration} onChange={e => setMatchDuration(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 font-bold outline-none" min="5" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-white/40 tracking-widest ml-1">Local Padrão</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
              <input type="text" value={location} onChange={e => setLocation(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 font-bold outline-none focus:border-cyan-electric/50" placeholder="Ex: Arena da Vila" />
            </div>
          </div>

          {/* Agenda */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Configuração de Agenda</label>
              <button
                type="button" onClick={handleAddDay}
                disabled={availableDays.length === 0}
                className="text-[10px] font-black uppercase text-cyan-electric bg-cyan-electric/10 px-4 py-2 rounded-xl border border-cyan-electric/20 hover:bg-cyan-electric/20 transition-all disabled:opacity-20"
              >
                + Adicionar Dia
              </button>
            </div>

            {gameDaysConfig.length === 0 && (
              <div className="text-center py-10 bg-white/5 border border-dashed border-white/10 rounded-[2rem] text-white/20 text-[10px] font-black uppercase tracking-widest">
                Nenhum dia de jogo configurado
              </div>
            )}

            <div className="space-y-3">
              {gameDaysConfig.map((item, idx) => {
                const isTimeInvalid = item.time && !isValidTime(item.time);
                return (
                  <div key={idx} className={`bg-white/5 border rounded-[2rem] p-5 space-y-4 transition-all ${isTimeInvalid ? 'border-red-500/30 bg-red-500/5' : 'border-white/10'}`}>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <select
                          value={item.day}
                          onChange={e => updateDayField(idx, 'day', e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-[10px] font-black uppercase tracking-widest outline-none"
                        >
                          {[0,1,2,3,4,5,6].filter(d => d === item.day || !usedDays.has(d)).map(d => (
                            <option key={d} value={d}>{DAY_LABELS[d]}</option>
                          ))}
                        </select>
                      </div>
                      <div className="relative w-32">
                        <Clock size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isTimeInvalid ? 'text-red-500' : 'text-white/20'}`} />
                        <input
                          type="time" value={item.time}
                          onChange={e => updateDayField(idx, 'time', e.target.value)}
                          className={`w-full bg-black/40 border rounded-xl p-2 pl-9 text-xs font-black outline-none transition-colors ${isTimeInvalid ? 'border-red-500/50 text-red-500' : 'border-white/10'}`}
                          required
                        />
                      </div>
                      <button type="button" onClick={() => handleRemoveDay(idx)} className="p-2 text-red-500/40 hover:text-red-500 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <input
                      type="text" value={item.location}
                      onChange={e => updateDayField(idx, 'location', e.target.value)}
                      placeholder={`Local específico${location ? ` (Padrão: ${location})` : ''}`}
                      className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-[11px] font-bold outline-none focus:border-white/20"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-black/80 backdrop-blur-xl border-t border-white/5 flex gap-4">
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="p-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl hover:bg-red-500 hover:text-black transition-all"
          >
            <Trash2 size={20} />
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || uploadingAvatar || uploadingCover}
            className="flex-1 bg-cyan-electric text-black font-black uppercase italic tracking-tighter py-4 rounded-2xl shadow-lg shadow-cyan-electric/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            {isSaving ? 'Salvando...' : 'Confirmar Ajustes'}
          </button>
        </div>

        {/* Modal Delete */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 animate-in zoom-in-95 duration-200">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => !isSaving && setShowDeleteConfirm(false)} />
            <div className="relative w-full max-w-sm bg-gray-900 border border-red-500/30 rounded-[2.5rem] p-8 text-center space-y-6 shadow-2xl">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500">
                <AlertTriangle size={32} />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tighter text-white">Excluir Grupo?</h3>
                <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-2">Os dados serão perdidos permanentemente.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-4 rounded-2xl bg-white/5 font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-colors">
                  Voltar
                </button>
                <button
                  onClick={async () => {
                    setIsSaving(true);
                    const res = await deleteBaba(baba.id);
                    if (res) { navigate('/'); onClose(); }
                  }}
                  disabled={isSaving}
                  className="flex-1 py-4 rounded-2xl bg-red-500 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-red-500/20 disabled:opacity-50"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BabaSettings;
