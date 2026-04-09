import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBaba } from '../contexts/BabaContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { 
  ArrowLeft, DollarSign, Copy, Plus, 
  CheckCircle, Clock, X, Loader2, AlertCircle, Upload 
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
  const [proofFile, setProofFile] = useState(null);

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
            proof_url
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
    const fileName = `${user.id}/${financialId}_${Date.now()}`;

    const { data, error } = await supabase.storage
      .from('payment-proofs')
      .upload(fileName, file);

    if (error) throw error;

    return fileName;
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

  const handleSendPayment = async () => {
    try {
      const { data: player } = await supabase
        .from(TABLES.PLAYERS)
        .select('id')
        .eq('baba_id', currentBaba.id)
        .eq('user_id', user.id)
        .single();

      const financial = selectedFinancial;

      let proofPath = null;

      if (proofFile) {
        proofPath = await uploadProof(proofFile, financial.id);
      }

      const { error } = await supabase
        .from(TABLES.PAYMENTS)
        .upsert([{
          financial_id: financial.id,
          player_id: player.id,
          amount: financial.amount,
          status: 'pending',
          paid_at: new Date().toISOString(),
          proof_url: proofPath,
          proof_uploaded_at: proofPath ? new Date().toISOString() : null
        }], { onConflict: 'financial_id,player_id' });

      if (error) throw error;

      toast.success('Pagamento enviado!');
      setShowProofModal(false);
      setProofFile(null);
      loadFinancials();

    } catch (error) {
      toast.error('Erro ao enviar pagamento');
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

        {/* HEADER */}
        <div className="flex items-center justify-between mb-10">
          <button onClick={() => navigate('/home')} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest opacity-50 hover:opacity-100">
            <ArrowLeft size={16} /> {currentBaba?.name}
          </button>
          <DollarSign size={20} className="text-green-500" />
        </div>

        {/* LISTA */}
        <div className="space-y-6">
          {financials.map((f) => {
            const pending = f.payments?.filter(p => p.status === 'pending') || [];
            const confirmed = f.payments?.filter(p => p.status === 'confirmed') || [];

            return (
              <div key={f.id} className="card-glass p-6 rounded-2xl border border-white/5">

                <h3 className="font-black">{f.title}</h3>
                <p className="text-green-500">R$ {f.amount}</p>

                {!isPresident && (
                  <button
                    onClick={() => {
                      setSelectedFinancial(f);
                      setShowProofModal(true);
                    }}
                    className="mt-4 w-full py-3 border border-green-500 text-green-500 rounded-xl"
                  >
                    Informar Pagamento
                  </button>
                )}

                {isPresident && (
                  <>
                    {/* PENDENTES */}
                    <div className="mt-4">
                      <p className="text-xs opacity-50">Pendentes</p>
                      {pending.map(p => (
                        <div key={p.id} className="flex justify-between items-center mt-2">
                          <div className="flex gap-2">
                            {p.proof_url && (
                              <a
                                href={`https://itvfnargszozygcdhlrq.supabase.co/storage/v1/object/public/payment-proofs/${p.proof_url}`}
                                target="_blank"
                                className="text-blue-400 text-xs"
                              >
                                Ver comprovante
                              </a>
                            )}
                          </div>
                          <button onClick={() => confirmPayment(p.id)} className="text-green-500">
                            Confirmar
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* CONFIRMADOS */}
                    <div className="mt-4">
                      <p className="text-xs opacity-50">Confirmados</p>
                      {confirmed.map(p => (
                        <div key={p.id} className="text-green-500 text-xs">
                          Pago ✔
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* MODAL COMPROVANTE */}
        {showProofModal && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center">
            <div className="bg-black p-6 rounded-xl w-full max-w-md">
              <h2 className="mb-4">Enviar Comprovante</h2>

              <input
                type="file"
                onChange={(e) => setProofFile(e.target.files[0])}
              />

              <div className="flex gap-3 mt-4">
                <button onClick={handleSendPayment} className="bg-green-500 px-4 py-2 rounded">
                  Enviar
                </button>
                <button onClick={() => setShowProofModal(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default FinancialPage;
