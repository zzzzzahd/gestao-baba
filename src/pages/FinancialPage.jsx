import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBaba } from '../contexts/BabaContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase'; // Ajustado para /lib
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
            paid_at
          )
        `)
        .eq('baba_id', currentBaba.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFinancials(data || []);
    } catch (error) {
      console.error('Erro:', error);
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
      toast.success('Cobrança criada!');
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
        toast.error('Você precisa estar cadastrado no baba!');
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
      toast.success('Enviado para confirmação!');
      loadFinancials();
    } catch (error) {
      toast.error('Erro ao marcar pagamento');
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
    <div className="min-h-screen flex items-center justify-center bg-black">
      <i className="fas fa-spinner fa-spin text-4xl text-cyan-electric"></i>
    </div>
  );

  return (
    <div className="min-h-screen p-5 bg-black text-white">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => navigate('/home')} className="text-cyan-electric">
            <i className="fas fa-arrow-left mr-2"></i> {currentBaba?.name}
          </button>
        </div>

        <h1 className="text-4xl font-black text-center mb-8 text-green-neon italic tracking-tighter">
          <i className="fas fa-dollar-sign mr-3"></i> FINANCEIRO
        </h1>

        {currentBaba.pix_key && (
          <div className="card-glass p-6 mb-6">
            <p className="text-[10px] text-green-neon font-bold mb-2 uppercase">Chave PIX do Baba:</p>
            <div className="flex items-center justify-between bg-white/5 p-4 rounded-lg">
              <span className="font-mono text-sm">{currentBaba.pix_key}</span>
              <button onClick={() => { navigator.clipboard.writeText(currentBaba.pix_key); toast.success('Copiado!'); }} className="text-cyan-electric">
                <i className="fas fa-copy"></i>
              </button>
            </div>
          </div>
        )}

        {isPresident && (
          <button onClick={() => setShowCreateModal(true)} className="btn-primary mb-6">
            <i className="fas fa-plus mr-2"></i> NOVA COBRANÇA
          </button>
        )}

        <div className="space-y-4">
          {financials.map((f) => (
            <div key={f.id} className="card-glass p-6 animate-slide-in">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold">{f.title}</h3>
                  <p className="text-xs opacity-60">{f.description}</p>
                </div>
                <p className="text-2xl font-black text-green-neon">R$ {f.amount.toFixed(2)}</p>
              </div>

              <div className="border-t border-white/10 pt-4">
                {!isPresident ? (
                  <button onClick={() => markAsPaid(f.id)} className="btn-secondary w-full">JÁ PAGUEI</button>
                ) : (
                  <div className="space-y-2">
                    {f.payments?.filter(p => p.status === 'pending').map(p => (
                      <div key={p.id} className="flex justify-between bg-white/5 p-3 rounded-lg">
                        <span className="text-xs">PAGAMENTO PENDENTE</span>
                        <button onClick={() => confirmPayment(p.id)} className="text-green-neon">
                          <i className="fas fa-check-circle text-xl"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {showCreateModal && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-5 z-50">
            <div className="card-glass p-6 max-w-md w-full border border-green-neon/30">
              <h2 className="text-2xl font-black text-green-neon mb-6 italic">NOVA COBRANÇA</h2>
              <form onSubmit={createFinancial} className="space-y-4">
                <input type="text" placeholder="Título" value={newFinancial.title} onChange={e => setNewFinancial({...newFinancial, title: e.target.value})} required className="input-tactical" />
                <textarea placeholder="Descrição" value={newFinancial.description} onChange={e => setNewFinancial({...newFinancial, description: e.target.value})} className="input-tactical" />
                <input type="number" step="0.01" placeholder="Valor R$" value={newFinancial.amount} onChange={e => setNewFinancial({...newFinancial, amount: e.target.value})} required className="input-tactical" />
                <input type="date" value={newFinancial.due_date} onChange={e => setNewFinancial({...newFinancial, due_date: e.target.value})} className="input-tactical" />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="btn-visitor flex-1">CANCELAR</button>
                  <button type="submit" className="btn-primary flex-1">CRIAR</button>
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
