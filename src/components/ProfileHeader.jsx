import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { ArrowLeft, Camera, Edit3, Check, RefreshCw, Star } from 'lucide-react';
import toast from 'react-hot-toast';

const POSITION_LABEL = {
  goleiro: 'Goleiro', zagueiro: 'Zagueiro', lateral: 'Lateral',
  meia: 'Meia', atacante: 'Atacante', linha: 'Linha',
};

const ProfileHeader = ({ profile, globalRating, tab, onTabChange, onProfileRefresh }) => {
  const navigate    = useNavigate();
  const [uploading, setUploading] = useState(false);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || uploading) return;
    if (file.size > 5 * 1024 * 1024 || !file.type.startsWith('image/')) {
      toast.error('Imagem inválida (máx 5 MB)');
      e.target.value = null;
      return;
    }
    setUploading(true);
    try {
      const ext  = file.name.split('.').pop()?.toLowerCase() || 'png';
      const path = `avatars/${profile.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: dbErr } = await supabase
        .from('profiles').update({ avatar_url: publicUrl }).eq('id', profile.id);
      if (dbErr) throw dbErr;

      if (onProfileRefresh) await onProfileRefresh();
      toast.success('Foto atualizada!');
    } catch (err) {
      console.error('[ProfileHeader] avatar upload:', err);
      toast.error('Erro no upload');
    } finally {
      setUploading(false);
      e.target.value = null;
    }
  };

  const letter = (profile?.name || '?').charAt(0).toUpperCase();

  return (
    <div className="relative">
      {/* Background decorativo */}
      <div className="h-40 w-full bg-black relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,243,255,0.08)_0%,_transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(168,85,247,0.06)_0%,_transparent_60%)]" />
      </div>

      {/* Botão voltar */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-6 left-6 p-2.5 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 text-white/40 hover:text-white transition-colors z-10"
      >
        <ArrowLeft size={18} />
      </button>

      {/* Toggle edição */}
      <button
        onClick={() => onTabChange(tab === 'edit' ? 'stats' : 'edit')}
        className={`absolute top-6 right-6 p-2.5 backdrop-blur-md rounded-2xl border transition-all z-10 ${
          tab === 'edit'
            ? 'bg-cyan-electric border-cyan-electric text-black'
            : 'bg-black/60 border-white/10 text-white/40 hover:text-cyan-electric'
        }`}
      >
        {tab === 'edit' ? <Check size={18} /> : <Edit3 size={18} />}
      </button>

      {/* Avatar */}
      <div className="absolute -bottom-16 left-0 right-0 flex justify-center">
        <div className="relative">
          <div className="w-28 h-28 rounded-[2rem] border-4 border-black bg-gray-900 overflow-hidden shadow-2xl flex items-center justify-center">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                className={`w-full h-full object-cover transition-opacity ${uploading ? 'opacity-30' : ''}`}
                alt={profile.name}
              />
            ) : (
              <span className="text-4xl font-black text-cyan-electric">{letter}</span>
            )}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <RefreshCw size={22} className="text-cyan-electric animate-spin" />
              </div>
            )}
          </div>
          <label className="absolute -bottom-1 -right-1 p-2 bg-cyan-electric rounded-xl text-black cursor-pointer hover:scale-110 transition-transform shadow-lg">
            <Camera size={14} />
            <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
          </label>
        </div>
      </div>

      {/* Espaço do avatar */}
      <div className="h-20" />

      {/* Nome + posição + rating */}
      <div className="text-center px-6 mt-2 mb-1">
        <h1 className="text-2xl font-black italic uppercase tracking-tighter leading-none text-white">
          {profile?.name || 'Atleta'}
        </h1>
        <div className="flex items-center justify-center gap-3 mt-2 flex-wrap">
          {profile?.position && (
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-electric">
              {POSITION_LABEL[profile.position] || profile.position}
            </span>
          )}
          {profile?.favorite_team && (
            <>
              <span className="text-white/20">·</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                {profile.favorite_team}
              </span>
            </>
          )}
        </div>

        {globalRating > 0 && (
          <div className="flex items-center justify-center gap-1.5 mt-3">
            <Star size={14} className="text-cyan-electric" fill="currentColor" />
            <span className="text-xl font-black font-mono text-white">
              {Number(globalRating).toFixed(2)}
            </span>
            <span className="text-[10px] text-white/30 font-bold uppercase">rating global</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileHeader;
