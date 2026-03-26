import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBaba } from '../contexts/BabaContext';
import { X, Trash2, Save, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const BabaSettings = ({ baba, onClose }) => {
  const navigate = useNavigate();
  const { updateBaba, deleteBaba, loading } = useBaba();
  
  const [formData, setFormData] = useState({
    name: baba.name || '',
    modality: baba.modality || 'futsal',
    game_time: baba.game_time || '20:00',
    game_days: baba.game_days || [],
    match_duration: baba.match_duration || 10,
    players_per_team: baba.players_per_team || 5,
    allow_reserves: baba.allow_reserves !== false,
    min_players_to_start: baba.min_players_to_start || 4,
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const daysOfWeek = [
    { value: 0, label: 'DOM' },
    { value: 1, label: 'SEG' },
    { value: 2, label: 'TER' },
    { value: 3, label: 'QUA' },
    { value: 4, label: 'QUI' },
    { value: 5, label: 'SEX' },
    { value: 6, label: 'SÁB' },
  ];

  const toggleDay = (day) => {
    setFormData(prev => ({
      ...prev,
      game_days: prev.game_days.includes(day)
        ? prev.game_days.filter(d => d !== day)
        : [...prev.game_days, day].sort((a, b) => a - b)
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Nome do baba é obrigatório');
      return;
    }

    const result = await updateBaba(baba.id, formData);
    if (result) {
      onClose();
    }
  };

  const handleDelete = async () => {
    const result = await deleteBaba(baba.id);
    if (result) {
      navigate('/');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-2xl bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-[2rem] shadow-[0_0_50px_rgba(0,242,255,0.1)]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-2xl font-black uppercase italic text-cyan-electric">
            Configurações do Baba
          </h2>
          <button
            onClick={onClose}
            className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-all"
          >
            <X size={20} className="text-white/60" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-6 space-y-6">
          {/* Nome */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">
              Nome do Baba
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-tactical"
              placeholder="Ex: Baba da Galera"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Modalidade */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">
                Modalidade
              </label>
              <select
                value={formData.modality}
                onChange={(e) => setFormData({ ...formData, modality: e.target.value })}
                className="input-tactical"
              >
                <option value="futsal">Futsal</option>
                <option value="society">Society</option>
              </select>
            </div>

            {/* Horário */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">
                Horário do Jogo
              </label>
              <input
                type="time"
                value={formData.game_time}
                onChange={(e) => setFormData({ ...formData, game_time: e.target.value })}
                className="input-tactical"
              />
            </div>
          </div>

          {/* Dias da Semana */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">
              Dias da Semana
            </label>
            <div className="flex gap-2 flex-wrap">
              {daysOfWeek.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    formData.game_days.includes(day.value)
                      ? 'bg-cyan-electric text-black border-2 border-cyan-electric'
                      : 'bg-white/5 text-white/40 border-2 border-white/10 hover:border-white/20'
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
            <p className="text-[9px] text-white/30 mt-2">
              {formData.game_days.length === 0 
                ? 'Nenhum dia selecionado (jogo acontece todos os dias)' 
                : `Jogo acontece: ${formData.game_days.map(d => daysOfWeek.find(day => day.value === d)?.label).join(', ')}`
              }
            </p>
          </div>

          {/* Duração da Partida */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">
              Duração da Partida (minutos)
            </label>
            <input
              type="number"
              value={formData.match_duration}
              onChange={(e) => setFormData({ ...formData, match_duration: parseInt(e.target.value) })}
              className="input-tactical"
              min="5"
              max="120"
            />
          </div>

          {/* ⭐ NOVO: Configurações de Sorteio */}
          <div className="border-t border-white/10 pt-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-cyan-electric mb-4">
              Configurações de Sorteio
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Jogadores por Time */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">
                  Jogadores por Time
                </label>
                <input
                  type="number"
                  value={formData.players_per_team}
                  onChange={(e) => setFormData({ ...formData, players_per_team: parseInt(e.target.value) })}
                  className="input-tactical"
                  min="3"
                  max="11"
                />
                <p className="text-[8px] text-white/30 mt-1">
                  Futsal: 5 | Society: 7
                </p>
              </div>

              {/* Mínimo para Iniciar */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">
                  Mínimo para Sortear
                </label>
                <input
                  type="number"
                  value={formData.min_players_to_start}
                  onChange={(e) => setFormData({ ...formData, min_players_to_start: parseInt(e.target.value) })}
                  className="input-tactical"
                  min="4"
                  max="20"
                />
              </div>
            </div>

            {/* Permitir Reservas */}
            <div className="mt-4 flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
              <div>
                <p className="text-xs font-black uppercase">Permitir Reservas</p>
                <p className="text-[8px] text-white/40 mt-1">
                  Jogadores extras ficam como reservas
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, allow_reserves: !formData.allow_reserves })}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  formData.allow_reserves ? 'bg-cyan-electric' : 'bg-white/20'
                }`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-black rounded-full transition-transform ${
                  formData.allow_reserves ? 'translate-x-6' : 'translate-x-0'
                }`}></div>
              </button>
            </div>
          </div>

          {/* Botões */}
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

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="w-full max-w-md mx-4 card-glass p-8 rounded-[2rem] border-2 border-red-500/30">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="text-red-500" size={32} />
              </div>
              
              <div>
                <h3 className="text-xl font-black uppercase mb-2">
                  Excluir Baba?
                </h3>
                <p className="text-sm text-white/60">
                  Tem certeza que deseja excluir "<span className="text-white font-bold">{baba.name}</span>"?
                </p>
                <p className="text-xs text-red-500/80 mt-2">
                  Esta ação não pode ser desfeita!
                </p>
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
