// src/components/ChangePasswordModal.jsx
// Modal para o usuário logado trocar a senha a partir do Perfil.
// Reautentica com a senha atual (signInWithPassword) antes de aplicar a
// nova senha, por segurança — evita troca indevida numa sessão exposta.

import React, { useState } from 'react';
import { Lock, X, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';

const ChangePasswordModal = ({ open, onClose }) => {
  const { user, updatePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const reset = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      toast.error('A nova senha precisa ter no mínimo 8 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    if (newPassword === currentPassword) {
      toast.error('A nova senha deve ser diferente da atual');
      return;
    }

    setSaving(true);
    try {
      // Reautentica com a senha atual antes de trocar
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email:    user.email,
        password: currentPassword,
      });
      if (signInError) {
        toast.error('Senha atual incorreta');
        setSaving(false);
        return;
      }

      const { error } = await updatePassword(newPassword);
      if (!error) {
        reset();
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-sm bg-[#0a0a0a] border border-border-mid rounded-[2rem] p-7 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 bg-cyan-electric/10 border border-cyan-electric/20">
          <Lock size={24} className="text-cyan-electric" />
        </div>

        <p className="text-base font-black text-white text-center uppercase tracking-tight leading-snug mb-5">
          Trocar senha
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            placeholder="Senha atual"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            disabled={saving}
            autoFocus
            className="w-full bg-surface-2 border border-border-mid rounded-2xl px-4 py-3.5 text-sm font-bold text-white placeholder:text-text-muted focus:outline-none focus:border-cyan-electric/50 disabled:opacity-50"
          />
          <input
            type="password"
            placeholder="Nova senha (mínimo 8 caracteres)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
            disabled={saving}
            className="w-full bg-surface-2 border border-border-mid rounded-2xl px-4 py-3.5 text-sm font-bold text-white placeholder:text-text-muted focus:outline-none focus:border-cyan-electric/50 disabled:opacity-50"
          />
          <input
            type="password"
            placeholder="Confirmar nova senha"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            disabled={saving}
            className="w-full bg-surface-2 border border-border-mid rounded-2xl px-4 py-3.5 text-sm font-bold text-white placeholder:text-text-muted focus:outline-none focus:border-cyan-electric/50 disabled:opacity-50"
          />

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="py-4 rounded-2xl bg-surface-2 border border-border-mid text-text-low font-black uppercase text-[10px] tracking-widest hover:bg-surface-3 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <X size={14} /> Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="py-4 rounded-2xl bg-cyan-electric text-black font-black uppercase text-[10px] tracking-widest shadow-lg shadow-cyan-electric/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving
                ? <><RefreshCw size={12} className="animate-spin" /> Salvando...</>
                : <>Salvar</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
