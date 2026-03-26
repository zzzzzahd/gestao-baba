import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Calendar,
  Target,
  Heart,
  Save,
  X
} from 'lucide-react';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  // Estado para controlar os dados do formulário
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    email: profile?.email || '',
    age: profile?.age || '',
    position: profile?.position || '',
    favorite_team: profile?.favorite_team || '',
  });

  const [loading, setLoading] = useState(false);

  // Atualizar campo do formulário
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Salvar alterações no Supabase
  const handleSave = async () => {
    // Validação: nome não pode estar vazio
    if (!formData.name.trim()) {
      toast.error('O nome é obrigatório');
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('profiles')
        .update({
          name: formData.name.trim(),
          age: formData.age ? parseInt(formData.age) : null,
          position: formData.position || null,
          favorite_team: formData.favorite_team.trim() || null,
        })
        .eq('id', profile.id)
        .select()
        .single();

      if (error) throw error;

      toast.success('Perfil atualizado com sucesso!');
      
      // Aguardar 1 segundo e voltar para página anterior
      setTimeout(() => {
        navigate(-1);
      }, 1000);

    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  // Cancelar e voltar
  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-2xl mx-auto">
        {/* Botão Voltar */}
        <button 
          onClick={handleCancel}
          className="flex items-center gap-2 text-white/60 hover:text-cyan-electric mb-8 transition-all"
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-black uppercase">Voltar</span>
        </button>

        {/* Card Principal */}
        <div className="card-glass p-8 rounded-[2rem]">
          <h1 className="text-3xl font-black italic uppercase mb-8">
            Editar Perfil
          </h1>
          
          <div className="space-y-6">
            {/* Campo: Nome */}
            <div>
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">
                <User size={14} /> Nome
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="input-tactical"
                placeholder="Seu nome completo"
                disabled={loading}
              />
            </div>

            {/* Campo: Email (não editável) */}
            <div>
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">
                <Mail size={14} /> Email
              </label>
              <div className="input-tactical bg-white/10 cursor-not-allowed opacity-60">
                {formData.email}
              </div>
              <p className="text-[10px] text-white/30 mt-1 ml-1">
                O email não pode ser alterado
              </p>
            </div>

            {/* Campo: Idade */}
            <div>
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">
                <Calendar size={14} /> Idade
              </label>
              <input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleChange}
                min="10"
                max="99"
                className="input-tactical"
                placeholder="Ex: 28"
                disabled={loading}
              />
            </div>

            {/* Campo: Posição */}
            <div>
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">
                <Target size={14} /> Posição em Campo
              </label>
              <select
                name="position"
                value={formData.position}
                onChange={handleChange}
                className="input-tactical"
                disabled={loading}
              >
                <option value="">Selecione uma posição</option>
                <option value="goleiro">Goleiro</option>
                <option value="zagueiro">Zagueiro</option>
                <option value="meio-campo">Meio-campo</option>
                <option value="atacante">Atacante</option>
              </select>
            </div>

            {/* Campo: Time do Coração */}
            <div>
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">
                <Heart size={14} /> Time do Coração
              </label>
              <input
                type="text"
                name="favorite_team"
                value={formData.favorite_team}
                onChange={handleChange}
                className="input-tactical"
                placeholder="Ex: Flamengo"
                disabled={loading}
              />
            </div>

            {/* Botões de Ação */}
            <div className="pt-6 border-t border-white/10 grid grid-cols-2 gap-4">
              {/* Botão Cancelar */}
              <button
                onClick={handleCancel}
                disabled={loading}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X size={18} />
                Cancelar
              </button>

              {/* Botão Salvar */}
              <button
                onClick={handleSave}
                disabled={loading}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={18} />
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
