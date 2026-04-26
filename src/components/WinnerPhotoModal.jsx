import React, { useState, useRef } from 'react';
import { Camera, X, Upload, Trophy } from 'lucide-react';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';

// Modal para tirar/upload foto do time vencedor após finalizar partida
const WinnerPhotoModal = ({ isOpen, onClose, matchId, babaId, winnerName, onSaved }) => {
  const [uploading,  setUploading]  = useState(false);
  const [preview,    setPreview]    = useState(null);
  const [file,       setFile]       = useState(null);
  const inputRef = useRef();

  if (!isOpen) return null;

  const handleFileSelect = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { toast.error('Selecione uma imagem'); return; }
    if (f.size > 10 * 1024 * 1024)   { toast.error('Máximo 10 MB');          return; }
    setFile(f);
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  const handleUpload = async () => {
    if (!file || !matchId) return;
    setUploading(true);
    try {
      const ext  = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `match-winners/${babaId}/${matchId}-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from('match-photos')
        .upload(path, file, { upsert: true, contentType: file.type });

      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage
        .from('match-photos')
        .getPublicUrl(path);

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Salva na partida
      const { error: matchErr } = await supabase
        .from('matches')
        .update({ winner_photo_url: publicUrl })
        .eq('id', matchId);

      if (matchErr) throw matchErr;

      // Salva também no baba como última foto de vencedor
      await supabase
        .from('babas')
        .update({ last_winner_photo: publicUrl, last_winner_name: winnerName })
        .eq('id', babaId);

      toast.success('Foto salva! Aparecerá no histórico.');
      onSaved?.(publicUrl);
      onClose();
    } catch (err) {
      console.error('[WinnerPhotoModal]', err);
      toast.error('Erro ao salvar foto. Verifique o bucket match-photos no Supabase.');
    } finally {
      setUploading(false);
    }
  };

  const reset = () => { setFile(null); setPreview(null); };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/95 backdrop-blur-xl p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-[#0a0a0a] border border-yellow-500/20 rounded-[2.5rem] p-8 shadow-2xl space-y-6"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center">
              <Trophy size={20} className="text-yellow-500" />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase italic">Foto do Vencedor</h3>
              <p className="text-[10px] text-yellow-500/60 font-black uppercase">{winnerName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-xl text-white/40 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Preview ou área de upload */}
        {preview ? (
          <div className="relative">
            <img
              src={preview}
              alt="Preview"
              className="w-full rounded-2xl object-cover max-h-56 border border-white/10"
            />
            <button
              onClick={reset}
              className="absolute top-2 right-2 p-1.5 bg-black/70 rounded-lg text-white/60 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <label
            className="flex flex-col items-center justify-center gap-3 w-full h-40 bg-white/5 border-2 border-dashed border-yellow-500/20 rounded-2xl cursor-pointer hover:border-yellow-500/40 hover:bg-yellow-500/5 transition-all"
            onClick={() => inputRef.current?.click()}
          >
            <Camera size={32} className="text-yellow-500/40" />
            <span className="text-[10px] font-black uppercase text-white/30 tracking-widest">
              Toque para tirar foto
            </span>
            <span className="text-[9px] text-white/20">ou selecionar da galeria</span>
          </label>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Botões */}
        <div className="space-y-3">
          {preview ? (
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full py-4 bg-yellow-500 text-black rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
            >
              {uploading
                ? <><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> Salvando...</>
                : <><Upload size={16} /> Salvar Foto</>
              }
            </button>
          ) : (
            <button
              onClick={() => inputRef.current?.click()}
              className="w-full py-4 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2"
            >
              <Camera size={16} /> Selecionar Foto
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full py-3 text-white/20 font-black uppercase text-[10px] tracking-widest hover:text-white/40 transition-colors"
          >
            Pular por agora
          </button>
        </div>
      </div>
    </div>
  );
};

export default WinnerPhotoModal;
