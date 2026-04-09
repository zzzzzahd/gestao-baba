import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBaba } from '../contexts/BabaContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { 
  ArrowLeft, DollarSign, Copy, Plus, 
  CheckCircle, Clock, X, Loader2, AlertCircle,
  FileText, Image as ImageIcon, Trash2, Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';

const FinancialPage = () => {
  const navigate = useNavigate();
  const { currentBaba } = useBaba();
  const { user } = useAuth();
  
  const [financials, setFinancials] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isPresident, setIsPresident] = useState(false);
  
  const [selectedFinancial, setSelectedFinancial] = useState(null);
  const [proofFile, setProofFile] = useState(null);

  const [newFinancial, setNewFinancial] = useState({
    title: '',
    description: '',
    amount: '',
    due_date: ''
  });

  const TABLES = {
    FINANCIALS: 'financials',
    PAYMENTS: 'payments',
    PLAYERS: 'players'
  };

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
      // CORREÇÃO 1: Relacionamento mais explícito para evitar retornos nulos
      const { data, error } = await supabase
        .from(TABLES.FINANCIALS)
        .select(`
          *,
          payments:payments(
            id,
            player_id,
            status,
            amount,
            paid_at,
            proof_url,
            confirmed_at,
            players(id, name)
          )
        `)
        .eq('baba_id', currentBaba.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFinancials(data || []);
    } catch (error) {
      toast.error('Erro ao carregar dados financeiros');
    } finally {
      setLoading(false);
    }
  };

  const uploadProof = async (file, financialId) => {
    // CORREÇÃO 2: Validação de Tipo de Arquivo
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Formato inválido. Use JPG, PNG ou PDF.');
    }

    if (file.size > 2 * 1024 * 1024) {
      throw new Error('O arquivo deve ter menos de 2MB');
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${financialId}_${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from('payment-proof-bucket') // Ajustado para o nome padrão sugerido
      .upload(fileName, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('payment-proof-bucket')
      .getPublicUrl(fileName);
      
    return publicUrl;
  };

  const markAsPaid = async (financialId, file = null) => {
    try {
      setUploading(true);
      const { data: player } = await supabase
        .from(TABLES.PLAYERS)
        .select('id')
        .eq('baba_id', currentBaba.id)
        .eq('user_id', user.id)
        .single();

      if (!player) {
        toast.error('Você não está vinculado a este baba!');
        return;
      }

      const financial = financials.find(f => f.id === financialId);
      let proofUrl = null;

      if (file) {
        try {
          proofUrl = await uploadProof(file, financialId);
        } catch (err) {
          toast.error(err.message);
          return;
        }
      }
      
      const { error } = await supabase
        .from(TABLES.PAYMENTS)
        .upsert([{
          financial_id: financialId,
          player_id: player.id,
          amount: financial.amount,
          status: 'pending',
          paid_at: new Date().toISOString(),
          proof_url: proofUrl,
          proof_uploaded_at: proofUrl ? new Date().toISOString() : null
        }], { onConflict: 'financial_id,player_id' }); // CORREÇÃO 3: Assume-se a constraint UNIQUE no banco

      if (error) throw error;
      toast.success('Solicitação enviada!');
      setShowProofModal(false);
      setProofFile(null);
      loadFinancials();
    } catch (error) {
      toast.error('Erro ao processar pagamento');
    } finally {
      setUploading(false);
    }
  };

  const confirmPayment = async (paymentId) => {
    try {
      const { error } = await supabase
        .from(TABLES.PAYMENTS)
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
          confirmed_by: user.id
        })
        .eq('id', paymentId);

      if (error) throw error;
      toast.success('Confirmado!');
      loadFinancials();
    } catch (error) {
      toast.error('Erro ao confirmar');
    }
  };

  // CORREÇÃO 6: Implementação do Delete de Comprovante (Opcional para o Presidente)
  const deletePaymentRecord = async (paymentId) => {
    if (!window.confirm('Deseja excluir este registro de pagamento?')) return;
    try {
      const { error } = await supabase.from(TABLES.PAYMENTS).delete().eq('id', paymentId);
      if (error) throw error;
      toast.success('Registro removido');
      loadFinancials();
    } catch (error) {
      toast.error('Erro ao deletar');
    }
  };

  const createFinancial = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from(TABLES.FINANCIALS)
        .insert([{
          ...newFinancial,
          baba_id: currentBaba.id,
          created_by: user.id,
          amount: parseFloat(newFinancial.amount)
        }]);

      if (error) throw error;
      toast.success('Cobrança criada!');
      setShowCreateModal(false);
      setNewFinancial({ title: '', description: '', amount: '', due_date: '' });
      loadFinancials();
    } catch (error) {
      toast.error('Erro ao criar cobrança');
    }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black gap-4">
      <Loader2 className="animate-spin text-green-500" size={40} />
      <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Consultando Extrato...</p>
    </div>
  );

  return (
    <div className="min-h-screen p-6 bg-black text-white font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <button onClick={() => navigate('/home')} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest opacity-50 hover:opacity-100 transition-all">
            <ArrowLeft size={16} /> {currentBaba?.name}
          </button>
          <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
            <DollarSign size={20} className="text-green-500" />
          </div>
        </div>

        <h1 className="text-4xl font-black mb-10 italic uppercase tracking-tighter">
          Financeiro <span className="text-green-500">.</span>
        </h1>

        {/* PIX Key */}
        {currentBaba.pix_key && (
          <div className="card-glass p-6 mb-8 rounded-3xl border border-green-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5"><AlertCircle size={80} /></div>
            <p className="text-[10px] text-green-500 font-black mb-3 uppercase tracking-widest">Chave PIX do Baba</p>
            <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
              <span className="font-mono text-sm tracking-tight">{currentBaba.pix_key}</span>
              <button 
                onClick={() => { navigator.clipboard.writeText(currentBaba.pix_key); toast.success('Copiado!'); }}
                className="p-2 hover:bg-green-500/20 rounded-xl transition-all text-green-500"
              >
                <Copy size={18} />
              </button>
            </div>
          </div>
        )}

        {isPresident && (
          <button onClick={() => setShowCreateModal(true)} className="w-full py-5 mb-8 rounded-2xl bg-green-500 text-black font-black uppercase text-xs tracking-[0.2em] shadow-[0_10px_30px_rgba(34,197,94,0.2)] hover:scale-[1.01] transition-all flex items-center justify-center gap-2">
            <Plus size={18} strokeWidth={3} /> Nova Cobrança
          </button>
        )}

        {/* Lista Financeira */}
        <div className="space-y-6">
          {financials.length === 0 ? (
            <div className="text-center py-20 opacity-20 italic font-black uppercase tracking-widest text-sm">Nenhuma movimentação</div>
          ) : (
            financials.map((f) => {
              const pending = f.payments?.filter(p => p.status === 'pending') || [];
              const confirmed = f.payments?.filter(p => p.status === 'confirmed') || [];

              return (
                <div key={f.id} className="card-glass p-8 rounded-[2rem] border border-white/5 group">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                      <h3 className="text-xl font-black italic uppercase tracking-tighter group-hover:text-green-500 transition-colors">{f.title}</h3>
                      <p className="text-xs opacity-40 font-medium uppercase">{f.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black text-green-500 tracking-tighter">R$ {f.amount.toFixed(2)}</p>
                      {f.due_date && <p className="text-[9px] font-black opacity-30 mt-2 uppercase">Vence: {new Date(f.due_date).toLocaleDateString()}</p>}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/5">
                    {!isPresident ? (
                      <button 
                        onClick={() => { setSelectedFinancial(f); setShowProofModal(true); }} 
                        className="w-full py-4 rounded-xl border border-green-500/50 text-green-500 font-black text-[10px] uppercase hover:bg-green-500 hover:text-black transition-all"
                      >
                        Informar Pagamento
                      </button>
                    ) : (
                      <div className="space-y-6">
                        {/* Pendentes */}
                        <div>
                          <p className="text-[9px] font-black text-yellow-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Clock size={12} /> Pendentes ({pending.length})
                          </p>
                          <div className="space-y-3">
                            {pending.map(p => (
                              <div key={p.id} className="flex flex-col sm:flex-row justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5 gap-4">
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-black uppercase tracking-widest">{p.players?.name || 'Jogador Desconhecido'}</span>
                                  {/* CORREÇÃO 5: Data de envio visível */}
                                  <span className="text-[8px] opacity-30 flex items-center gap-1 uppercase"><Calendar size={10}/> Enviado em {new Date(p.paid_at).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {p.proof_url && (
                                    <a href={p.proof_url} target="_blank" rel="noreferrer" className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/50 hover:text-white">
                                      <ImageIcon size={18} />
                                    </a>
                                  )}
                                  <button onClick={() => confirmPayment(p.id)} className="bg-green-500 text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase">
                                    Confirmar
                                  </button>
                                  {/* CORREÇÃO 6: Botão Trash2 utilizado para limpar registros errados */}
                                  <button onClick={() => deletePaymentRecord(p.id)} className="p-2 text-red-500/30 hover:text-red-500 transition-colors">
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Confirmados */}
                        {confirmed.length > 0 && (
                          <div className="pt-4 border-t border-white/5">
                            <p className="text-[9px] font-black text-green-500/50 uppercase mb-4">Confirmados ({confirmed.length})</p>
                            <div className="flex flex-wrap gap-2">
                              {confirmed.map(p => (
                                <div key={p.id} className="bg-green-500/5 border border-green-500/10 px-3 py-2 rounded-lg flex flex-col">
                                  <span className="text-[9px] font-black uppercase opacity-60">{p.players?.name || 'Jogador'}</span>
                                  <span className="text-[7px] opacity-30 italic">Pago em {new Date(p.confirmed_at || p.paid_at).toLocaleDateString()}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Comprovante */}
        {showProofModal && selectedFinancial && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center p-5 z-50">
            <div className="card-glass p-8 max-w-md w-full border border-green-500/30 rounded-[2.5rem]">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-green-500 italic uppercase tracking-tighter">Pagamento</h2>
                  <p className="text-[10px] opacity-40 uppercase font-black">{selectedFinancial.title}</p>
                </div>
                <button onClick={() => { setShowProofModal(false); setProofFile(null); }} className="text-white/20 hover:text-white"><X size={24} /></button>
              </div>

              <div className="space-y-6">
                <div className="bg-white/5 p-6 rounded-2xl border border-dashed border-white/10 text-center">
                  {proofFile ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center gap-2 text-green-500">
                        <FileText size={24} />
                        <span className="text-xs font-bold truncate max-w-[200px]">{proofFile.name}</span>
                      </div>
                      <button onClick={() => setProofFile(null)} className="text-[9px] uppercase font-black text-red-500">Remover</button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block space-y-2">
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-2 text-green-500"><ImageIcon size={20} /></div>
                      <p className="text-[10px] font-black uppercase tracking-widest">Anexar Comprovante</p>
                      <p className="text-[8px] opacity-30 uppercase">JPG, PNG ou PDF (Máx 2MB)</p>
                      <input type="file" accept="image/jpeg,image/png,application/pdf" className="hidden" onChange={(e) => setProofFile(e.target.files[0])} />
                    </label>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    disabled={uploading}
                    onClick={() => markAsPaid(selectedFinancial.id, proofFile)}
                    className="w-full py-4 rounded-2xl font-black text-[10px] uppercase bg-green-500 text-black shadow-[0_10px_20px_rgba(34,197,94,0.3)] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {uploading ? <Loader2 className="animate-spin" size={16} /> : (proofFile ? 'Enviar com Comprovante' : 'Informar sem Comprovante')}
                  </button>
                  <button onClick={() => { setShowProofModal(false); setProofFile(null); }} className="w-full py-4 rounded-2xl font-black text-[10px] uppercase bg-white/5">Cancelar</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Criação (Simplificado) */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center p-5 z-50">
             <div className="card-glass p-8 max-w-md w-full border border-green-500/30 rounded-[2.5rem]">
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-2xl font-black text-green-500 italic uppercase tracking-tighter">Nova Cobrança</h2>
                <button onClick={() => setShowCreateModal(false)} className="text-white/20"><X size={24} /></button>
              </div>
              <form onSubmit={createFinancial} className="space-y-5">
                <input type="text" placeholder="TÍTULO" value={newFinancial.title} onChange={e => setNewFinancial({...newFinancial, title: e.target.value.toUpperCase()})} required className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-green-500 text-sm font-bold" />
                <input type="number" step="0.01" placeholder="VALOR (R$)" value={newFinancial.amount} onChange={e => setNewFinancial({...newFinancial, amount: e.target.value})} required className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-green-500 text-sm font-bold" />
                <input type="date" value={newFinancial.due_date} onChange={e => setNewFinancial({...newFinancial, due_date: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-sm font-bold" />
                <button type="submit" className="w-full py-4 rounded-2xl font-black text-[10px] uppercase bg-green-500 text-black">Lançar Cobrança</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialPage;
