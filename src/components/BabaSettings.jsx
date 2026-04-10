import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBaba, sanitizeGameDaysConfig } from '../contexts/BabaContext';
import { X, Trash2, Save, AlertTriangle, Plus, Camera, Image } from 'lucide-react';
import toast from 'react-hot-toast';

const DAY_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const DAY_SHORT  = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

/**
 * Inicializa o estado da config de dias a partir do baba.
 * Prioridade: game_days_config (novo) → game_days + game_time (legado)
 */
const initGameDaysConfig = (baba) => {
  // Novo formato
  if (Array.isArray(baba?.game_days_config) && baba.game_days_config.length > 0) {
    return sanitizeGameDaysConfig(baba.game_days_config);
  }
  // Legado: converte para o novo formato
  if (Array.isArray(baba?.game_days) && baba.game_days.length > 0) {
    const time = baba.game_time?.substring(0, 5) || '20:00';
    return sanitizeGameDaysConfig(
      baba.game_days.map((d) => ({ day: Number(d), time, location: '' }))
    );
  }
  return [];
};

const BabaSettings = ({ baba, onClose }) => {
  const navigate = useNavigate();
  const { updateBaba, deleteBaba, uploadBabaImage, loading } = useBaba();

  const avatarInputRef = useRef(null);
  const coverInputRef  = useRef(null);

  // ── Estado do formulário ──
  const [name, setName] = useState(baba.name || '');
  const [modality, setModality] = useState(baba.modality || 'futsal');
  const [matchDuration, setMatchDuration] = useState(baba.match_duration || 10);
  const [location, setLocation] = useState(baba.location || '');

  // Config de dias/horários (novo formato)
  const [gameDaysConfig, setGameDaysConfig] = useState(() => initGameDaysConfig(baba));

  // Preview de imagens
  const [avatarPreview, setAvatarPreview] = useState(baba.avatar_url || null);
  const [coverPreview, setCoverPreview] = useState(baba.cover_url || null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // ── Dias disponíveis para adicionar (não duplicar) ──
  const usedDays = new Set(gameDaysConfig.map((c) => c.day));
  const availableDays = [0, 1, 2, 3, 4, 5, 6].filter((d) => !usedDays.has(d));

  // ── Handlers de dias ──
  const addDay = () => {
    if (availableDays.length === 0) {
      toast.error('Todos os dias já foram adicionados');
      return;
    }
    const nextDay = availableDays[0];
    setGameDaysConfig((prev) =>
      sanitizeGameDaysConfig([...prev, { day: nextDay, time: '20:00', location: '' }])
    );
  };

  const removeDay = (index) => {
    setGameDaysConfig((prev) => prev.filter((_, i) => i !== index));
  };

  const updateDayField = (index, field, value) => {
    setGameDaysConfig((prev) => {
      const updated = prev.map((item, i) =>
        i === index ? { ...item, [field]: field === 'day' ? Number(value) : value } : item
      );
      // Re-sanitiza para garantir sem duplicata após troca de dia
      return sanitizeGameDaysConfig(updated);
    });
  };

  // ── Handlers de imagem ──
  const handleImageChange = (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validação básica
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem válido');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem deve ter no máximo 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      if (type === 'avatar') {
        setAvatarPreview(ev.target.result);
        setAvatarFile(file);
      } else {
        setCoverPreview(ev.target.result);
        setCoverFile(file);
      }
    };
    reader.readAsDataURL(file);
  };

  // ── Salvar ──
  const handleSave = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Nome do baba é obrigatório');
      return;
    }

    if (gameDaysConfig.length === 0) {
      toast.error('Adicione pelo menos um dia de jogo');
      return;
    }

    // Sanitiza antes de enviar
    const cleanConfig = sanitizeGameDaysConfig(gameDaysConfig);

    const updates = {
      name: name.trim(),
      modality,
      match_duration: Number(matchDuration),
      location: location.trim(),
      game_days_config: cleanConfig,
      // Zera campos legados para evitar mistura
      game_days: [],
      // game_time mantido como fallback (usa o primeiro item da config)
      game_time: cleanConfig[0]?.time || baba.game_time || '20:00',
    };

    const result = await updateBaba(baba.id, updates);
    if (!result) return;

    // Upload de imagens pendentes
    if (avatarFile) await uploadBabaImage(avatarFile, 'avatar');
    if (coverFile) await uploadBabaImage(coverFile, 'cover');

    onClose();
  };

  // ── Deletar ──
  const handleDelete = async () => {
    const result = await deleteBaba(baba.id);
    if (result) {
      navigate('/');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center z-50 p-4 overflow-y-auto">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-[2rem] shadow-[0_0_50px_rgba(0,242,255,0.1)]">

        {/* ── Header ── */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-2xl font-black uppercase italic text-cyan-electric">
            Configurações do Baba
          </h2>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-all">
            <X size={20} className="text-white/60" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">

          {/* ── Capa ── */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">
              Capa do Baba
            </label>
            <div
              className="relative w-full h-28 rounded-2xl overflow-hidden bg-white/5 border border-dashed border-white/20 cursor-pointer hover:border-cyan-electric/50 transition-all group"
              onClick={() => coverInputRef.current?.click()}
            >
              {coverPreview ? (
                <img src={coverPreview} alt="Capa" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-2">
                  <Image size={24} className="text-white/20 group-hover:text-cyan-electric/60 transition-all" />
                  <span className="text-[9px] font-black uppercase text-white/30">Adicionar capa</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                <Camera size={20} className="text-white" />
              </div>
            </div>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImageChange(e, 'cover')}
            />
          </div>

          {/* ── Avatar + Nome ── */}
          <div className="flex items-end gap-4">
            <div className="flex-shrink-0">
              <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">
                Brasão
              </label>
              <div
                className="relative w-20 h-20 rounded-2xl overflow-hidden bg-white/5 border border-dashed border-white/20 cursor-pointer hover:border-cyan-electric/50 transition-all group"
                onClick={() => avatarInputRef.current?.click()}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Camera size={20} className="text-white/20 group-hover:text-cyan-electric/60 transition-all" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                  <Camera size={14} className="text-white" />
                </div>
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageChange(e, 'avatar')}
              />
            </div>

            <div className="flex-1">
              <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">
                Nome do Baba
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-tactical"
                placeholder="Ex: Baba da Galera"
                required
              />
            </div>
          </div>

          {/* ── Modalidade + Duração ── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">
                Modalidade
              </label>
              <select
                value={modality}
                onChange={(e) => setModality(e.target.value)}
                className="input-tactical"
              >
                <option value="futsal">Futsal</option>
                <option value="society">Society</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">
                Duração da Partida (min)
              </label>
              <input
                type="number"
                value={matchDuration}
                onChange={(e) => setMatchDuration(e.target.value)}
                className="input-tactical"
                min="5"
                max="120"
              />
            </div>
          </div>

          {/* ── Local padrão ── */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">
              Local Padrão (opcional)
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="input-tactical"
              placeholder="Ex: Arena X, Quadra Central"
            />
          </div>

          {/* ── Dias e Horários (game_days_config) ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-white/40">
                  Dias e Horários de Jogo
                </label>
                <p className="text-[9px] text-white/30 mt-0.5">
                  Configure horário e local para cada dia
                </p>
              </div>
              <button
                type="button"
                onClick={addDay}
                disabled={availableDays.length === 0}
                className="flex items-center gap-2 px-3 py-2 bg-cyan-electric/10 border border-cyan-electric/30 rounded-xl text-cyan-electric text-[10px] font-black uppercase tracking-widest hover:bg-cyan-electric/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus size={14} />
                Adicionar Dia
              </button>
            </div>

            {/* Lista de dias configurados */}
            {gameDaysConfig.length === 0 ? (
              <div className="p-6 bg-white/5 rounded-2xl border border-dashed border-white/10 text-center">
                <p className="text-xs text-white/30 font-black uppercase">
                  Nenhum dia configurado
                </p>
                <p className="text-[9px] text-white/20 mt-1">
                  Clique em "Adicionar Dia" para começar
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {gameDaysConfig.map((item, index) => (
                  <div
                    key={`${item.day}-${index}`}
                    className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3"
                  >
                    {/* Linha 1: seletor de dia + horário + remover */}
                    <div className="flex items-center gap-3">
                      {/* Seletor de dia */}
                      <div className="flex-1">
                        <label className="block text-[9px] font-black uppercase text-white/40 mb-1">
                          Dia
                        </label>
                        <select
                          value={item.day}
                          onChange={(e) => updateDayField(index, 'day', e.target.value)}
                          className="input-tactical text-sm"
                        >
                          {/* Sempre mostra o dia atual + disponíveis */}
                          {[0, 1, 2, 3, 4, 5, 6]
                            .filter((d) => d === item.day || !usedDays.has(d))
                            .map((d) => (
                              <option key={d} value={d}>
                                {DAY_LABELS[d]}
                              </option>
                            ))}
                        </select>
                      </div>

                      {/* Horário */}
                      <div className="w-32">
                        <label className="block text-[9px] font-black uppercase text-white/40 mb-1">
                          Horário
                        </label>
                        <input
                          type="time"
                          value={item.time}
                          onChange={(e) => updateDayField(index, 'time', e.target.value)}
                          className="input-tactical text-sm"
                          required
                        />
                      </div>

                      {/* Remover */}
                      <button
                        type="button"
                        onClick={() => removeDay(index)}
                        className="mt-5 p-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 hover:bg-red-500/20 transition-all flex-shrink-0"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Linha 2: local específico */}
                    <div>
                      <label className="block text-[9px] font-black uppercase text-white/40 mb-1">
                        Local (opcional)
                      </label>
                      <input
                        type="text"
                        value={item.location || ''}
                        onChange={(e) => updateDayField(index, 'location', e.target.value)}
                        className="input-tactical text-sm"
                        placeholder="Ex: Quadra Norte"
                      />
                    </div>

                    {/* Badge de resumo */}
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-cyan-electric/10 border border-cyan-electric/20 rounded-lg text-[9px] font-black text-cyan-electric uppercase">
                        {DAY_SHORT[item.day]}
                      </span>
                      <span className="text-[9px] text-white/40 font-black">
                        {item.time} {item.location ? `• ${item.location}` : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Aviso se configurou todos os dias */}
            {availableDays.length === 0 && (
              <p className="text-[9px] text-cyan-electric mt-2">
                ✓ Todos os dias da semana configurados
              </p>
            )}
          </div>

          {/* ── Botões ── */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-cyan-electric to-blue-600 text-black font-black uppercase italic tracking-tighter shadow-[0_10px_40px_rgba(0,255,242,0.2)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save size={18} />
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>

            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="px-6 py-4 rounded-2xl bg-white/5 border border-red-500/30 text-red-500 font-black uppercase text-[10px] tracking-widest hover:bg-red-500/10 transition-all flex items-center gap-2"
            >
              <Trash2 size={16} />
              Excluir
            </button>
          </div>
        </form>
      </div>

      {/* ── Modal de Confirmação de Exclusão ── */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10 p-4">
          <div className="w-full max-w-md card-glass p-8 rounded-[2rem] border-2 border-red-500/30">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="text-red-500" size={32} />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase mb-2">Excluir Baba?</h3>
                <p className="text-sm text-white/60">
                  Tem certeza que deseja excluir{' '}
                  <span className="text-white font-bold">"{baba.name}"</span>?
                </p>
                <p className="text-xs text-red-500/80 mt-2">Esta ação não pode ser desfeita!</p>
              </div>
              <div className="flex gap-3 w-full mt-4">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 font-black uppercase text-xs hover:bg-white/10 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-red-500 text-white font-black uppercase text-xs hover:bg-red-600 transition-all disabled:opacity-50"
                >
                  {loading ? 'Excluindo...' : 'Sim, Excluir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BabaSettings;
