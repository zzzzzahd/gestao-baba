import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBaba } from '../contexts/BabaContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { 
  ArrowLeft, DollarSign, Copy, Plus, 
  CheckCircle, Clock, X, Loader2, Trash2, Camera, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';

const FinancialPage = () => {
  const navigate = useNavigate();
  const { currentBaba } = useBaba();
  const { user } = useAuth();
  
  const [financials, setFinancials] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isPresident, setIsPresident] = useState(false);
  const [pixKey, setPixKey] = useState(currentBaba?.pix_key || '');

  const BUCKET_NAME = 'payment-proofs'; // Certifique-se de criar este bucket no Supabase

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
      toast.error('Erro ao carrergar dados');
    } finally {
      setLoading(false);
    }
  };

  const updatePixKey = async () => {
    try {
      const { error } = await supabase
        .from('babas')
        .update({ pix_key: pixKey })
        .eq('id', currentBaba.id);
      if (error) throw error;
      toast.success('Chave PIX salva!');
    } catch (error) {
      toast.error('Erro ao salvar PIX');
    }
  };

  const handleUploadProof = async (e, financialId) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      
      // 1. Pegar ID do Player
      const { data: player } = await supabase
        .from('players')
        .select('id')
        .eq('baba_id', currentBaba.id)
        .eq('user_id', user.id)
        .single();

      // 2. Upload para Storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${currentBaba.id}/${financialId}_${player.id}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      // 3. Upsert no banco
      const { error } = await supabase
        .from('payments')
        .upsert([{
          financial_id: financialId,
          player_id: player.id,
          amount: financials.find(f => f.id === financialId).amount,
          status: 'pending',
          proof_url: publicUrl,
          paid_at: new Date().toISOString()
        }], { onConflict: 'financial_id,player_id' });

      if (error) throw error;
      toast.success('Comprovante enviado!');
      loadFinancials();
    } catch (error) {
      toast.error('Erro no upload');
    } finally {
      setUploading(false);
    }
  };

  const confirmPayment = async (payment) => {
    try {
      // Regra de Limpeza: Excluir arquivo do storage após confirmar
      if (payment.proof_url) {
        const path = payment.proof_url.split(`${BUCKET_NAME}/`)[1];
        await supabase.storage.from(BUCKET_NAME).remove([path]);
      }

      const { error } = await supabase
        .from('payments')
        .update({ 
          status: 'confirmed', 
          confirmed_at: new Date().toISOString(),
          confirmed_by: user.id,
          proof_url: null // Limpa a URL pois o arquivo foi deletado
        })
        .eq('id', payment.id);

      if (error) throw error;
      toast.success('Pagamento Confirmado!');
      loadFinancials();
    } catch (error) {
      toast.error('Erro na confirmação');
    }
  };

  const deleteFinancial = async (id) => {
    if (!window.confirm("Apagar esta cobrança?")) return;
    await supabase.from('financials').delete().eq('id', id);
    loadFinancials();
  };

  return (
    <div className="min-h-screen p-6 bg-black text-white font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* Header com Config PIX */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <button onClick={() => navigate('/home')} className="flex items-center gap-2 text-xs font-black uppercase opacity-50"><ArrowLeft size={16}/> Voltar</button>
          
          {isPresident && (
            <div className="flex bg-white/5 border border-white/10 p-2 rounded-2xl items-center gap-3">
              <input 
                className="bg-transparent text-[10px] font-bold px-2 outline-none w-40" 
                placeholder="SUA CHAVE PIX"
                value={pixKey}
                onChange={e => setPixKey(e.target.value)}
              />
              <button onClick={updatePixKey} className="bg-green-500 text-black p-2 rounded-xl hover:scale-105 transition-all">
                <CheckCircle size={14} strokeWidth={3} />
              </button>
            </div>
          )}
        </div>

        <h1 className="text-4xl font-black mb-10 italic uppercase tracking-tighter">Financeiro<span className="text-green-500">.</span></h1>

        {isPresident && (
          <button onClick={() => setShowCreateModal(true)} className="w-full py-5 bg-green-500 text-black font-black uppercase text-xs tracking-widest rounded-2xl mb-10 flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
            <Plus size={18} /> Nova Cobrança
          </button>
        )}

        <div className="space-y-8">
          {financials.map(f => (
            <div key={f.id} className="card-glass p-8 rounded-[2rem] border border-white/5 relative overflow-hidden">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-xl font-black italic uppercase tracking-tighter">{f.title}</h3>
                    {isPresident && <button onClick={() => deleteFinancial(f.id)} className="text-red-500/20 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>}
                  </div>
                  <p className="text-[10px] font-black text-yellow-500 uppercase">Vencimento: {f.due_date ? new Date(f.due_date).toLocaleDateString() : 'Sem data'}</p>
                </div>
                <p className="text-3xl font-black text-green-500 tracking-tighter">R$ {parseFloat(f.amount).toFixed(2)}</p>
              </div>

              {/* Área de Ações */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-white/5">
                {/* Minha Situação */}
                <div>
                  <p className="text-[9px] font-black uppercase opacity-30 mb-4">Minha Situação</p>
                  <label className="relative flex items-center justify-center w-full py-4 rounded-xl border border-green-500/30 text-green-500 font-black text-[10px] uppercase cursor-pointer hover:bg-green-500/10 transition-all">
                    {uploading ? <Loader2 className="animate-spin" size={16}/> : (
                      <>
                        <Camera size={14} className="mr-2" />
                        Enviar Comprovante
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadProof(e, f.id)} />
                      </>
                    )}
                  </label>
                </div>

                {/* Validação (Apenas Presidente) */}
                {isPresident && (
                  <div>
                    <p className="text-[9px] font-black uppercase opacity-30 mb-4">Aguardando Aprovação ({f.payments?.filter(p => p.status === 'pending').length})</p>
                    <div className="space-y-2">
                      {f.payments?.filter(p => p.status === 'pending').map(p => (
                        <div key={p.id} className="bg-white/5 p-3 rounded-xl flex items-center justify-between border border-white/5">
                          <span className="text-[9px] font-black uppercase">{p.player?.name}</span>
                          <div className="flex items-center gap-2">
                            {p.proof_url && <a href={p.proof_url} target="_blank" className="p-2 text-white/40 hover:text-white"><Eye size={16}/></a>}
                            <button onClick={() => confirmPayment(p)} className="bg-green-500 text-black px-3 py-1.5 rounded-lg text-[9px] font-black uppercase">Confirmar</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Lista de quem já pagou */}
              <div className="mt-8 flex flex-wrap gap-2">
                {f.payments?.filter(p => p.status === 'confirmed').map(p => (
                  <div key={p.id} className="bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-full flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span className="text-[8px] font-black uppercase opacity-60">{p.player?.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* O modal de criação de cobrança permanece o mesmo do passo anterior */}
    </div>
  );
};

export default FinancialPage;
