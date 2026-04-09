import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBaba } from '../contexts/BabaContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { 
  ArrowLeft, DollarSign, Copy, Plus, CheckCircle, Clock, X, 
  Loader2, Trash2, Camera, Eye, Ban, CreditCard, ChevronRight
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
    pix_key: '' // PIX específico por cobrança
  });

  useEffect(() => {
    if (!currentBaba) {
      navigate('/home');
      return;
    }
    setIsPresident(currentBaba.president_id === user.id);
    loadFinancials();
  }, [currentBaba]);

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

      const fileExt = file.name.split('.').pop();
      const filePath = `${currentBaba.id}/proof_${selectedFinancial.id}_${player.id}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(filePath);

      await supabase.from('payments').upsert([{
        financial_id: selectedFinancial.id,
        player_id: player.id,
        amount: selectedFinancial.amount,
        status: 'pending',
        proof_url: publicUrl,
        paid_at: new Date().toISOString()
      }]);

      toast.success('Comprovante enviado!');
      setShowPayModal(false);
      loadFinancials();
    } catch (error) {
      toast.error('Erro no envio do arquivo');
    } finally {
      setProcessing(false);
    }
  };

  const confirmPayment = async (payment) => {
    try {
      if (payment.proof_url) {
        const path = payment.proof_url.split('payment-proofs/')[1];
        await supabase.storage.from('payment-proofs').remove([path]);
      }
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
    const nextStatus = currentStatus === 'active' ? 'closed' : 'active';
    await supabase.from('financials').update({ status: nextStatus }).eq('id', id);
    loadFinancials();
  };

  const deleteFinancial = async (id) => {
    if (!window.confirm("Isso apagará todos os dados de pagamento. Confirmar?")) return;
    await supabase.from('financials').delete().eq('id', id);
    loadFinancials();
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black">
      <Loader2 className="animate-spin text-green-500" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen p-6 bg-[#050505] text-white font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <button onClick={() => navigate('/home')} className="flex items-center gap-2 text-[10px] font-black uppercase opacity-40 hover:opacity-100 transition-all tracking-tighter">
            <ArrowLeft size={14} /> Painel Principal
          </button>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black opacity-30 uppercase">Setor Financeiro</span>
            <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
              <DollarSign size={16} className="text-green-500" />
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="text-5xl font-black italic uppercase tracking-tighter leading-none">Cofre<span className="text-green-500">.</span></h1>
            <p className="text-xs opacity-40 mt-2 font-medium">Gestão de mensalidades e taxas do baba</p>
          </div>
          {isPresident && (
            <button onClick={() => setShowCreateModal(true)} className="px-8 py-4 bg-green-500 text-black font-black uppercase text-[10px] tracking-widest rounded-full hover:scale-105 transition-all flex items-center gap-2 shadow-lg shadow-green-500/20">
              <Plus size={16} strokeWidth={3} /> Nova Cobrança
            </button>
          )}
        </div>

        {/* Listagem */}
        <div className="space-y-6">
          {financials.map(f => {
            const myPayment = f.payments?.find(p => p.player?.name === user.name || p.player_id === user.id);
            const isClosed = f.status === 'closed';

            return (
              <div key={f.id} className={`group relative p-8 rounded-[2.5rem] border transition-all ${isClosed ? 'bg-white/[0.02] border-white/5 opacity-60' : 'bg-white/[0.03] border-white/10 hover:border-green-500/30'}`}>
                
                <div className="flex flex-col md:flex-row justify-between gap-6 mb-10">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-2xl font-black italic uppercase tracking-tighter">{f.title}</h3>
                      {isClosed && <span className="bg-red-500/10 text-red-500 text-[8px] px-2 py-1 rounded-md font-black uppercase">Encerrada</span>}
                    </div>
                    <p className="text-xs opacity-50 max-w-md uppercase font-bold tracking-tight">{f.description || 'Sem descrição adicional'}</p>
                    <div className="flex items-center gap-4 pt-2">
                       <span className="text-[9px] font-black text-white/30 uppercase">Vence em {new Date(f.due_date).toLocaleDateString()}</span>
                       <div className="h-1 w-1 rounded-full bg-white/20" />
                       <span className="text-[9px] font-black text-green-500/50 uppercase italic">Chave: {f.pix_key}</span>
                    </div>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-4xl font-black text-green-500 tracking-tighter">R$ {parseFloat(f.amount).toFixed(2)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center pt-8 border-t border-white/5">
                  {/* Minha Situação / Pagar */}
                  <div>
                    {!myPayment ? (
                      <button 
                        disabled={isClosed}
                        onClick={() => { setSelectedFinancial(f); setShowPayModal(true); }}
                        className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-green-500 hover:text-black transition-all group/btn"
                      >
                        <div className="flex items-center gap-3">
                          <CreditCard size={18} />
                          <span className="text-[10px] font-black uppercase">Pagar Agora</span>
                        </div>
                        <ChevronRight size={16} className="opacity-30 group-hover/btn:translate-x-1 transition-transform" />
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

                  {/* Gestão do Presidente */}
                  {isPresident && (
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => toggleFinancialStatus(f.id, f.status)} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:text-yellow-500 transition-colors" title="Encerrar/Ativar">
                        <Ban size={18} />
                      </button>
                      <button onClick={() => deleteFinancial(f.id)} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:text-red-500 transition-colors" title="Excluir">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Lista de Aprovação Pendente (Visível apenas para o Presidente) */}
                {isPresident && f.payments?.some(p => p.status === 'pending') && (
                   <div className="mt-6 space-y-2">
                      <p className="text-[8px] font-black uppercase opacity-20 ml-2">Solicitações Pendentes</p>
                      {f.payments.filter(p => p.status === 'pending').map(p => (
                        <div key={p.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                          <span className="text-[10px] font-bold uppercase">{p.player?.name}</span>
                          <div className="flex items-center gap-3">
                            <a href={p.proof_url} target="_blank" rel="noreferrer" className="text-white/40 hover:text-white transition-colors"><Eye size={16}/></a>
                            <button onClick={() => confirmPayment(p)} className="px-3 py-1.5 bg-green-500 text-black rounded-lg text-[9px] font-black uppercase">Aprovar</button>
                          </div>
                        </div>
                      ))}
                   </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Modal: Pagar (PIX + Comprovante) */}
        {showPayModal && selectedFinancial && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 z-[100]">
            <div className="bg-[#0A0A0A] p-8 max-w-md w-full border border-white/10 rounded-[3rem] shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black italic uppercase">Pagamento</h2>
                <button onClick={() => setShowPayModal(false)}><X size={24} className="opacity-20"/></button>
              </div>

              <div className="space-y-6">
                <div className="p-6 bg-white/5 rounded-3xl border border-white/5 text-center">
                  <p className="text-[10px] font-black opacity-30 uppercase mb-4 tracking-widest">Chave PIX Selecionada</p>
                  <p className="text-lg font-mono font-bold text-green-500 mb-4">{selectedFinancial.pix_key}</p>
                  <button onClick={() => { navigator.clipboard.writeText(selectedFinancial.pix_key); toast.success('Copiado!'); }} className="flex items-center gap-2 mx-auto px-4 py-2 bg-green-500/10 text-green-500 rounded-full text-[9px] font-black uppercase">
                    <Copy size={12} /> Copiar Chave
                  </button>
                </div>

                <div className="space-y-2">
                  <p className="text-[9px] font-black opacity-30 uppercase ml-2">Enviar Comprovante</p>
                  <label className="flex flex-col items-center justify-center w-full h-32 bg-white/5 rounded-3xl border-2 border-dashed border-white/10 hover:border-green-500/50 transition-all cursor-pointer group">
                    {processing ? <Loader2 className="animate-spin text-green-500" /> : (
                      <>
                        <Camera size={24} className="opacity-20 group-hover:opacity-100 transition-opacity mb-2" />
                        <span className="text-[10px] font-black uppercase opacity-40">Anexar Imagem</span>
                      </>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleUploadProof} disabled={processing} />
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Criar Cobrança */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 z-[100]">
            <div className="bg-[#0A0A0A] p-8 max-w-md w-full border border-white/10 rounded-[3rem]">
              <h2 className="text-2xl font-black italic uppercase mb-8">Nova Cobrança</h2>
              <form onSubmit={createFinancial} className="space-y-4">
                <input placeholder="TÍTULO" className="w-full bg-white/5 p-4 rounded-2xl border border-white/10 outline-none focus:border-green-500 font-bold uppercase text-xs" value={newFinancial.title} onChange={e => setNewFinancial({...newFinancial, title: e.target.value})} required />
                <input placeholder="DESCRIÇÃO" className="w-full bg-white/5 p-4 rounded-2xl border border-white/10 outline-none focus:border-green-500 font-bold text-xs" value={newFinancial.description} onChange={e => setNewFinancial({...newFinancial, description: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" placeholder="VALOR (R$)" className="w-full bg-white/5 p-4 rounded-2xl border border-white/10 outline-none focus:border-green-500 font-bold text-xs" value={newFinancial.amount} onChange={e => setNewFinancial({...newFinancial, amount: e.target.value})} required />
                  <input type="date" className="w-full bg-white/5 p-4 rounded-2xl border border-white/10 outline-none focus:border-green-500 font-bold text-xs text-white" value={newFinancial.due_date} onChange={e => setNewFinancial({...newFinancial, due_date: e.target.value})} required />
                </div>
                <input placeholder="CHAVE PIX PARA ESTA COBRANÇA" className="w-full bg-green-500/5 p-4 rounded-2xl border border-green-500/20 outline-none focus:border-green-500 font-mono text-xs text-green-500" value={newFinancial.pix_key} onChange={e => setNewFinancial({...newFinancial, pix_key: e.target.value})} required />
                
                <div className="flex gap-3 pt-6">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-4 text-[10px] font-black uppercase opacity-40">Cancelar</button>
                  <button type="submit" className="flex-1 py-4 bg-green-500 text-black text-[10px] font-black uppercase rounded-2xl shadow-lg shadow-green-500/20">Lançar</button>
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
