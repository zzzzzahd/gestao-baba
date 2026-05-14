// src/components/MatchGallery.jsx
// Galeria de fotos por partida — upload para Supabase Storage (bucket: match-photos).
// Plano Pro necessário para upload. Visualização disponível para todos os membros.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, X, Download, Expand, Upload, Image } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const BUCKET = 'match-photos';
const MAX_SIZE_MB = 5;

/**
 * @param {Object} props
 * @param {string} props.matchId  - UUID da partida
 * @param {string} props.babaId   - UUID do baba
 * @param {boolean} [props.canUpload] - se o usuário pode fazer upload (plano Pro ou admin)
 */
export default function MatchGallery({ matchId, babaId, canUpload = false }) {
  const { user }               = useAuth();
  const [photos,   setPhotos]  = useState([]);
  const [loading,  setLoading] = useState(true);
  const [uploading,setUploading] = useState(false);
  const [expanded, setExpanded] = useState(null); // URL da foto expandida
  const inputRef               = useRef(null);

  const loadPhotos = useCallback(async () => {
    if (!matchId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_match_photos', { p_match_id: matchId });
      if (error) throw error;

      // Gerar URLs públicas do Storage
      const withUrls = (data ?? []).map(p => ({
        ...p,
        url:      supabase.storage.from(BUCKET).getPublicUrl(p.storage_path).data.publicUrl,
        thumbUrl: p.thumb_path
          ? supabase.storage.from(BUCKET).getPublicUrl(p.thumb_path).data.publicUrl
          : supabase.storage.from(BUCKET).getPublicUrl(p.storage_path).data.publicUrl,
      }));
      setPhotos(withUrls);
    } catch (err) {
      console.error('[MatchGallery] loadPhotos:', err);
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => { loadPhotos(); }, [loadPhotos]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Foto muito grande. Máximo: ${MAX_SIZE_MB}MB`);
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Apenas imagens são permitidas');
      return;
    }

    setUploading(true);
    try {
      const ext      = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
      const path     = `${babaId}/${matchId}/${user.id}-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });

      if (upErr) throw upErr;

      const { error: dbErr } = await supabase.from('match_photos').insert({
        match_id:    matchId,
        baba_id:     babaId,
        uploaded_by: user.id,
        storage_path: path,
      });

      if (dbErr) {
        await supabase.storage.from(BUCKET).remove([path]);
        throw dbErr;
      }

      toast.success('Foto enviada!');
      await loadPhotos();
    } catch (err) {
      console.error('[MatchGallery] upload:', err);
      toast.error('Erro ao enviar foto');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDelete = async (photo) => {
    try {
      await supabase.from('match_photos').delete().eq('id', photo.id);
      await supabase.storage.from(BUCKET).remove([photo.storage_path]);
      setPhotos(prev => prev.filter(p => p.id !== photo.id));
      toast.success('Foto removida');
    } catch (err) {
      toast.error('Erro ao remover foto');
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image size={14} className="text-cyan-electric" aria-hidden="true" />
          <span className="text-[10px] font-black uppercase tracking-widest text-text-low">
            Galeria · {photos.length} foto{photos.length !== 1 ? 's' : ''}
          </span>
        </div>
        {canUpload && (
          <>
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              aria-busy={uploading}
              aria-label="Enviar foto da partida"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-electric/10 border border-cyan-electric/20 text-cyan-electric text-[9px] font-black uppercase tracking-widest hover:bg-cyan-electric/20 transition-all disabled:opacity-50"
            >
              {uploading
                ? <div className="w-3 h-3 border-2 border-cyan-electric border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                : <Camera size={12} aria-hidden="true" />
              }
              {uploading ? 'Enviando…' : 'Foto'}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleUpload}
              className="hidden"
              aria-label="Selecionar foto"
            />
          </>
        )}
      </div>

      {/* Grid de fotos */}
      {loading ? (
        <div className="grid grid-cols-3 gap-1.5">
          {[1,2,3].map(i => (
            <div key={i} className="aspect-square bg-surface-2 rounded-xl animate-pulse" aria-hidden="true" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-8 text-text-muted text-[11px]">
          {canUpload ? 'Nenhuma foto ainda. Seja o primeiro a enviar!' : 'Nenhuma foto ainda.'}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {photos.map(photo => (
            <div key={photo.id} className="relative aspect-square group">
              <img
                src={photo.thumbUrl}
                alt={photo.caption ?? 'Foto da partida'}
                loading="lazy"
                className="w-full h-full object-cover rounded-xl border border-border-subtle"
              />
              {/* Overlay com ações */}
              <div className="absolute inset-0 bg-black/60 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={() => setExpanded(photo.url)}
                  aria-label="Expandir foto"
                  className="p-1.5 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors"
                >
                  <Expand size={12} aria-hidden="true" />
                </button>
                <a
                  href={photo.url}
                  download
                  aria-label="Baixar foto"
                  className="p-1.5 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors"
                >
                  <Download size={12} aria-hidden="true" />
                </a>
                {(photo.uploaded_by === user?.id || canUpload) && (
                  <button
                    onClick={() => handleDelete(photo)}
                    aria-label="Remover foto"
                    className="p-1.5 rounded-lg bg-red-500/30 text-red-300 hover:bg-red-500/50 transition-colors"
                  >
                    <X size={12} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {expanded && (
        <div
          className="fixed inset-0 z-[500] bg-black/95 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Foto ampliada"
          onClick={() => setExpanded(null)}
        >
          <button
            onClick={() => setExpanded(null)}
            aria-label="Fechar"
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <X size={20} aria-hidden="true" />
          </button>
          <img
            src={expanded}
            alt="Foto ampliada"
            className="max-w-full max-h-full object-contain rounded-xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
