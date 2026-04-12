import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBaba } from '../contexts/BabaContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { 
  ArrowLeft, DollarSign, Copy, Plus, CheckCircle, Clock, X, 
  Loader2, Trash2, Camera, Eye, Ban, CreditCard, ChevronRight, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

const FinancialPage = () => {
  const navigate = useNavigate();
  const { currentBaba } = useBaba();
  const { user } = useAuth();
  
  const [financials, setFinancials] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedFinancial, setSelectedFinancial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [isPresident, setIsPresident] = useState(false);

  const [newFinancial, setNewFinancial] = useState({
    title: '',
    description: '',
    amount: '',
    due_date: '',
    pix_key: ''
  });

  useEffect(() => {
    if (!currentBaba || !user) {
      if (!currentBaba) navigate('/home');
      return;
    }
    setIsPresident(currentBaba.president_id === user.id);
    loadFinancials();
  }, [currentBaba, user]);

  // CORREÇÃO 1: Query otimizada para buscar os pagamentos e o nome dos jogadores corretamente
  const loadFinancials = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('financials')
        .select(`
          *,
          payments (
            id,
            status,
            amount,
            proof_url,
            player_id,
            player:players (
              name,
              user_id
            )
          )
        `)
        .eq('baba_id', currentBaba.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFinancials(data || []);
    } catch (error) {
      console.error("Erro loadFinancials:", error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const createFinancial = async (e) => {
    e.preventDefault();
    try {
      setProcessing(true);
      const { error } = await supabase.from('financials').insert([{
        ...newFinancial,
        baba_id: currentBaba.id,
        created_by: user.id,
        status: 'active'
      }]);
      if (error) throw error;
      toast.success('Cobrança lançada!');
      setShowCreateModal(false);
      setNewFinancial({ title: '', description: '', amount: '', due_date: '', pix_key: '' });
      loadFinancials();
    } catch (error) {
      toast.error('Erro ao criar');
    } finally {
      setProcessing(false);
    }
  };

  // CORREÇÃO 2: Forçando o refresh após mudar status
  const toggleFinancialStatus = async (id, currentStatus) => {
    try {
      const nextStatus = currentStatus === 'active' ? 'closed' : 'active';
      const { error } = await supabase
        .from('financials')
        .update({ status: nextStatus })
        .eq('id', id);

      if (error) throw error;
      
      // Atualiza local e recarrega para garantir sincronia com DB
      setFinancials(prev => prev.map(f => f.id === id ? { ...f, status: nextStatus } : f));
      toast.success(nextStatus === 'closed' ? 'Cobrança Encerrada!' : 'Reativada!');
    } catch (error) {
      toast.error('Erro ao mudar status');
    }
  };

  const deleteFinancial = async (id) => {
    if (!window.confirm("Isso apagará a cobrança e todos os pagamentos. Confirmar?")) return;
    try {
      setProcessing(true);
      // Deleta pagamentos primeiro
      await supabase.from('payments').delete().eq('financial_id', id);
      const { error } = await supabase.from('financials').delete().eq('id', id);
      if (error) throw error;
      setFinancials(prev => prev.filter(f => f.id !== id));
      toast.success('Excluído');
    } catch (error) {
      toast.error('Erro ao excluir');
    } finally {
      setProcessing(false);
    }
  };

  const handleUploadProof = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedFinancial) return;

    try {
      setProcessing(true);
      const { data: player } = await supabase
        .from('players')
        .select('id')
        .eq('baba_id', currentBaba.id)
        .eq('user_id', user.id)
        .single();

      if (!player) throw new Error("Jogador não encontrado");

      const fileExt = file.name.split('.').pop();
      const filePath = `proofs/${currentBaba.id}/${selectedFinancial.id}_${player.id}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(filePath);

      // CORREÇÃO 3: Upsert baseado na sua estrutura de colunas
      const { error: payError } = await supabase.from('payments').upsert([{
        financial_id: selectedFinancial.id,
        player_id: player.id,
        amount: selectedFinancial.amount,
        status: 'pending',
        proof_url: publicUrl,
        paid_at: new Date().toISOString(),
        proof_uploaded_at: new Date().toISOString()
      }], { onConflict: 'financial_id,player_id' });

      if (payError) throw payError;

      toast.success('Comprovante enviado!');
      setShowPayModal(false);
      loadFinancials();
    } catch (error) {
      console.error(error);
      toast.error('Erro no envio');
    } finally {
      setProcessing(false);
    }
  };

  const confirmPayment = async (paymentId) => {
    try {
      const { error } = await supabase.from('payments').update({ 
        status: 'confirmed', 
        confirmed_at: new Date().toISOString(),
        confirmed_by: user.id // Adicionado conforme sua coluna no banco
      }).eq('id', paymentId);
      
      if (error) throw error;
      toast.success('Confirmado!');
      loadFinancials();
    } catch (error) {
      toast.error('Erro na confirmação');
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505]">
      <Loader2 className="animate-spin text-green-500" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen p-6 bg-[#050505] text-white">
      <div className="max-w-4xl mx-auto">
        
        <div className="flex items-center justify-between mb-12">
          <button onClick={() => navigate('/home')} className="flex items-center gap-2 text-[10px] font-black uppercase opacity-40 hover:opacity-100 transition-all">
            <ArrowLeft size={14} /> Voltar
          </button>
          <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
            <DollarSign size={16} className="text-green-500" />
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="text-5xl font-black italic uppercase tracking-tighter leading-none">Financeiro<span className="text-green-500">.</span></h1>
            <p className="text-[10px] opacity-40 mt-2 font-black uppercase tracking-widest">Gestão de Arrecadação</p>
          </div>
          {isPresident && (
            <button onClick={() => setShowCreateModal(true)} className="px-8 py-4 bg-green-500 text-black font-black uppercase text-[10px] tracking-widest rounded-full hover:scale-105 transition-all flex items-center gap-2">
              <Plus size={16} strokeWidth={3} /> Nova Cobrança
            </button>
          )}
        </div>

        <div className="space-y-6">
          {financials.map(f => {
            // CORREÇÃO: Busca o pagamento do usuário logado na lista de pagamentos daquela cobrança
            const myPayment = f.payments?.find(p => p.player?.user_id === user.id);
            const isClosed = f.status === 'closed';
            const confirmedPayments = f.payments?.filter(p => p.status === 'confirmed') || [];
            const pendingPayments = f.payments?.filter(p => p.status === 'pending') || [];

            return (
              <div key={f.id} className={`p-8 rounded-[2.5rem] border transition-all ${isClosed ? 'bg-red-500/5 border-red-500/10 opacity-80' : 'bg-white/[0.03] border-white/10'}`}>
                
                <div className="flex flex-col md:flex-row justify-between gap-6 mb-10">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-2xl font-black italic uppercase tracking-tighter">{f.title}</h3>
                      {isClosed && <span className="bg-red-500 text-white text-[8px] px-2 py-1 rounded-md font-black uppercase">Encerrada</span>}
                    </div>
                    <p className="text-xs opacity-50 uppercase font-bold">{f.description}</p>
                    <div className="flex items-center gap-4 pt-2">
                       <span className="text-[9px] font-black text-white/30 uppercase">Vence: {new Date(f.due_date).toLocaleDateString()}</span>
                       <span className="text-[9px] font-black text-green-500/50 uppercase italic">PIX: {f.pix_key}</span>
                    </div>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-4xl font-black text-green-500 tracking-tighter leading-none">R$ {parseFloat(f.amount).toFixed(2)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center pt-8 border-t border-white/5">
                  <div>
                    {isClosed ? (
                       <div className="p-4 rounded-2xl border border-red-500/20 bg-red-500/5 text-red-500 flex items-center justify-center gap-2 text-[10px] font-black uppercase">
                         <Ban size={16} /> Cobrança Encerrada
                       </div>
                    ) : !myPayment ? (
                      <button 
                        onClick={() => { setSelectedFinancial(f); setShowPayModal(true); }}
                        className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-green-500 hover:text-black transition-all group"
                      >
                        <span className="uppercase font-black text-[10px] tracking-widest flex items-center gap-3">
                          <CreditCard size={18} /> Pagar Agora
                        </span>
                        <ChevronRight size={16} />
                      </button>
                    ) : (
                      <div className={`p-4 rounded-2xl border flex items-center gap-3 ${myPayment.status === 'confirmed' ? 'border-green-500/20 bg-green-500/5 text-green-500' : 'border-yellow-500/20 bg-yellow-500/5 text-yellow-500'}`}>
                        {myPayment.status === 'confirmed' ? <CheckCircle size={18} /> : <Clock size={18} />}
                        <span className="text-[10px] font-black uppercase">
                          {myPayment.status === 'confirmed' ? 'Pagamento Confirmado' : 'Aguardando Aprovação'}
                        </span>
                      </div>
                    )}
                  </div>

                  {isPresident && (
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => toggleFinancialStatus(f.id, f.status)} className="p-4 rounded-2xl bg-white/5 hover:text-yellow-500 transition-colors">
                        <Ban size={18} />
                      </button>
                      <button onClick={() => deleteFinancial(f.id)} className="p-4 rounded-2xl bg-white/5 hover:text-red-500 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </div>

                {/* LISTA DE QUEM JÁ PAGOU (CORRIGIDO) */}
                {confirmedPayments.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-white/5">
                    <p className="text-[8px] font-black uppercase opacity-20 ml-2 mb-3">Confirmados ({confirmedPayments.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {confirmedPayments.map(p => (
                        <div key={p.id} className="px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full flex items-center gap-2">
                          <CheckCircle size={10} className="text-green-500" />
                          <span className="text-[9px] font-bold text-green-500">{p.player?.name || 'Jogador'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* PENDENTES PARA O PRESIDENTE (FOTO DO COMPROVANTE CORRIGIDA) */}
                {isPresident && pendingPayments.length > 0 && (
                   <div className="mt-6 space-y-2">
                      <p className="text-[8px] font-black uppercase text-yellow-500 ml-2 italic">Aprovações Pendentes</p>
                      {pendingPayments.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                          <span className="text-[10px] font-bold uppercase">{p.player?.name || 'Jogador'}</span>
                          <div className="flex items-center gap-3">
                            {p.proof_url && (
                              <a href={p.proof_url} target="_blank" rel="noreferrer" className="p-2 bg-white/10 rounded-lg hover:text-green-500 transition-colors">
                                <Eye size={18}/>
                              </a>
                            )}
                            <button onClick={() => confirmPayment(p.id)} className="px-4 py-2 bg-green-500 text-black rounded-xl text-[9px] font-black uppercase">Aprovar</button>
                          </div>
                        </div>
                      ))}
                   </div>
                )}
              </div>
            );
          })}
        </div>

        {/* MODAL PAGAMENTO */}
        {showPayModal && selectedFinancial && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 z-[100]">
            <div className="bg-[#0A0A0A] p-10 max-w-md w-full border border-white/10 rounded-[3rem] relative">
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-2xl font-black italic uppercase">Pagar Taxa</h2>
                <button onClick={() => setShowPayModal(false)} className="p-2 bg-white/5 rounded-full"><X size={20}/></button>
              </div>
              <div className="space-y-8">
                <div className="p-6 bg-green-500/5 rounded-3xl border border-green-500/10 text-center">
                  <p className="text-[9px] font-black text-green-500 uppercase mb-2">Chave PIX</p>
                  <p className="text-sm font-mono font-bold mb-6 break-all">{selectedFinancial.pix_key}</p>
                  <button onClick={() => { navigator.clipboard.writeText(selectedFinancial.pix_key); toast.success('Copiado!'); }} className="flex items-center gap-2 mx-auto px-6 py-3 bg-green-500 text-black rounded-2xl text-[10px] font-black uppercase">
                    <Copy size={14} /> Copiar
                  </button>
                </div>
                <label className="flex flex-col items-center justify-center w-full h-40 bg-white/5 rounded-3xl border-2 border-dashed border-white/10 cursor-pointer hover:border-green-500/50">
                  {processing ? <Loader2 className="animate-spin text-green-500" /> : (
                    <>
                      <Camera size={28} className="opacity-20 mb-3" />
                      <span className="text-[10px] font-black uppercase opacity-40">Anexar Comprovante</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleUploadProof} disabled={processing} />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* MODAL CRIAÇÃO */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 z-[100]">
            <div className="bg-[#0A0A0A] p-10 max-w-md w-full border border-white/10 rounded-[3rem]">
              <h2 className="text-3xl font-black italic uppercase mb-10 text-green-500">Nova Taxa</h2>
              <form onSubmit={createFinancial} className="space-y-4">
                <input placeholder="TÍTULO" className="w-full bg-white/5 p-5 rounded-2xl border border-white/10 outline-none font-bold uppercase text-xs" value={newFinancial.title} onChange={e => setNewFinancial({...newFinancial, title: e.target.value.toUpperCase()})} required />
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" placeholder="VALOR" className="w-full bg-white/5 p-5 rounded-2xl border border-white/10 outline-none font-bold text-xs" value={newFinancial.amount} onChange={e => setNewFinancial({...newFinancial, amount: e.target.value})} required />
                  <input type="date" className="w-full bg-white/5 p-5 rounded-2xl border border-white/10 outline-none font-bold text-xs text-white" value={newFinancial.due_date} onChange={e => setNewFinancial({...newFinancial, due_date: e.target.value})} required />
                </div>
                <input placeholder="CHAVE PIX" className="w-full bg-green-500/5 p-5 rounded-2xl border border-green-500/20 outline-none font-mono text-xs text-green-500" value={newFinancial.pix_key} onChange={e => setNewFinancial({...newFinancial, pix_key: e.target.value})} required />
                <div className="flex gap-4 pt-10">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-5 text-[10px] font-black uppercase opacity-30">Cancelar</button>
                  <button type="submit" disabled={processing} className="flex-1 py-5 bg-green-500 text-black text-[10px] font-black uppercase rounded-2xl">Lançar</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialPage;
