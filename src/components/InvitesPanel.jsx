// src/components/InvitesPanel.jsx
// Sprint 13 — Gerenciar convites do baba: criar, listar, copiar, revogar.

import React, { useState, useEffect, useCallback } from 'react';
import { Link2, QrCode, RefreshCw, Copy, Check, Trash2, Plus, Clock, MessageCircle } from 'lucide-react';
import { supabase } from '../services/supabase';
import QRCodeModal from './QRCodeModal';
import toast from 'react-hot-toast';

const BASE_URL = window.location.origin;

const formatExpiry = (expiresAt) => {
  if (!expiresAt) return 'Sem validade';
  const diff = new Date(expiresAt) - Date.now();
  if (diff < 0) return 'Expirado';
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d restantes`;
  if (h > 0) return `${h}h restantes`;
  return 'Expira em breve';
};

export default function InvitesPanel({ babaId, babaName, isPresident }) {
  const [invites,   setInvites]   = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [creating,  setCreating]  = useState(false);
  const [quickCreating, setQuickCreating] = useState(false);
  const [copied,    setCopied]    = useState(null);
  const [showForm,  setShowForm]  = useState(false);
  const [qrCode,    setQrCode]    = useState(null);

  // Form state
  const [maxUses,      setMaxUses]      = useState('');
  const [expiresHours, setExpiresHours] = useState('168');
  const [note,         setNote]         = useState('');

  const load = useCallback(async () => {
    if (!babaId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_baba_invites', { p_baba_id: babaId });
      if (error) throw error;
      setInvites(data || []);
    } catch (err) {
      console.error('[InvitesPanel] load:', err);
    } finally {
      setLoading(false);
    }
  }, [babaId]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (overrides = {}) => {
    const isQuick = overrides.quick;
    isQuick ? setQuickCreating(true) : setCreating(true);
    try {
      const { data, error } = await supabase.rpc('create_invite', {
        p_baba_id:     babaId,
        p_type:        'link',
        p_max_uses:    overrides.maxUses !== undefined ? overrides.maxUses : (maxUses ? Number(maxUses) : null),
        p_expires_hours: overrides.expiresHours !== undefined ? overrides.expiresHours : (Number(expiresHours) || 168),
        p_note:        overrides.note !== undefined ? overrides.note : (note || null),
      });
      if (error) throw error;
      toast.success('Convite criado!');
      setShowForm(false);
      setMaxUses('');
      setNote('');
      await load();
    } catch (err) {
      console.error('[InvitesPanel] create:', err);
      toast.error('Erro ao criar convite');
    } finally {
      isQuick ? setQuickCreating(false) : setCreating(false);
    }
  };

  const handleQuickCreate = () => handleCreate({ quick: true, maxUses: null, expiresHours: 168, note: null });

  const handleCopy = (code) => {
    const url = `${BASE_URL}/join/${code}`;
    navigator.clipboard.writeText(url);
    setCopied(code);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(null), 2500);
  };

  const handleWhatsApp = (code, babaNome) => {
    const url = `${BASE_URL}/join/${code}`;
    const text = `🏟️ Te convido para o nosso baba${babaNome ? ` *${babaNome}*` : ''}!\n\nUse o link para entrar:\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const handleRevoke = async (inviteId) => {
    try {
      const { error } = await supabase.rpc('revoke_invite', { p_invite_id: inviteId });
      if (error) throw error;
      toast.success('Convite revogado');
      await load();
    } catch (err) {
      toast.error('Erro ao revogar');
    }
  };

  const activeInvites = invites.filter(i => i.is_active);
  const heroInvite     = activeInvites[0] || null;
  const otherInvites   = activeInvites.slice(1);

  return (
    <div className="space-y-4">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-text-low">Convidar Atletas</p>
          <p className="text-xs font-black text-white">{activeInvites.length} convite{activeInvites.length !== 1 ? 's' : ''} ativo{activeInvites.length !== 1 ? 's' : ''}</p>
        </div>
        {isPresident && heroInvite && (
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-electric/10 border border-cyan-electric/20 text-cyan-electric text-[10px] font-black uppercase tracking-widest hover:bg-cyan-electric/20 transition-all"
          >
            <Plus size={12} />
            Convite específico
          </button>
        )}
      </div>

      {/* Convite principal — código + QR em destaque */}
      {loading && invites.length === 0 ? (
        <div className="h-32 rounded-2xl bg-surface-1 border border-border-subtle animate-pulse" />
      ) : heroInvite ? (
        <div className="p-4 rounded-2xl bg-cyan-electric/5 border border-cyan-electric/20 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-cyan-electric/70 mb-1">Convite principal</p>
              <p className="text-2xl font-black tracking-[0.3em] text-white">{heroInvite.code}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[9px] text-text-low font-black">
                  {heroInvite.uses}{heroInvite.max_uses ? `/${heroInvite.max_uses}` : ''} usos
                </span>
                <span className="flex items-center gap-1 text-[9px] text-text-low font-black">
                  <Clock size={9} /> {formatExpiry(heroInvite.expires_at)}
                </span>
              </div>
            </div>
            <button
              onClick={() => setQrCode(heroInvite.code)}
              className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
              title="Mostrar QR Code"
            >
              <QrCode size={24} className="text-black" />
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleWhatsApp(heroInvite.code, babaName)}
              className="flex-1 py-2.5 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-[10px] font-black uppercase flex items-center justify-center gap-1.5 hover:bg-green-500/20 transition-all"
            >
              <MessageCircle size={13} /> WhatsApp
            </button>
            <button
              onClick={() => handleCopy(heroInvite.code)}
              className={`flex-1 py-2.5 rounded-xl border text-[10px] font-black uppercase flex items-center justify-center gap-1.5 transition-all ${
                copied === heroInvite.code
                  ? 'bg-green-500/10 border-green-500/20 text-green-400'
                  : 'bg-surface-2 border-border-mid text-text-low hover:text-white'
              }`}
            >
              {copied === heroInvite.code ? <Check size={13} /> : <Copy size={13} />}
              {copied === heroInvite.code ? 'Copiado' : 'Copiar link'}
            </button>
          </div>
        </div>
      ) : isPresident ? (
        <button
          onClick={handleQuickCreate}
          disabled={quickCreating}
          className="w-full py-6 rounded-2xl border border-dashed border-cyan-electric/30 bg-cyan-electric/5 text-cyan-electric text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-cyan-electric/10 transition-all disabled:opacity-50"
        >
          {quickCreating
            ? <RefreshCw size={14} className="animate-spin" />
            : <Link2 size={14} />}
          {quickCreating ? 'Gerando...' : 'Gerar convite do grupo'}
        </button>
      ) : (
        <div className="py-8 text-center">
          <Link2 size={24} className="text-text-muted mx-auto mb-2" />
          <p className="text-[10px] font-black uppercase text-text-low tracking-widest">
            Nenhum convite ativo
          </p>
        </div>
      )}

      {/* Formulário de criação — convites específicos (limite de usos / validade / observação) */}
      {showForm && (
        <div className="p-4 rounded-2xl bg-surface-1 border border-border-mid space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-text-low">Novo convite</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-black uppercase text-text-low mb-1 block">Usos máximos</label>
              <input
                type="number"
                min="1"
                placeholder="Ilimitado"
                value={maxUses}
                onChange={e => setMaxUses(e.target.value)}
                className="w-full bg-surface-2 border border-border-mid rounded-xl px-3 py-2 text-xs font-black text-white placeholder:text-text-muted focus:outline-none focus:border-cyan-electric/50"
              />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase text-text-low mb-1 block">Validade (horas)</label>
              <select
                value={expiresHours}
                onChange={e => setExpiresHours(e.target.value)}
                className="w-full bg-surface-2 border border-border-mid rounded-xl px-3 py-2 text-xs font-black text-white focus:outline-none focus:border-cyan-electric/50"
              >
                <option value="24">24h</option>
                <option value="48">48h</option>
                <option value="168">7 dias</option>
                <option value="720">30 dias</option>
                <option value="">Sem validade</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[9px] font-black uppercase text-text-low mb-1 block">Observação (opcional)</label>
            <input
              type="text"
              placeholder="Ex: Para o pessoal do trampo"
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full bg-surface-2 border border-border-mid rounded-xl px-3 py-2 text-xs font-black text-white placeholder:text-text-muted focus:outline-none focus:border-cyan-electric/50"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 py-2.5 rounded-xl border border-border-mid text-[10px] font-black uppercase text-text-low hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex-1 py-2.5 rounded-xl bg-cyan-electric text-black text-[10px] font-black uppercase tracking-widest hover:bg-cyan-400 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {creating
                ? <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                : <Plus size={12} />}
              {creating ? 'Criando...' : 'Criar'}
            </button>
          </div>
        </div>
      )}

      {/* Outros convites — específicos e histórico de revogados */}
      {(() => {
        const remaining = invites.filter(i => i.invite_id !== heroInvite?.invite_id);
        if (loading && invites.length === 0) return null;
        if (remaining.length === 0) return null;
        return (
          <div className="space-y-2">
            <p className="text-[9px] font-black uppercase tracking-widest text-text-low px-1">Outros convites</p>
            {remaining.map(inv => (
            <div
              key={inv.invite_id}
              className={`p-3 rounded-2xl border transition-all ${
                inv.is_active
                  ? 'bg-surface-1 border-border-mid'
                  : 'bg-surface-1/50 border-border-subtle opacity-50'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Código */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-black text-cyan-electric font-mono tracking-widest">
                      {inv.code}
                    </span>
                    {!inv.is_active && (
                      <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 text-[8px] font-black uppercase">
                        Revogado
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] text-text-low font-black">
                      {inv.uses}{inv.max_uses ? `/${inv.max_uses}` : ''} usos
                    </span>
                    <span className="flex items-center gap-1 text-[9px] text-text-low font-black">
                      <Clock size={9} />
                      {formatExpiry(inv.expires_at)}
                    </span>
                    {inv.note && (
                      <span className="text-[9px] text-text-muted truncate max-w-[80px]">{inv.note}</span>
                    )}
                  </div>
                </div>

                {/* Ações */}
                {inv.is_active && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setQrCode(inv.code)}
                      title="QR Code"
                      className="p-2 rounded-xl bg-surface-2 border border-border-mid text-text-low hover:text-white transition-all"
                    >
                      <QrCode size={13} />
                    </button>
                    <button
                      onClick={() => handleWhatsApp(inv.code, babaName)}
                      title="Compartilhar via WhatsApp"
                      className="p-2 rounded-xl bg-surface-2 border border-border-mid text-green-400 hover:bg-green-500/10 hover:border-green-500/30 transition-all"
                    >
                      <MessageCircle size={13} />
                    </button>
                    <button
                      onClick={() => handleCopy(inv.code)}
                      className={`p-2 rounded-xl border transition-all ${
                        copied === inv.code
                          ? 'bg-green-500/10 border-green-500/20 text-green-400'
                          : 'bg-surface-2 border-border-mid text-text-low hover:text-white'
                      }`}
                    >
                      {copied === inv.code ? <Check size={13} /> : <Copy size={13} />}
                    </button>
                    {isPresident && (
                      <button
                        onClick={() => handleRevoke(inv.invite_id)}
                        className="p-2 rounded-xl bg-surface-2 border border-border-mid text-text-low hover:text-red-400 hover:border-red-500/30 transition-all"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            ))}
          </div>
        );
      })()}

      {/* Refresh */}
      <button
        onClick={load}
        disabled={loading}
        className="flex items-center gap-1.5 text-[9px] font-black uppercase text-text-muted hover:text-text-low transition-colors disabled:opacity-30"
      >
        <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
        Atualizar
      </button>

      <QRCodeModal
        isOpen={!!qrCode}
        onClose={() => setQrCode(null)}
        inviteCode={qrCode}
        babaName={babaName}
      />
    </div>
  );
}