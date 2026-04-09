import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBaba } from '../contexts/BabaContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { 
  ArrowLeft, DollarSign, Copy, Plus, 
  CheckCircle, Clock, X, Loader2, AlertCircle 
} from 'lucide-react';
import toast from 'react-hot-toast';

const FinancialPage = () => {
  const navigate = useNavigate();
  const { currentBaba } = useBaba();
  const { user } = useAuth();
  
  const [financials, setFinancials] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isPresident, setIsPresident] = useState(false);
  
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
            confirmed_by
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

  const markAsPaid = async (financialId) => {
    try {
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
      if (!financial) return;

      const { error } = await supabase
        .from(TABLES.PAYMENTS)
        .upsert([{
          financial_id: financialId,
          player_id: player.id,
          amount: financial.amount,
          status: 'pending',
          paid_at: new Date().toISOString()
        }], { onConflict: 'financial_id,player_id' });

      if (error) throw error;
      toast.success('Solicitação de pagamento enviada!');
      loadFinancials();
    } catch (error) {
      toast.error('Erro ao processar pagamento');
    }
  };

  // 🔥 NOVO: Upload de comprovante
  const uploadProof = async (file, paymentId) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${paymentId}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(fileName);

      const { error } = await supabase
        .from(TABLES.PAYMENTS)
        .update({
          proof_url: data.publicUrl,
          proof_uploaded_at: new Date().toISOString()
        })
        .eq('id', paymentId);

      if (error) throw error;

      toast.success('Comprovante enviado!');
      loadFinancials();
    } catch (err) {
      toast.error('Erro ao enviar comprovante');
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
      toast.success('Pagamento confirmado!');
      loadFinancials();
    } catch (error) {
      toast.error('Erro ao confirmar pagamento');
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

        {/* PIX */}
        {currentBaba.pix_key && (
          <div className="card-glass p-6 mb-8 rounded-3xl border border-green-500/20">
            <p className="text-[10px] text-green-500 font-black mb-3 uppercase tracking-widest">Chave PIX do Baba</p>
            <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl">
              <span className="font-mono text-sm">{currentBaba.pix_key}</span>
              <button 
                onClick={() => { navigator.clipboard.writeText(currentBaba.pix_key); toast.success('Chave copiada!'); }}
              >
                <Copy size={18} />
              </button>
            </div>
          </div>
        )}

        {isPresident && (
          <button onClick={() => setShowCreateModal(true)}>
            Nova Cobrança
          </button>
        )}

        {/* LISTA */}
        <div className="space-y-6">
          {financials.map((f) => (
            <div key={f.id}>
              <h3>{f.title}</h3>
              <p>R$ {f.amount}</p>

              {!isPresident ? (
                <>
                  <button onClick={() => markAsPaid(f.id)}>
                    Informar Pagamento
                  </button>

                  {/* Upload */}
                  {f.payments?.[0] && (
                    <input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) uploadProof(file, f.payments[0].id);
                      }}
                    />
                  )}
                </>
              ) : (
                f.payments?.map(p => (
                  <div key={p.id}>
                    {p.proof_url && (
                      <a href={p.proof_url} target="_blank">
                        Ver comprovante
                      </a>
                    )}
                    <button onClick={() => confirmPayment(p.id)}>
                      Confirmar
                    </button>
                  </div>
                ))
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default FinancialPage;
