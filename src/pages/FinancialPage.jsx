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
    if (!currentBaba) {
      navigate('/home');
      return;
    }
    setIsPresident(currentBaba.president_id === user.id);
    loadFinancials();
  }, [currentBaba, user.id]);

  const loadFinancials = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('financials')
        .select(`*, payments:payments(*, player:players(name))`)
        .eq('baba_id', currentBaba.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFinancials(data || []);
    } catch (error) {
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

  const handleUploadProof = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setProcessing(true);
      const { data: player } = await supabase
        .from('players')
        .select('id')
        .eq('baba_id', currentBaba.id)
        .eq('user_id', user.id)
        .single();

      if (!player) throw new Error('Jogador não encontrado');

      const fileExt = file.name.split('.').pop();
      const filePath = `${currentBaba.id}/proof_${selectedFinancial.id}_${player.id}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(filePath);

      const { error: payError } = await supabase.from('payments').upsert([{
        financial_id: selectedFinancial.id,
        player_id: player.id,
        amount: selectedFinancial.amount,
        status: 'pending',
        proof_url: publicUrl,
        paid_at: new Date().toISOString()
      }], { onConflict: 'financial_id,player_id' });

      if (payError) throw payError;

      toast.success('Comprovante enviado!');
      setShowPayModal(false);
      loadFinancials();
    } catch (error) {
      toast.error('Erro no envio: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const confirmPayment = async (payment) => {
    try {
      await supabase.from('payments').update({ 
        status: 'confirmed', 
        confirmed_at: new Date().toISOString() 
      }).eq('id', payment.id);
      
      toast.success('Pagamento Confirmado!');
      loadFinancials();
    } catch (error) {
      toast.error('Erro na confirmação');
    }
  };

  const toggleFinancialStatus = async (id, currentStatus) => {
    try {
      const nextStatus = currentStatus === 'active' ? 'closed' : 'active';
      const { error } = await supabase
        .from('financials')
        .update({ status: nextStatus })
        .eq('id', id);

      if (error) throw error;
      toast.success(nextStatus === 'closed' ? 'Cobrança Encerrada' : 'Cobrança Reativada');
      loadFinancials();
    } catch (error) {
      toast.error('Erro ao alterar status');
    }
  };

  const deleteFinancial = async (id) => {
    if (!window.confirm("Isso apagará permanentemente a cobrança e todos os comprovantes. Confirmar?")) return;
    try {
      const { error } = await supabase.from('financials').delete().eq('id', id);
      if (error) throw error;
      toast.success('Cobrança excluída');
      loadFinancials();
    } catch (error) {
      toast.error('Erro ao excluir. Verifique se há pagamentos vinculados.');
    }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black gap-4">
      <Loader2 className="animate-spin text-green-500" size={40} />
      <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Carregando Financeiro...</p>
    </div>
  );

  return (
    <div className="min-h-screen p-6 bg-[#050505] text-white font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <button onClick={() => navigate('/home')} className="flex items-center gap-2 text-[10px] font-black uppercase opacity-40 hover:opacity-100 transition-all tracking-tighter">
            <ArrowLeft size={14} /> Voltar ao Painel
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
            <button onClick={() => setShowCreateModal(true)} className="px-8 py-4 bg-green-500 text-black font-black uppercase text-[10px] tracking-widest rounded-full hover:scale-105 transition-all flex items-center gap-2 shadow-lg shadow-green-500/20">
              <Plus size={16} strokeWidth={3} /> Nova Cobrança
            </button>
          )}
        </div>

        <div className="space-y-6">
          {financials.map(f => {
            const myPayment = f.payments?.find(p => p.player?.user_id === user.id || p.player_id === user.id);
            const isClosed = f.status === 'closed';
            const isExpired = new Date(f.due_date) < new Date() && f.status === 'active';
            const confirmedPayments = f.payments?.filter(p => p.status === 'confirmed') || [];
            const pendingPayments = f.payments?.filter(p => p.status === 'pending') || [];

            return (
              <div key={f.id} className={`group relative p-8 rounded-[2.5rem] border transition-all ${isClosed ? 'bg-red-500/5 border-red-500/10' : 'bg-white/[0.03] border-white/10'}`}>
                
                <div className="flex flex-col md:flex-row justify-between gap-6 mb-10">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-2xl font-black italic uppercase tracking-tighter">{f.title}</h3>
                      {isClosed && <span className="bg-red-500 text-white text-[8px] px-2 py-1 rounded-md font-black uppercase">Encerrada</span>}
                      {isExpired && !isClosed && <span className="bg-yellow-500/10 text-yellow-500 text-[8px] px-2 py-1 rounded-md font-black uppercase flex items-center gap-1"><AlertTriangle size={10}/> Vencida</span>}
                    </div>
                    <p className="text-xs opacity-50 uppercase font-bold tracking-tight">{f.description}</p>
                    <div className="flex items-center gap-4 pt-2">
                       <span className="text-[9px] font-black text-white/30 uppercase">Vence em {new Date(f.due_date).toLocaleDateString()}</span>
                       <div className="h-1 w-1 rounded-full bg-green-500/30" />
                       <span className="text-[9px] font-black text-green-500/50 uppercase italic tracking-widest">PIX: {f.pix_key}</span>
                    </div>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-4xl font-black text-green-500 tracking-tighter leading-none">R$ {parseFloat(f.amount).toFixed(2)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center pt-8 border-t border-white/5">
                  <div>
                    {isClosed ? (
                      <div className="p-4 rounded-2xl border border-red-500/20 bg-red-500/5 text-red-500 flex items-center justify-center gap-2">
                        <Ban size={16} />
                        <span className="text-[10px] font-black uppercase">Cobrança Encerrada</span>
                      </div>
                    ) : isExpired && !myPayment ? (
                      <div className="p-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 text-yellow-500 flex items-center justify-center gap-2">
                        <Clock size={16} />
                        <span className="text-[10px] font-black uppercase">Prazo Expirado</span>
                      </div>
                    ) : !myPayment ? (
                      <button 
                        onClick={() => { setSelectedFinancial(f); setShowPayModal(true); }}
                        className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-green-500 hover:text-black transition-all group/btn"
                      >
                        <div className="flex items-center gap-3 uppercase font-black text-[10px]">
                          <CreditCard size={18} /> Pagar Agora
                        </div>
                        <ChevronRight size={16} className="opacity-30 group-hover/btn:translate-x-1" />
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
                      <button onClick={() => toggleFinancialStatus(f.id, f.status)} className={`p-4 rounded-2xl border border-white/5 transition-colors ${isClosed ? 'bg-green-500/10 text-green-500' : 'bg-white/5 hover:text-yellow-500'}`} title={isClosed ? "Reativar" : "Encerrar"}>
                        <Ban size={18} />
                      </button>
                      <button onClick={() => deleteFinancial(f.id)} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:text-red-500 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Seção de nomes que já pagaram (Público) */}
                {confirmedPayments.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-white/5">
                    <p className="text-[8px] font-black uppercase opacity-20 ml-2 tracking-widest mb-3">Já pagaram ({confirmedPayments.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {confirmedPayments.map(p => (
                        <div key={p.id} className="px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full flex items-center gap-2">
                          <CheckCircle size={10} className="text-green-500" />
                          <span className="text-[9px] font-bold uppercase text-green-500/80">{p.player?.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pendentes para o Presidente */}
                {isPresident && pendingPayments.length > 0 && (
                   <div className="mt-6 space-y-2">
                      <p className="text-[8px] font-black uppercase text-yellow-500 ml-2 tracking-widest">Aguardando sua Aprovação</p>
                      {pendingPayments.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                          <span className="text-[10px] font-bold uppercase">{p.player?.name}</span>
                          <div className="flex items-center gap-3">
                            <a href={p.proof_url} target="_blank" rel="noreferrer" className="text-white/20 hover:text-white"><Eye size={18}/></a>
                            <button onClick={() => confirmPayment(p)} className="px-4 py-2 bg-green-500 text-black rounded-xl text-[9px] font-black uppercase">Aprovar</button>
                          </div>
                        </div>
                      ))}
                   </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Modal Pagamento */}
        {showPayModal && selectedFinancial && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 z-[100]">
            <div className="bg-[#0A0A0A] p-10 max-w-md w-full border border-white/10 rounded-[3rem] shadow-2xl">
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-2xl font-black italic uppercase tracking-tighter">Pagamento</h2>
                <button onClick={() => setShowPayModal(false)} className="p-2 bg-white/5 rounded-full"><X size={20}/></button>
              </div>
              <div className="space-y-8">
                <div className="p-6 bg-green-500/5 rounded-3xl border border-green-500/10 text-center">
                  <p className="text-[9px] font-black text-green-500 uppercase mb-4 tracking-widest opacity-60">Chave PIX desta Cobrança</p>
                  <p className="text-lg font-mono font-bold text-white mb-6 select-all">{selectedFinancial.pix_key}</p>
                  <button onClick={() => { navigator.clipboard.writeText(selectedFinancial.pix_key); toast.success('Copiado!'); }} className="flex items-center gap-2 mx-auto px-6 py-3 bg-green-500 text-black rounded-2xl text-[10px] font-black uppercase tracking-widest">
                    <Copy size={14} /> Copiar Chave
                  </button>
                </div>
                <div className="space-y-3">
                  <p className="text-[9px] font-black opacity-30 uppercase ml-2 tracking-widest italic">Passo 2: Anexar Comprovante</p>
                  <label className="flex flex-col items-center justify-center w-full h-40 bg-white/5 rounded-3xl border-2 border-dashed border-white/10 hover:border-green-500/50 transition-all cursor-pointer group">
                    {processing ? <Loader2 className="animate-spin text-green-500" /> : (
                      <>
                        <Camera size={28} className="opacity-10 group-hover:opacity-100 transition-opacity mb-3" />
                        <span className="text-[10px] font-black uppercase opacity-30">Escolher Imagem</span>
                      </>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleUploadProof} disabled={processing} />
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Criar */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 z-[100]">
            <div className="bg-[#0A0A0A] p-10 max-w-md w-full border border-white/10 rounded-[3rem]">
              <h2 className="text-3xl font-black italic uppercase mb-10 tracking-tighter text-green-500">Novo Lançamento</h2>
              <form onSubmit={createFinancial} className="space-y-4">
                <input placeholder="TÍTULO" className="w-full bg-white/5 p-5 rounded-2xl border border-white/10 outline-none focus:border-green-500 font-bold uppercase text-xs" value={newFinancial.title} onChange={e => setNewFinancial({...newFinancial, title: e.target.value.toUpperCase()})} required />
                <input placeholder="DESCRIÇÃO" className="w-full bg-white/5 p-5 rounded-2xl border border-white/10 outline-none focus:border-green-500 font-bold text-xs" value={newFinancial.description} onChange={e => setNewFinancial({...newFinancial, description: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" step="0.01" placeholder="VALOR R$" className="w-full bg-white/5 p-5 rounded-2xl border border-white/10 outline-none focus:border-green-500 font-bold text-xs" value={newFinancial.amount} onChange={e => setNewFinancial({...newFinancial, amount: e.target.value})} required />
                  <input type="date" className="w-full bg-white/5 p-5 rounded-2xl border border-white/10 outline-none focus:border-green-500 font-bold text-xs text-white" value={newFinancial.due_date} onChange={e => setNewFinancial({...newFinancial, due_date: e.target.value})} required />
                </div>
                <div className="pt-2">
                  <label className="text-[9px] font-black text-green-500/50 uppercase ml-2 tracking-widest mb-2 block">Chave PIX do Recebedor</label>
                  <input placeholder="E-MAIL, CPF OU CELULAR" className="w-full bg-green-500/5 p-5 rounded-2xl border border-green-500/20 outline-none focus:border-green-500 font-mono text-xs text-green-500" value={newFinancial.pix_key} onChange={e => setNewFinancial({...newFinancial, pix_key: e.target.value})} required />
                </div>
                <div className="flex gap-4 pt-10">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-5 text-[10px] font-black uppercase opacity-30 tracking-widest">Voltar</button>
                  <button type="submit" disabled={processing} className="flex-1 py-5 bg-green-500 text-black text-[10px] font-black uppercase rounded-2xl shadow-xl shadow-green-500/20 tracking-widest">Lançar</button>
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
