import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBaba } from '../contexts/BabaContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase, TABLES } from '../services/supabase';
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
      console.error('Erro ao carregar financeiro:', error);
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
      setNewFinancial({
        title: '',
        description: '',
        amount: '',
        due_date: ''
      });
      loadFinancials();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao criar cobrança');
    }
  };

  const markAsPaid = async (financialId) => {
    try {
      // Busca ID do jogador atual
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

      // Busca financial para pegar o valor
      const financial = financials.find(f => f.id === financialId);
      if (!financial) return;

      // Cria ou atualiza pagamento
      const { error } = await supabase
        .from(TABLES.PAYMENTS)
        .upsert([{
          financial_id: financialId,
          player_id: player.id,
          amount: financial.amount,
          status: 'pending',
          paid_at: new Date().toISOString()
        }], {
          onConflict: 'financial_id,player_id'
        });

      if (error) throw error;

      toast.success('Pagamento marcado! Aguarde confirmação do presidente.');
      loadFinancials();
    } catch (error) {
      console.error(error);
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
      console.error(error);
      toast.error('Erro ao confirmar pagamento');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <i className="fas fa-spinner fa-spin text-4xl text-cyan-electric"></i>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-5">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/home')}
            className="text-cyan-electric hover:text-white transition-colors"
          >
            <i className="fas fa-arrow-left text-xl mr-3"></i>
            {currentBaba?.name}
          </button>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold text-center mb-8 text-green-neon">
          <i className="fas fa-dollar-sign mr-3"></i>
          FINANCEIRO
        </h1>

        {/* PIX Info */}
        {currentBaba.pix_key && (
          <div className="card-glass p-6 mb-6 animate-slide-in">
            <p className="text-xs text-green-neon font-bold mb-2 uppercase">
              Chave PIX do Baba:
            </p>
            <div className="flex items-center justify-between bg-white/5 p-4 rounded-lg">
              <span className="font-mono">{currentBaba.pix_key}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(currentBaba.pix_key);
                  toast.success('Chave PIX copiada!');
                }}
                className="text-cyan-electric hover:text-white transition-colors"
              >
                <i className="fas fa-copy"></i>
              </button>
            </div>
          </div>
        )}

        {/* Create Button */}
        {isPresident && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary mb-6"
          >
            <i className="fas fa-plus mr-2"></i>
            NOVA COBRANÇA
          </button>
        )}

        {/* Financials List */}
        {financials.length > 0 ? (
          <div className="space-y-4">
            {financials.map((financial) => (
              <div key={financial.id} className="card-glass p-6 animate-slide-in">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-1">{financial.title}</h3>
                    {financial.description && (
                      <p className="text-sm opacity-60 mb-2">{financial.description}</p>
                    )}
                    {financial.due_date && (
                      <p className="text-xs text-cyan-electric">
                        <i className="fas fa-calendar mr-1"></i>
                        Vencimento: {new Date(financial.due_date).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                  
                  <div className="text-right">
                    <p className="text-3xl font-bold text-green-neon">
                      R$ {financial.amount.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Payment Status */}
                <div className="border-t border-white/10 pt-4 mt-4">
                  <p className="text-xs opacity-60 mb-2">
                    Pagamentos: {financial.payments?.filter(p => p.status === 'confirmed').length || 0} confirmados
                  </p>

                  {!isPresident ? (
                    <button
                      onClick={() => markAsPaid(financial.id)}
                      className="btn-secondary"
                    >
                      <i className="fas fa-check mr-2"></i>
                      JÁ PAGUEI
                    </button>
                  ) : (
                    financial.payments?.filter(p => p.status === 'pending').length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-green-neon font-bold uppercase mb-2">
                          Aguardando confirmação:
                        </p>
                        {financial.payments
                          .filter(p => p.status === 'pending')
                          .map((payment) => (
                            <div
                              key={payment.id}
                              className="flex items-center justify-between bg-white/5 p-3 rounded-lg"
                            >
                              <span className="text-sm">Pagamento pendente</span>
                              <button
                                onClick={() => confirmPayment(payment.id)}
                                className="text-green-neon hover:text-white transition-colors"
                              >
                                <i className="fas fa-check-circle text-xl"></i>
                              </button>
                            </div>
                          ))}
                      </div>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card-glass p-12 text-center">
            <i className="fas fa-wallet text-6xl text-green-neon/30 mb-4"></i>
            <p className="text-lg opacity-60">
              Nenhuma cobrança criada ainda
            </p>
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-5 z-50 animate-fade-in">
            <div className="card-glass p-6 max-w-md w-full animate-slide-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-green-neon">
                  NOVA COBRANÇA
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-2xl hover:text-red-500 transition-colors"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <form onSubmit={createFinancial} className="space-y-4">
                <div>
                  <label className="block text-sm mb-2 opacity-60">
                    Título
                  </label>
                  <input
                    type="text"
                    value={newFinancial.title}
                    onChange={(e) => setNewFinancial({ ...newFinancial, title: e.target.value })}
                    placeholder="Ex: Mensalidade Maio"
                    required
                    className="input-tactical"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2 opacity-60">
                    Descrição (opcional)
                  </label>
                  <textarea
                    value={newFinancial.description}
                    onChange={(e) => setNewFinancial({ ...newFinancial, description: e.target.value })}
                    placeholder="Detalhes da cobrança..."
                    rows="3"
                    className="input-tactical"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2 opacity-60">
                    Valor (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newFinancial.amount}
                    onChange={(e) => setNewFinancial({ ...newFinancial, amount: e.target.value })}
                    placeholder="0.00"
                    required
                    className="input-tactical"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2 opacity-60">
                    Vencimento (opcional)
                  </label>
                  <input
                    type="date"
                    value={newFinancial.due_date}
                    onChange={(e) => setNewFinancial({ ...newFinancial, due_date: e.target.value })}
                    className="input-tactical"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="btn-visitor flex-1"
                  >
                    CANCELAR
                  </button>
                  <button type="submit" className="btn-primary flex-1">
                    CRIAR
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
