import { useState, useEffect, useCallback } from 'react';
import { Coins, Sparkles, Crown, Loader2, ShoppingBag, History } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext'; // ajuste se o hook/caminho for outro
import {
  fetchDpPackages,
  fetchStoreItems,
  fetchWallet,
  fetchTransactions,
  startDpPurchase,
  redeemStoreItem,
} from '../services/dpStore';

const CATEGORY_LABELS = {
  assinatura: 'Assinatura',
  moldura: 'Moldura de perfil',
  emoji: 'Emoji exclusivo',
  tema: 'Tema',
  badge: 'Badge',
};

export default function DpStorePage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('comprar'); // 'comprar' | 'gastar' | 'extrato'
  const [wallet, setWallet] = useState({ balance: 0, lifetime_earned: 0, lifetime_spent: 0 });
  const [packages, setPackages] = useState([]);
  const [items, setItems] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);

  const loadAll = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [w, pkgs, storeItems, tx] = await Promise.all([
        fetchWallet(user.id),
        fetchDpPackages(),
        fetchStoreItems(),
        fetchTransactions(user.id),
      ]);
      setWallet(w);
      setPackages(pkgs);
      setItems(storeItems);
      setTransactions(tx);
    } catch (err) {
      setError('Não foi possível carregar a loja. Tenta de novo em alguns segundos.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function handleBuyPackage(pkg) {
    setBusyId(pkg.id);
    setError(null);
    try {
      const { init_point, sandbox_init_point } = await startDpPurchase(pkg.id);
      window.location.href = init_point || sandbox_init_point;
    } catch (err) {
      setError('Não deu pra iniciar o pagamento. Tenta de novo.');
      setBusyId(null);
    }
  }

  async function handleRedeem(item) {
    setBusyId(item.id);
    setError(null);
    try {
      await redeemStoreItem(item.id);
      await loadAll();
    } catch (err) {
      const msg = err?.message?.includes('insufficient balance')
        ? 'Saldo de DP insuficiente pra esse item.'
        : 'Não deu pra resgatar esse item agora.';
      setError(msg);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-screen bg-surface-0 pb-24">
      <div className="sticky top-0 z-10 bg-surface-0/95 backdrop-blur border-b border-surface-2 px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-text-primary">Loja DP</h1>
          <div className="flex items-center gap-1.5 rounded-full bg-surface-1 border border-cyan-electric/30 px-3 py-1.5">
            <Coins size={16} className="text-cyan-electric" />
            <span className="font-semibold text-text-primary">{wallet.balance}</span>
            <span className="text-xs text-text-secondary">DP</span>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <TabButton active={tab === 'comprar'} onClick={() => setTab('comprar')} icon={Coins} label="Comprar DP" />
          <TabButton active={tab === 'gastar'} onClick={() => setTab('gastar')} icon={ShoppingBag} label="Loja de Itens" />
          <TabButton active={tab === 'extrato'} onClick={() => setTab('extrato')} icon={History} label="Extrato" />
        </div>
      </div>

      <div className="px-4 py-4">
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-cyan-electric" size={28} />
          </div>
        ) : (
          <>
            {tab === 'comprar' && (
              <div className="grid grid-cols-1 gap-3">
                {packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="flex items-center justify-between rounded-2xl border border-surface-2 bg-surface-1 p-4"
                  >
                    <div>
                      <p className="font-semibold text-text-primary">
                        {pkg.dp_amount} DP
                        {pkg.bonus_dp > 0 && (
                          <span className="ml-1.5 text-xs font-medium text-cyan-electric">
                            +{pkg.bonus_dp} bônus
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-text-secondary">
                        R$ {Number(pkg.price_brl).toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleBuyPackage(pkg)}
                      disabled={busyId === pkg.id}
                      className="rounded-xl bg-cyan-electric px-4 py-2 text-sm font-semibold text-surface-0 disabled:opacity-60"
                    >
                      {busyId === pkg.id ? <Loader2 className="animate-spin" size={16} /> : 'Comprar'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {tab === 'gastar' && (
              <div className="grid grid-cols-1 gap-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-2xl border border-surface-2 bg-surface-1 p-4"
                  >
                    <div className="pr-3">
                      <p className="flex items-center gap-1.5 font-semibold text-text-primary">
                        {item.category === 'assinatura' && <Crown size={14} className="text-yellow-400" />}
                        {item.category === 'moldura' && <Sparkles size={14} className="text-cyan-electric" />}
                        {item.name}
                      </p>
                      <p className="text-xs text-text-secondary">{CATEGORY_LABELS[item.category]}</p>
                      {item.description && (
                        <p className="mt-1 text-sm text-text-secondary">{item.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRedeem(item)}
                      disabled={busyId === item.id || wallet.balance < item.dp_cost}
                      className="flex shrink-0 items-center gap-1 rounded-xl bg-surface-2 px-3 py-2 text-sm font-semibold text-text-primary disabled:opacity-40"
                    >
                      {busyId === item.id ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <>
                          <Coins size={14} className="text-cyan-electric" />
                          {item.dp_cost}
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {tab === 'extrato' && (
              <div className="flex flex-col gap-2">
                {transactions.length === 0 && (
                  <p className="py-8 text-center text-sm text-text-secondary">
                    Nenhuma movimentação ainda.
                  </p>
                )}
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between rounded-xl border border-surface-2 bg-surface-1 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm text-text-primary">{tx.description || tx.type}</p>
                      <p className="text-xs text-text-secondary">
                        {new Date(tx.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <span className={`font-semibold ${tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {tx.amount > 0 ? '+' : ''}
                      {tx.amount}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
        active ? 'bg-cyan-electric text-surface-0' : 'bg-surface-1 text-text-secondary'
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}