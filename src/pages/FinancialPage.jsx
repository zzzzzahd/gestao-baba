import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBaba } from '../contexts/BabaContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import {
  ArrowLeft, DollarSign, Plus, CheckCircle, Clock, X,
  Loader2, Trash2, Camera, Eye, Ban, CreditCard, ChevronRight,
  Wallet, Receipt, TrendingDown, TrendingUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import { PageSkeleton } from '../components/SkeletonLoader';
import { CYAN_GRADIENT } from '../utils/constants';
import { maskPix } from '../utils/securityUtils';
import PixCopyButton from '../components/PixCopyButton';

const FinancialPage = () => {
  const navigate = useNavigate();
  const { currentBaba, loading: babaLoading } = useBaba();
  const { user } = useAuth();

  const [financials, setFinancials]           = useState([]);
  const [expenses, setExpenses]               = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPayModal, setShowPayModal]       = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [selectedFinancial, setSelectedFinancial] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [processing, setProcessing] = useState(false);
  const [isPresident, setIsPresident] = useState(false);
  // Tarefa 1.2 — substitui window.confirm()
  const [confirmState, setConfirmState] = useState({ open: false, message: '', description: '', onConfirm: null });

  const [newFinancial, setNewFinancial] = useState({
    title: '', description: '', amount: '', due_date: '', pix_key: ''
  });

  const [newExpense, setNewExpense] = useState({
    title: '', description: '', amount: ''
  });
  const [expenseProofFile, setExpenseProofFile] = useState(null);

  useEffect(() => {
    if (babaLoading) return; // ainda carregando os dados do baba, aguarda
    if (!currentBaba || !user) {
      if (!currentBaba) navigate('/home');
      return;
    }
    setIsPresident(currentBaba.president_id === user.id);
    loadFinancials();
    loadExpenses();
  }, [currentBaba, user, babaLoading]);

  const loadFinancials = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('financials')
        .select(`
          *,
          payments (
            id, status, amount, proof_url, player_id,
            player:players ( name, user_id )
          )
        `)
        .eq('baba_id', currentBaba.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFinancials(data || []);
    } catch (error) {
      console.error('Erro loadFinancials:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const loadExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('baba_id', currentBaba.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error('Erro loadExpenses:', error);
      // Não bloqueia a tela de cobranças se a tabela de despesas
      // ainda não tiver sido criada (migração pendente).
    }
  };

  // ── Caixa do Baba ────────────────────────────────────────────
  // Soma automaticamente todos os pagamentos CONFIRMADOS de todas as
  // cobranças (o valor da tarifa × quantidade de gente que pagou),
  // depois abate as despesas lançadas pelo presidente.
  const { totalArrecadado, totalDespesas, saldoCaixa } = useMemo(() => {
    const arrecadado = financials.reduce((sum, f) => {
      const confirmados = f.payments?.filter(p => p.status === 'confirmed') || [];
      return sum + confirmados.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
    }, 0);
    const despesas = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    return {
      totalArrecadado: arrecadado,
      totalDespesas: despesas,
      saldoCaixa: arrecadado - despesas
    };
  }, [financials, expenses]);

  const toggleFinancialStatus = async (id, currentStatus) => {
    try {
      const nextStatus = currentStatus === 'active' ? 'closed' : 'active';
      const { error } = await supabase
        .from('financials')
        .update({ status: nextStatus })
        .eq('id', id)
        .select();

      if (error) throw error;
      setFinancials(prev => prev.map(f => f.id === id ? { ...f, status: nextStatus } : f));
      toast.success(nextStatus === 'closed' ? 'Cobrança Encerrada!' : 'Reativada!');
    } catch (error) {
      console.error('Erro status:', error);
      toast.error('Erro ao mudar status. Verifique as Policies no Supabase.');
    }
  };

  const deleteFinancial = (id) => {
    setConfirmState({
      open: true,
      message: 'Apagar esta cobrança?',
      description: 'Todos os registros de pagamento vinculados também serão removidos. Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        try {
          setProcessing(true);
          await supabase.from('payments').delete().eq('financial_id', id);
          const { error } = await supabase.from('financials').delete().eq('id', id);
          if (error) throw error;
          setFinancials(prev => prev.filter(f => f.id !== id));
          toast.success('Excluído com sucesso');
        } catch (error) {
          console.error('Erro ao excluir:', error);
          toast.error('Erro ao excluir');
        } finally {
          setProcessing(false);
        }
      },
    });
  };

  const deleteExpense = (id) => {
    setConfirmState({
      open: true,
      message: 'Apagar esta despesa?',
      description: 'O valor voltará a compor o saldo do caixa. Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        try {
          setProcessing(true);
          const { error } = await supabase.from('expenses').delete().eq('id', id);
          if (error) throw error;
          setExpenses(prev => prev.filter(e => e.id !== id));
          toast.success('Despesa excluída');
        } catch (error) {
          console.error('Erro ao excluir despesa:', error);
          toast.error('Erro ao excluir despesa');
        } finally {
          setProcessing(false);
        }
      },
    });
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

      if (!player) throw new Error('Você não é um jogador deste baba');

      const fileExt = file.name.split('.').pop();
      const filePath = `proofs/${currentBaba.id}/${selectedFinancial.id}_${player.id}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(filePath);

      const { error: payError } = await supabase.from('payments').upsert([{
        financial_id: selectedFinancial.id,
        player_id:    player.id,
        amount:       selectedFinancial.amount,
        status:       'pending',
        proof_url:    publicUrl,
        paid_at:      new Date().toISOString()
      }], { onConflict: 'financial_id,player_id' });
      if (payError) throw payError;

      toast.success('Comprovante enviado!');
      setShowPayModal(false);
      loadFinancials();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao enviar comprovante');
    } finally {
      setProcessing(false);
    }
  };

  const confirmPayment = async (paymentId) => {
    try {
      const { error } = await supabase.from('payments')
        .update({
          status:       'confirmed',
          confirmed_at: new Date().toISOString(),
          confirmed_by: user.id
        })
        .eq('id', paymentId);
      if (error) throw error;
      toast.success('Pagamento Confirmado!');
      loadFinancials();
    } catch {
      toast.error('Erro na confirmação');
    }
  };

  const createFinancial = async (e) => {
    e.preventDefault();
    try {
      setProcessing(true);
      const { error } = await supabase.from('financials').insert([{
        ...newFinancial,
        baba_id:    currentBaba.id,
        created_by: user.id,
        status:     'active'
      }]);
      if (error) throw error;
      toast.success('Cobrança lançada!');
      setShowCreateModal(false);
      setNewFinancial({ title: '', description: '', amount: '', due_date: '', pix_key: '' });
      loadFinancials();
    } catch {
      toast.error('Erro ao criar');
    } finally {
      setProcessing(false);
    }
  };

  const createExpense = async (e) => {
    e.preventDefault();
    if (!newExpense.title.trim() || !newExpense.amount) {
      toast.error('Preencha título e valor');
      return;
    }
    try {
      setProcessing(true);

      let proofUrl = null;
      if (expenseProofFile) {
        const fileExt = expenseProofFile.name.split('.').pop();
        const filePath = `expenses/${currentBaba.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(filePath, expenseProofFile);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('payment-proofs')
          .getPublicUrl(filePath);
        proofUrl = publicUrl;
      }

      const { error } = await supabase.from('expenses').insert([{
        baba_id:     currentBaba.id,
        title:       newExpense.title,
        description: newExpense.description || null,
        amount:      newExpense.amount,
        proof_url:   proofUrl,
        created_by:  user.id
      }]);
      if (error) throw error;

      toast.success('Despesa lançada! Abatida do caixa.');
      setShowExpenseModal(false);
      setNewExpense({ title: '', description: '', amount: '' });
      setExpenseProofFile(null);
      loadExpenses();
    } catch (error) {
      console.error('Erro ao criar despesa:', error);
      toast.error('Erro ao lançar despesa');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <PageSkeleton rows={4} />;

  return (
    <div className="min-h-screen p-6 bg-[#050505] text-white">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <button
            onClick={() => navigate('/home')}
            className="flex items-center gap-2 text-[10px] font-black uppercase opacity-40 hover:opacity-100 transition-all"
          >
            <ArrowLeft size={14} /> Voltar ao Painel
          </button>
          <div className="w-8 h-8 rounded-full bg-cyan-electric/10 flex items-center justify-center border border-cyan-electric/20">
            <DollarSign size={16} className="text-cyan-electric" />
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-5xl font-black italic uppercase tracking-tighter leading-none">
              Financeiro<span className="text-cyan-electric">.</span>
            </h1>
            <p className="text-[10px] opacity-40 mt-2 font-black uppercase tracking-widest">Gestão de Arrecadação</p>
          </div>

          {isPresident && (
            <div className="flex gap-3">
              <button
                onClick={() => setShowExpenseModal(true)}
                className="px-6 py-4 bg-surface-2 border border-border-mid text-text-mid font-black uppercase text-[10px] tracking-widest rounded-full hover:text-white hover:border-red-500/30 transition-all flex items-center gap-2"
              >
                <Receipt size={16} strokeWidth={3} /> Nova Despesa
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-8 py-4 text-black font-black uppercase text-[10px] tracking-widest rounded-full hover:scale-105 transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20"
                style={CYAN_GRADIENT}
              >
                <Plus size={16} strokeWidth={3} /> Nova Cobrança
              </button>
            </div>
          )}
        </div>

        {/* ── Caixa do Baba ── */}
        <div className="mb-12 p-8 rounded-[2.5rem] border border-cyan-electric/20 bg-cyan-electric/5">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-2xl bg-cyan-electric/10 border border-cyan-electric/20 flex items-center justify-center">
              <Wallet size={16} className="text-cyan-electric" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-cyan-electric">Caixa do Baba</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-3xl bg-black/30 border border-border-subtle">
              <div className="flex items-center gap-2 mb-2 text-green-500">
                <TrendingUp size={12} />
                <span className="text-[9px] font-black uppercase tracking-widest">Arrecadado</span>
              </div>
              <p className="text-2xl font-black tracking-tighter text-white">
                R$ {totalArrecadado.toFixed(2)}
              </p>
            </div>
            <div className="p-5 rounded-3xl bg-black/30 border border-border-subtle">
              <div className="flex items-center gap-2 mb-2 text-red-400">
                <TrendingDown size={12} />
                <span className="text-[9px] font-black uppercase tracking-widest">Despesas</span>
              </div>
              <p className="text-2xl font-black tracking-tighter text-white">
                R$ {totalDespesas.toFixed(2)}
              </p>
            </div>
            <div className="p-5 rounded-3xl bg-black/30 border border-cyan-electric/30">
              <div className="flex items-center gap-2 mb-2 text-cyan-electric">
                <Wallet size={12} />
                <span className="text-[9px] font-black uppercase tracking-widest">Saldo Atual</span>
              </div>
              <p className={`text-2xl font-black tracking-tighter ${saldoCaixa < 0 ? 'text-red-400' : 'text-cyan-electric'}`}>
                R$ {saldoCaixa.toFixed(2)}
              </p>
            </div>
          </div>

          {expenses.length > 0 && (
            <div className="mt-6 pt-6 border-t border-border-subtle space-y-2">
              <p className="text-[8px] font-black uppercase opacity-40 ml-1 tracking-widest mb-3">
                Despesas Lançadas ({expenses.length})
              </p>
              {expenses.map(exp => (
                <div
                  key={exp.id}
                  className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-border-subtle"
                >
                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase truncate">{exp.title}</p>
                    <p className="text-[9px] text-text-low font-bold uppercase mt-0.5">
                      {new Date(exp.created_at).toLocaleDateString()}
                      {exp.description ? ` · ${exp.description}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-black text-red-400">- R$ {parseFloat(exp.amount).toFixed(2)}</span>
                    {exp.proof_url && (
                      <a
                        href={exp.proof_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 bg-surface-2 rounded-lg text-text-low hover:text-white transition-colors"
                      >
                        <Eye size={14} />
                      </a>
                    )}
                    {isPresident && (
                      <button
                        onClick={() => deleteExpense(exp.id)}
                        className="p-2 bg-surface-2 rounded-lg text-text-low hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Listagem de cobranças */}
        <div className="space-y-6">
          {financials.map(f => {
            const myPayment        = f.payments?.find(p => p.player?.user_id === user.id);
            const isClosed         = f.status === 'closed';
            const confirmedPayments = f.payments?.filter(p => p.status === 'confirmed') || [];
            const pendingPayments   = f.payments?.filter(p => p.status === 'pending')   || [];

            return (
              <div
                key={f.id}
                className={`p-8 rounded-[2.5rem] border transition-all ${
                  isClosed
                    ? 'bg-red-500/5 border-red-500/10 opacity-75'
                    : 'bg-surface-1 border-border-mid'
                }`}
              >
                <div className="flex flex-col md:flex-row justify-between gap-6 mb-10">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-2xl font-black italic uppercase tracking-tighter">{f.title}</h3>
                      {isClosed && (
                        <span className="bg-red-500 text-white text-[8px] px-2 py-1 rounded-md font-black uppercase tracking-widest">
                          Encerrada
                        </span>
                      )}
                    </div>
                    <p className="text-xs opacity-50 uppercase font-bold tracking-tight">{f.description}</p>
                    <div className="flex items-center gap-4 pt-2">
                      <span className="text-[9px] font-black text-text-low uppercase tracking-widest">
                        Vencimento: {new Date(f.due_date).toLocaleDateString()}
                      </span>
                      <span className="text-[9px] font-black text-text-low uppercase italic tracking-widest font-mono">
                        PIX: {maskPix(f.pix_key)}
                      </span>
                    </div>
                  </div>

                  <div className="text-left md:text-right">
                    <p className="text-4xl font-black text-cyan-electric tracking-tighter leading-none">
                      R$ {parseFloat(f.amount).toFixed(2)}
                    </p>
                    <p className="text-[8px] font-black text-text-low uppercase tracking-widest mt-2">
                      {confirmedPayments.length} pagamento{confirmedPayments.length !== 1 ? 's' : ''} confirmado{confirmedPayments.length !== 1 ? 's' : ''} · R$ {(confirmedPayments.length * parseFloat(f.amount || 0)).toFixed(2)} no caixa
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center pt-8 border-t border-border-subtle">
                  <div>
                    {isClosed ? (
                      <div className="p-4 rounded-2xl border border-red-500/20 bg-red-500/5 text-red-500 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest">
                        <Ban size={16} /> Cobrança Encerrada
                      </div>
                    ) : !myPayment ? (
                      <button
                        onClick={() => { setSelectedFinancial(f); setShowPayModal(true); }}
                        className="w-full flex items-center justify-between p-4 bg-surface-2 rounded-2xl border border-border-mid hover:border-cyan-electric/30 hover:bg-cyan-electric/10 hover:text-cyan-electric transition-all group"
                      >
                        <span className="flex items-center gap-3 uppercase font-black text-[10px] tracking-widest">
                          <CreditCard size={18} /> Pagar Agora
                        </span>
                        <ChevronRight size={16} />
                      </button>
                    ) : (
                      <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
                        myPayment.status === 'confirmed'
                          ? 'border-green-500/20 bg-green-500/5 text-green-500'
                          : 'border-yellow-500/20 bg-yellow-500/5 text-yellow-500'
                      }`}>
                        {myPayment.status === 'confirmed' ? <CheckCircle size={18} /> : <Clock size={18} />}
                        <span className="text-[10px] font-black uppercase tracking-widest">
                          {myPayment.status === 'confirmed' ? 'Confirmado' : 'Aguardando Aprovação'}
                        </span>
                      </div>
                    )}
                  </div>

                  {isPresident && (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => toggleFinancialStatus(f.id, f.status)}
                        className={`p-4 rounded-2xl border border-border-subtle transition-colors ${
                          isClosed
                            ? 'bg-cyan-electric/10 text-cyan-electric'
                            : 'bg-surface-2 hover:text-text-mid'
                        }`}
                      >
                        <Ban size={18} />
                      </button>
                      <button
                        onClick={() => deleteFinancial(f.id)}
                        className="p-4 rounded-2xl bg-surface-2 border border-border-subtle hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </div>

                {confirmedPayments.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-border-subtle">
                    <p className="text-[8px] font-black uppercase opacity-20 ml-2 tracking-widest mb-3">
                      Já Pagaram ({confirmedPayments.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {confirmedPayments.map(p => (
                        <div
                          key={p.id}
                          className="px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full flex items-center gap-2"
                        >
                          <CheckCircle size={10} className="text-green-500" />
                          <span className="text-[9px] font-bold uppercase text-green-500/80">{p.player?.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {isPresident && pendingPayments.length > 0 && (
                  <div className="mt-6 space-y-2">
                    <p className="text-[8px] font-black uppercase text-yellow-500 ml-2 tracking-widest italic">
                      Aprovações Pendentes
                    </p>
                    {pendingPayments.map(p => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-4 bg-surface-2 rounded-2xl border border-border-subtle hover:border-border-mid transition-all"
                      >
                        <span className="text-[10px] font-bold uppercase tracking-tight">{p.player?.name}</span>
                        <div className="flex items-center gap-3">
                          <a
                            href={p.proof_url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 bg-surface-2 rounded-lg text-text-low hover:text-white transition-colors"
                          >
                            <Eye size={18} />
                          </a>
                          <button
                            onClick={() => confirmPayment(p.id)}
                            className="px-4 py-2 text-black rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all"
                            style={CYAN_GRADIENT}
                          >
                            Aprovar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Modal de Pagamento ── */}
        {showPayModal && selectedFinancial && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 z-[100]">
            <div className="bg-[#0A0A0A] p-10 max-w-md w-full border border-border-mid rounded-[3rem] shadow-2xl relative">
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-2xl font-black italic uppercase tracking-tighter">Pagar Taxa</h2>
                <button
                  onClick={() => setShowPayModal(false)}
                  className="p-2 bg-surface-2 rounded-full hover:bg-surface-3 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-8">
                <div className="p-6 bg-cyan-electric/5 rounded-3xl border border-cyan-electric/10 text-center">
                  <p className="text-[9px] font-black text-cyan-electric/60 uppercase mb-4 tracking-widest">
                    Pagar via PIX
                  </p>
                  <PixCopyButton
                    pixKey={selectedFinancial.pix_key}
                    babaName={currentBaba?.name}
                    amount={Number(selectedFinancial.amount) || 0}
                  />
                </div>

                <div className="space-y-3">
                  <p className="text-[9px] font-black opacity-30 uppercase ml-2 tracking-widest italic">
                    Anexar Comprovante
                  </p>
                  <label className="flex flex-col items-center justify-center w-full h-40 bg-surface-2 rounded-3xl border-2 border-dashed border-border-mid hover:border-cyan-electric/40 transition-all cursor-pointer group">
                    {processing ? (
                      <Loader2 className="animate-spin text-cyan-electric" />
                    ) : (
                      <>
                        <Camera size={28} className="opacity-10 group-hover:opacity-100 transition-opacity mb-3" />
                        <span className="text-[10px] font-black uppercase opacity-30 group-hover:opacity-100 transition-opacity tracking-widest">
                          Selecionar Imagem
                        </span>
                      </>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleUploadProof} disabled={processing} />
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Modal de Criação de Cobrança ── */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 z-[100]">
            <div className="bg-[#0A0A0A] p-10 max-w-md w-full border border-border-mid rounded-[3rem]">
              <h2 className="text-3xl font-black italic uppercase mb-10 tracking-tighter text-cyan-electric">
                Nova Taxa
              </h2>

              <form onSubmit={createFinancial} className="space-y-4">
                <input
                  placeholder="TÍTULO (EX: MENSALIDADE)"
                  className="w-full bg-surface-2 p-5 rounded-2xl border border-border-mid outline-none focus:border-cyan-electric/50 font-bold uppercase text-xs tracking-widest transition-colors"
                  value={newFinancial.title}
                  onChange={e => setNewFinancial({ ...newFinancial, title: e.target.value.toUpperCase() })}
                  required
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="VALOR R$"
                    className="w-full bg-surface-2 p-5 rounded-2xl border border-border-mid outline-none focus:border-cyan-electric/50 font-bold text-xs transition-colors"
                    value={newFinancial.amount}
                    onChange={e => setNewFinancial({ ...newFinancial, amount: e.target.value })}
                    required
                  />
                  <input
                    type="date"
                    className="w-full bg-surface-2 p-5 rounded-2xl border border-border-mid outline-none focus:border-cyan-electric/50 font-bold text-xs text-white uppercase transition-colors"
                    value={newFinancial.due_date}
                    onChange={e => setNewFinancial({ ...newFinancial, due_date: e.target.value })}
                    required
                  />
                </div>

                <input
                  placeholder="CHAVE PIX"
                  className="w-full bg-surface-2 p-5 rounded-2xl border border-border-mid outline-none focus:border-cyan-electric/50 font-mono text-xs text-text-mid transition-colors"
                  value={newFinancial.pix_key}
                  onChange={e => setNewFinancial({ ...newFinancial, pix_key: e.target.value })}
                  required
                />

                <div className="flex gap-4 pt-10">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-5 text-[10px] font-black uppercase opacity-30 tracking-widest"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={processing}
                    className="flex-1 py-5 text-black text-[10px] font-black uppercase rounded-2xl tracking-widest hover:scale-[1.02] transition-all disabled:opacity-40 shadow-lg shadow-cyan-500/20"
                    style={CYAN_GRADIENT}
                  >
                    Lançar Agora
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Modal de Nova Despesa (abate o caixa) ── */}
        {showExpenseModal && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 z-[100]">
            <div className="bg-[#0A0A0A] p-10 max-w-md w-full border border-red-500/20 rounded-[3rem]">
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-3xl font-black italic uppercase tracking-tighter text-red-400">
                  Nova Despesa
                </h2>
                <button
                  onClick={() => setShowExpenseModal(false)}
                  className="p-2 bg-surface-2 rounded-full hover:bg-surface-3 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={createExpense} className="space-y-4">
                <input
                  placeholder="TÍTULO (EX: ALUGUEL DA QUADRA)"
                  className="w-full bg-surface-2 p-5 rounded-2xl border border-border-mid outline-none focus:border-red-500/50 font-bold uppercase text-xs tracking-widest transition-colors"
                  value={newExpense.title}
                  onChange={e => setNewExpense({ ...newExpense, title: e.target.value.toUpperCase() })}
                  required
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="VALOR R$"
                  className="w-full bg-surface-2 p-5 rounded-2xl border border-border-mid outline-none focus:border-red-500/50 font-bold text-xs transition-colors"
                  value={newExpense.amount}
                  onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })}
                  required
                />
                <textarea
                  placeholder="DESCRIÇÃO (OPCIONAL)"
                  rows={3}
                  className="w-full bg-surface-2 p-5 rounded-2xl border border-border-mid outline-none focus:border-red-500/50 font-bold uppercase text-xs tracking-widest transition-colors resize-none"
                  value={newExpense.description}
                  onChange={e => setNewExpense({ ...newExpense, description: e.target.value })}
                />

                <div className="space-y-3">
                  <p className="text-[9px] font-black opacity-30 uppercase ml-2 tracking-widest italic">
                    Comprovante (opcional)
                  </p>
                  <label className="flex flex-col items-center justify-center w-full h-32 bg-surface-2 rounded-3xl border-2 border-dashed border-border-mid hover:border-red-500/40 transition-all cursor-pointer group">
                    {expenseProofFile ? (
                      <span className="text-[10px] font-black uppercase text-red-400 tracking-widest px-4 text-center truncate">
                        {expenseProofFile.name}
                      </span>
                    ) : (
                      <>
                        <Camera size={24} className="opacity-10 group-hover:opacity-100 transition-opacity mb-2" />
                        <span className="text-[10px] font-black uppercase opacity-30 group-hover:opacity-100 transition-opacity tracking-widest">
                          Selecionar Imagem
                        </span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => setExpenseProofFile(e.target.files[0] || null)}
                      disabled={processing}
                    />
                  </label>
                </div>

                <div className="flex gap-4 pt-6">
                  <button
                    type="button"
                    onClick={() => { setShowExpenseModal(false); setExpenseProofFile(null); }}
                    className="flex-1 py-5 text-[10px] font-black uppercase opacity-30 tracking-widest"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={processing}
                    className="flex-1 py-5 bg-red-500 text-white text-[10px] font-black uppercase rounded-2xl tracking-widest hover:scale-[1.02] transition-all disabled:opacity-40 shadow-lg shadow-red-500/20"
                  >
                    {processing ? 'Salvando...' : 'Abater do Caixa'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Modal de Confirmação (substitui window.confirm) ── */}
        <ConfirmModal
          open={confirmState.open}
          message={confirmState.message}
          description={confirmState.description}
          confirmLabel="Apagar"
          danger
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(s => ({ ...s, open: false }))}
        />

      </div>
    </div>
  );
};

export default FinancialPage;
