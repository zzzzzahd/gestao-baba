import { supabase } from '../lib/supabaseClient'; // ajuste pro caminho real do seu cliente Supabase

// ---------- Loja 1: comprar DP com dinheiro real ----------

export async function fetchDpPackages() {
  const { data, error } = await supabase
    .from('dp_packages')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data;
}

export async function startDpPurchase(packageId) {
  const { data, error } = await supabase.functions.invoke('create-mp-preference', {
    body: { package_id: packageId },
  });
  if (error) throw error;
  return data; // { init_point, sandbox_init_point, preference_id }
}

// ---------- Saldo e extrato ----------

export async function fetchWallet(userId) {
  const { data, error } = await supabase
    .from('dp_wallets')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ?? { balance: 0, lifetime_earned: 0, lifetime_spent: 0 };
}

export async function fetchTransactions(userId, { limit = 30 } = {}) {
  const { data, error } = await supabase
    .from('dp_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

// ---------- Loja 2: gastar DP ----------

export async function fetchStoreItems() {
  const { data, error } = await supabase
    .from('dp_store_items')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data;
}

export async function fetchRedemptions(userId) {
  const { data, error } = await supabase
    .from('dp_redemptions')
    .select('*, dp_store_items(*)')
    .eq('user_id', userId)
    .order('acquired_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function redeemStoreItem(itemId) {
  const { data, error } = await supabase.rpc('redeem_store_item', {
    p_item_id: itemId,
  });
  if (error) throw error;
  return data; // { success, new_balance, redemption_id }
}