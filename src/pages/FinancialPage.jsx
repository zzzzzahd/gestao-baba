import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBaba } from '../contexts/BabaContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { 
  ArrowLeft, DollarSign, Copy, Plus, 
  CheckCircle, Clock, X, Loader2, AlertCircle,
  Upload, Image as ImageIcon, Edit, Save
} from 'lucide-react';
import toast from 'react-hot-toast';

const FinancialPage = () => {
  const navigate = useNavigate();
  const { currentBaba } = useBaba();
  const { user } = useAuth();
  
  const [financials, setFinancials] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [selectedFinancial, setSelectedFinancial] = useState(null);
  const [selectedProof, setSelectedProof] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isPresident, setIsPresident] = useState(false);
  const [editingPix, setEditingPix] = useState(false);
  const [pixKey, setPixKey] = useState('');
  
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
    setPixKey(currentBaba.pix_key || '');
    loadFinancials();
  }, [currentBaba]);

  const loadFinancials = async () => {
    try {
      setLoading(true);
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
            proof_uploaded_at,
            confirmed_at,
            player:players(name)
          )
        `)
        .eq('baba_id', currentBaba.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFinancials(data || []);
    } catch (error) {
      console.error('Erro ao carregar financials:', error);
      toast.error('Erro ao carregar dados financeiros');
    } finally {
      setLoading(false);
    }
  };

  // ✅ SALVAR CHAVE PIX
  const handleSavePixKey = async () => {
    try {
      const { error } = await supabase
        .from('babas')
        .update({ pix_key: pixKey })
        .eq('id', currentBaba.id);

      if (error) throw error;
      toast.success('Chave PIX salva!');
      setEditingPix(false);
    } catch (error) {
      toast.error('Erro ao salvar chave PIX');
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
      toast.success('Cobrança criada com sucesso!');
      setShowCreateModal(false);
      setNewFinancial({ title: '', description: '', amount: '', due_date: '' });
      loadFinancials();
    } catch (error) {
      toast.error('Erro ao criar cobrança');
    }
  };

  // ✅ UPLOAD DE COMPROVANTE
  const handleUploadProof = async (financialId, file) => {
    if (!file) return;

    try {
      setUploading(true);

      // Buscar player_id do usuário
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

      // Upload da imagem
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${financialId}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(fileName);

      // Salvar no banco
      const financial = financials.find(f => f.id === financialId);
      
      const { error } = await supabase
        .from(TABLES.PAYMENTS)
        .upsert([{
          financial_id: financialId,
          player_id: player.id,
          amount: financial.amount,
          status: 'pending',
          paid_at: new Date().toISOString(),
          proof_url: publicUrl,
          proof_uploaded_at: new Date().toISOString()
        }], { onConflict: 'financial_id,player_id' });

      if (error) throw error;

      toast.success('Comprovante enviado com sucesso!');
      setShowProofModal(false);
      setSelectedFinancial(null);
      loadFinancials();
    } catch (error) {
      console.error('Erro upload:', error);
      toast.error('Erro ao enviar comprovante');
    } finally {
      setUploading(false);
    }
  };

  // ✅ CONFIRMAR PAGAMENTO (Presidente)
  const confirmPayment = async (payment) => {
    try {
      const { error } = await supabase
        .from(TABLES.PAYMENTS)
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
          confirmed_by: user.id
        })
        .eq('id', payment.id);

      if (error) throw error;

      // ✅ DELETAR COMPROVANTE APÓS CONFIRMAÇÃO
      if (payment.proof_url) {
        const fileName = payment.proof_url.split('/').pop();
        await supabase.storage
          .from('payment-proofs')
          .remove([`${payment.proof_url.split('payment-proofs/')[1]}`]);
      }

      toast.success('Pagamento confirmado e comprovante removido!');
      loadFinancials();
    } catch (error) {
      console.error('Erro ao confirmar:', error);
      toast.error('Erro ao confirmar pagamento');
    }
  };

  // ✅ VISUALIZAR COMPROVANTE
  const viewProof = (proof) => {
    setSelectedProof(proof);
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
          <button 
            onClick={() => navigate('/home')} 
            className="flex items-center gap-2 text-xs font-black uppercase tracking-widest opacity-50 hover:opacity-100 transition-all"
          >
            <ArrowLeft size={16} /> {currentBaba?.name}
          </button>
          <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
            <DollarSign size={20} className="text-green-500" />
          </div>
        </div>

        <h1 className="text-4xl font-black mb-10 italic uppercase tracking-tighter">
          Financeiro <span className="text-green-500">.</span>
        </h1>

        {/* ✅ PIX KEY SECTION - Editável pelo presidente */}
        <div className="card-glass p-6 mb-8 rounded-3xl border border-green-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <AlertCircle size={80} />
          </div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] text-green-500 font-black uppercase tracking-widest">
              Chave PIX do Baba
            </p>
            {isPresident && !editingPix && (
              <button
                onClick={() => setEditingPix(true)}
                className="text-xs text-green-500/60 hover:text-green-500 flex items-center gap-1"
              >
                <Edit size={14} /> Editar
              </button>
            )}
          </div>
          
          {editingPix ? (
            <div className="space-y-3">
              <input
                type="text"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                placeholder="Digite sua chave PIX"
                className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-green-500 transition-all font-mono text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setEditingPix(false); setPixKey(currentBaba.pix_key || ''); }}
                  className="flex-1 py-2 px-4 bg-white/5 rounded-xl text-xs font-black uppercase"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSavePixKey}
                  className="flex-1 py-2 px-4 bg-green-500 text-black rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2"
                >
                  <Save size={14} /> Salvar
                </button>
              </div>
            </div>
          ) : pixKey ? (
            <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
              <span className="font-mono text-sm tracking-tight">{pixKey}</span>
              <button 
                onClick={() => { navigator.clipboard.writeText(pixKey); toast.success('Chave copiada!'); }}
                className="p-2 hover:bg-green-500/20 rounded-xl transition-all text-green-500"
              >
                <Copy size={18} />
              </button>
            </div>
          ) : (
            <p className="text-xs text-white/40 italic">
              {isPresident ? 'Clique em "Editar" para adicionar sua chave PIX' : 'Chave PIX não configurada'}
            </p>
          )}
        </div>

        {isPresident && (
          <button 
            onClick={() => setShowCreateModal(true)} 
            className="w-full py-5 mb-8 rounded-2xl bg-green-500 text-black font-black uppercase text-xs tracking-[0.2em] shadow-[0_10px_30px_rgba(34,197,94,0.2)] hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={18} strokeWidth={3} /> Nova Cobrança
          </button>
        )}

        {/* Financial List */}
        <div className="space-y-6">
          {financials.length === 0 ? (
            <div className="text-center py-20 opacity-20 italic font-black uppercase tracking-widest text-sm">
              Nenhuma movimentação registrada
            </div>
          ) : (
            financials.map((f) => {
              const userPayment = f.payments?.find(p => 
                p.player_id === user.id || 
                (p.player && p.player.name)
              );
              
              return (
                <div key={f.id} className="card-glass p-8 rounded-[2rem] border border-white/5 hover:border-green-500/30 transition-all group">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div className="space-y-1">
                      <h3 className="text-xl font-black italic uppercase tracking-tighter group-hover:text-green-500 transition-colors">{f.title}</h3>
                      {f.description && <p className="text-xs opacity-40 font-medium uppercase tracking-wide">{f.description}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black text-green-500 tracking-tighter leading-none">
                        R$ {f.amount.toFixed(2)}
                      </p>
                      {f.due_date && <p className="text-[9px] font-black opacity-30 mt-2 uppercase tracking-widest">Vence: {new Date(f.due_date).toLocaleDateString()}</p>}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/5">
                    {!isPresident ? (
                      // ✅ JOGADOR - Botão de enviar comprovante
                      userPayment?.status === 'confirmed' ? (
                        <div className="flex items-center justify-center gap-2 py-4 text-green-500">
                          <CheckCircle size={18} />
                          <span className="text-xs font-black uppercase">Pagamento Confirmado</span>
                        </div>
                      ) : userPayment?.status === 'pending' ? (
                        <div className="flex items-center justify-center gap-2 py-4 text-yellow-500">
                          <Clock size={18} />
                          <span className="text-xs font-black uppercase">Aguardando Aprovação</span>
                        </div>
                      ) : (
                        <button 
                          onClick={() => { setSelectedFinancial(f); setShowProofModal(true); }}
                          className="w-full py-4 rounded-xl border border-green-500/50 text-green-500 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-green-500 hover:text-black transition-all flex items-center justify-center gap-2"
                        >
                          <Upload size={16} /> Enviar Comprovante
                        </button>
                      )
                    ) : (
                      // ✅ PRESIDENTE - Ver comprovantes pendentes
                      <div className="space-y-3">
                        <p className="text-[9px] font-black opacity-30 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Clock size={12} /> Pagamentos Pendentes
                        </p>
                        {f.payments?.filter(p => p.status === 'pending').length === 0 ? (
                          <p className="text-[10px] italic opacity-20">Nenhum aguardando aprovação</p>
                        ) : (
                          f.payments?.filter(p => p.status === 'pending').map(p => (
                            <div key={p.id} className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-3">
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="text-xs font-black uppercase">{p.player?.name || 'Jogador'}</p>
                                  <p className="text-[9px] opacity-40">
                                    Enviado em {new Date(p.proof_uploaded_at).toLocaleDateString()}
                                  </p>
                                </div>
                                {p.proof_url && (
                                  <button
                                    onClick={() => viewProof(p.proof_url)}
                                    className="text-cyan-electric hover:text-cyan-400 transition-colors"
                                  >
                                    <ImageIcon size={20} />
                                  </button>
                                )}
                              </div>
                              <button 
                                onClick={() => confirmPayment(p)} 
                                className="w-full bg-green-500 text-black px-4 py-3 rounded-xl text-[10px] font-black uppercase hover:scale-105 transition-all flex items-center justify-center gap-2"
                              >
                                <CheckCircle size={14} /> Confirmar Pagamento
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ✅ MODAL DE UPLOAD DE COMPROVANTE */}
        {showProofModal && selectedFinancial && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center p-5 z-50">
            <div className="card-glass p-8 max-w-md w-full border border-green-500/30 rounded-[2.5rem]">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-green-500 italic uppercase">Enviar Comprovante</h2>
                <button onClick={() => { setShowProofModal(false); setSelectedFinancial(null); }} className="text-white/20 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-white/5 p-4 rounded-2xl">
                  <p className="text-xs opacity-40 mb-1">Cobrança:</p>
                  <p className="font-black">{selectedFinancial.title}</p>
                  <p className="text-2xl font-black text-green-500 mt-2">R$ {selectedFinancial.amount.toFixed(2)}</p>
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase opacity-40 ml-2 tracking-widest mb-2 block">
                    Comprovante (Imagem)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files[0]) {
                        handleUploadProof(selectedFinancial.id, e.target.files[0]);
                      }
                    }}
                    disabled={uploading}
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-green-500 transition-all text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-green-500/20 file:text-green-500 file:font-black file:text-xs file:uppercase hover:file:bg-green-500/30"
                  />
                </div>

                {uploading && (
                  <div className="flex items-center justify-center gap-2 py-4">
                    <Loader2 className="animate-spin text-green-500" size={20} />
                    <span className="text-xs font-black uppercase text-green-500">Enviando...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ✅ MODAL DE VISUALIZAÇÃO DE COMPROVANTE */}
        {selectedProof && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center p-5 z-50" onClick={() => setSelectedProof(null)}>
            <div className="max-w-2xl w-full">
              <button
                onClick={() => setSelectedProof(null)}
                className="mb-4 text-white/60 hover:text-white flex items-center gap-2 text-xs font-black uppercase"
              >
                <X size={16} /> Fechar
              </button>
              <img 
                src={selectedProof} 
                alt="Comprovante" 
                className="w-full h-auto rounded-2xl border-2 border-green-500/30"
              />
            </div>
          </div>
        )}

        {/* Modal de Criação */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center p-5 z-50">
            <div className="card-glass p-8 max-w-md w-full border border-green-500/30 rounded-[2.5rem]">
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-2xl font-black text-green-500 italic uppercase tracking-tighter">Nova Cobrança</h2>
                <button onClick={() => setShowCreateModal(false)} className="text-white/20 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={createFinancial} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase opacity-40 ml-2 tracking-widest">O que é?</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Mensalidade Fevereiro" 
                    value={newFinancial.title} 
                    onChange={e => setNewFinancial({...newFinancial, title: e.target.value.toUpperCase()})} 
                    required 
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-green-500 transition-all font-bold text-sm uppercase" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase opacity-40 ml-2 tracking-widest">Descrição (opcional)</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Pagamento do mês de fevereiro" 
                    value={newFinancial.description} 
                    onChange={e => setNewFinancial({...newFinancial, description: e.target.value})} 
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-green-500 transition-all font-bold text-sm" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase opacity-40 ml-2 tracking-widest">Valor (R$)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00" 
                    value={newFinancial.amount} 
                    onChange={e => setNewFinancial({...newFinancial, amount: e.target.value})} 
                    required 
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-green-500 transition-all font-bold text-sm" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase opacity-40 ml-2 tracking-widest">Vencimento</label>
                  <input 
                    type="date" 
                    value={newFinancial.due_date} 
                    onChange={e => setNewFinancial({...newFinancial, due_date: e.target.value})} 
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-green-500 transition-all font-bold text-sm" 
                  />
                </div>

                <div className="flex gap-4 pt-6">
                  <button 
                    type="button" 
                    onClick={() => setShowCreateModal(false)} 
                    className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase bg-white/5 tracking-widest"
                  >
                    Voltar
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase bg-green-500 text-black shadow-[0_10px_20px_rgba(34,197,94,0.3)] tracking-widest"
                  >
                    Lançar
                  </button>
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
