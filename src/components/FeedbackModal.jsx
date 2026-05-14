// src/components/FeedbackModal.jsx
// Feedback in-app: reportar bug ou sugestão, com screenshot opcional.
// Screenshot via html2canvas (já carregado via CDN no index.html).

import React, { useState } from 'react';
import { X, MessageSquare, Bug, Lightbulb, Send, Image } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuth }  from '../contexts/AuthContext';
import toast        from 'react-hot-toast';

const TYPES = [
  { id: 'bug',       icon: Bug,          label: 'Bug',      color: 'text-red-400 border-red-400/30 bg-red-400/5'    },
  { id: 'suggestion', icon: Lightbulb,   label: 'Sugestão', color: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/5' },
  { id: 'other',     icon: MessageSquare, label: 'Outro',   color: 'text-blue-400 border-blue-400/30 bg-blue-400/5' },
];

export default function FeedbackModal({ isOpen, onClose }) {
  const { user }       = useAuth();
  const [type,    setType]    = useState('bug');
  const [text,    setText]    = useState('');
  const [email,   setEmail]   = useState(user?.email ?? '');
  const [loading, setLoading] = useState(false);
  const [screenshot, setScreenshot] = useState(null);

  if (!isOpen) return null;

  const captureScreen = async () => {
    try {
      if (typeof window.html2canvas !== 'function') {
        toast.error('html2canvas não disponível');
        return;
      }
      const canvas = await window.html2canvas(document.body, { scale: 0.5, useCORS: true });
      setScreenshot(canvas.toDataURL('image/jpeg', 0.6));
      toast.success('Screenshot capturado!');
    } catch (e) {
      toast.error('Falha ao capturar tela');
    }
  };

  const handleSubmit = async () => {
    if (!text.trim()) { toast.error('Descreva o problema ou sugestão'); return; }
    setLoading(true);
    try {
      const payload = {
        type,
        text:       text.trim(),
        email:      email || null,
        user_id:    user?.id ?? null,
        url:        window.location.href,
        user_agent: navigator.userAgent,
        screenshot: screenshot ?? null,
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('feedback').insert(payload);
      if (error) {
        // Se a tabela não existir ainda, logar no console (não bloquear o UX)
        console.warn('[FeedbackModal] tabela feedback não encontrada:', error.message);
      }

      toast.success('Obrigado pelo feedback! 🙏');
      setText('');
      setScreenshot(null);
      onClose?.();
    } catch (err) {
      toast.error('Erro ao enviar feedback');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-title"
    >
      <div className="w-full max-w-sm bg-surface-1 border border-border-mid rounded-3xl overflow-hidden shadow-2xl animate-page-in">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border-subtle">
          <h2 id="feedback-title" className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
            <MessageSquare size={14} className="text-cyan-electric" aria-hidden="true" />
            Feedback
          </h2>
          <button onClick={onClose} aria-label="Fechar" className="p-2 rounded-xl text-text-low hover:text-white">
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Tipo */}
        <div className="p-5 space-y-4">
          <div className="flex gap-2">
            {TYPES.map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  aria-pressed={type === t.id}
                  className={`flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${
                    type === t.id ? t.color : 'bg-surface-2 border-border-mid text-text-low'
                  }`}
                >
                  <Icon size={14} aria-hidden="true" />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Texto */}
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={type === 'bug' ? 'Descreva o bug: o que aconteceu, como reproduzir…' : 'Sua sugestão ou comentário…'}
            maxLength={1000}
            rows={4}
            className="w-full bg-surface-2 border border-border-mid rounded-2xl px-4 py-3 text-[12px] text-white placeholder-text-muted resize-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-electric"
            aria-label="Descrição do feedback"
          />

          {/* Email (se não logado) */}
          {!user && (
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Seu email (opcional)"
              className="w-full bg-surface-2 border border-border-mid rounded-xl px-4 py-2.5 text-[12px] text-white placeholder-text-muted"
              aria-label="Email de contato"
            />
          )}

          {/* Screenshot */}
          <div className="flex items-center gap-2">
            <button
              onClick={captureScreen}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-2 border border-border-mid text-text-low hover:text-white text-[10px] font-black uppercase transition-all"
              aria-label="Capturar screenshot da tela"
            >
              <Image size={12} aria-hidden="true" />
              Screenshot
            </button>
            {screenshot && (
              <div className="flex items-center gap-1.5">
                <img src={screenshot} alt="Preview" className="w-10 h-7 rounded object-cover border border-border-mid" />
                <button
                  onClick={() => setScreenshot(null)}
                  aria-label="Remover screenshot"
                  className="text-text-low hover:text-red-400 transition-colors"
                >
                  <X size={12} aria-hidden="true" />
                </button>
              </div>
            )}
          </div>

          {/* Enviar */}
          <button
            onClick={handleSubmit}
            disabled={loading || !text.trim()}
            aria-busy={loading}
            className="w-full py-3 rounded-2xl bg-cyan-electric/10 border border-cyan-electric/20 text-cyan-electric text-[10px] font-black uppercase tracking-widest hover:bg-cyan-electric/20 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
          >
            <Send size={13} aria-hidden="true" />
            {loading ? 'Enviando…' : 'Enviar feedback'}
          </button>
        </div>
      </div>
    </div>
  );
}
