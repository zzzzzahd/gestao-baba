// src/services/babaService.js
// Camada de acesso ao banco para operações de babas.
// Centraliza todas as queries Supabase relacionadas a babas,
// eliminando duplicação entre BabaContext, DashboardPage e BabaSettings.

import { supabase } from './supabase';

// ─── Leitura ────────────────────────────────────────────────────────────────

export const fetchBabasByPresident = async (userId) => {
  const { data, error } = await supabase
    .from('babas')
    .select('*')
    .eq('president_id', userId);
  if (error) throw error;
  return data || [];
};

export const fetchBabasByMember = async (userId) => {
  const { data: playerRows, error: playerErr } = await supabase
    .from('players')
    .select('baba_id')
    .eq('user_id', userId);
  if (playerErr) throw playerErr;
  if (!playerRows?.length) return [];

  const { data, error } = await supabase
    .from('babas')
    .select('*')
    .in('id', playerRows.map(r => r.baba_id));
  if (error) throw error;
  return data || [];
};

export const fetchAllUserBabas = async (userId) => {
  const [presidentBabas, memberBabas] = await Promise.all([
    fetchBabasByPresident(userId),
    fetchBabasByMember(userId),
  ]);
  const map = new Map();
  [...presidentBabas, ...memberBabas].forEach(b => map.set(b.id, b));
  return Array.from(map.values());
};

export const fetchBabaById = async (babaId) => {
  const { data, error } = await supabase
    .from('babas')
    .select('*')
    .eq('id', babaId)
    .single();
  if (error) throw error;
  return data;
};

export const fetchBabaByInviteCode = async (code) => {
  const { data, error } = await supabase
    .from('babas')
    .select('*')
    .eq('invite_code', code.trim().toUpperCase())
    .maybeSingle();
  if (error) throw error;
  return data;
};

// ─── Escrita ─────────────────────────────────────────────────────────────────

export const insertBaba = async (payload) => {
  const { data, error } = await supabase
    .from('babas')
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateBaba = async (babaId, updates) => {
  const { data, error } = await supabase
    .from('babas')
    .update(updates)
    .eq('id', babaId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
};

export const deleteBaba = async (babaId) => {
  const { error } = await supabase
    .from('babas')
    .delete()
    .eq('id', babaId);
  if (error) throw error;
};

export const updateBabaImage = async (babaId, field, publicUrl) => {
  const { data, error } = await supabase
    .from('babas')
    .update({ [field]: publicUrl })
    .eq('id', babaId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
};

export const updateInviteCode = async (babaId, newCode, expiresAt) => {
  const { data, error } = await supabase
    .from('babas')
    .update({ invite_code: newCode, invite_expires_at: expiresAt })
    .eq('id', babaId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
};

// ─── Jogadores ───────────────────────────────────────────────────────────────

export const fetchPlayers = async (babaId) => {
  const { data, error } = await supabase
    .from('players')
    .select('*, profile:profiles(avatar_url, name)')
    .eq('baba_id', babaId)
    .order('name');
  if (error) throw error;
  return (data || []).map(p => ({
    ...p,
    avatar_url:   p.profile?.avatar_url || null,
    display_name: p.name || p.profile?.name || 'Jogador',
  }));
};

export const insertPlayer = async (payload) => {
  const { error } = await supabase
    .from('players')
    .upsert([payload], { onConflict: 'baba_id,user_id' });
  if (error) throw error;
};

export const updatePlayer = async (playerId, babaId, updates) => {
  const { error } = await supabase
    .from('players')
    .update(updates)
    .eq('id', playerId)
    .eq('baba_id', babaId);
  if (error) throw error;
};

// ─── Upload de imagem ────────────────────────────────────────────────────────

export const uploadBabaImageToStorage = async (file, babaId, type) => {
  const ext  = file.name.split('.').pop()?.toLowerCase() || 'png';
  const path = `babas/${babaId}/${type}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('baba-images')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from('baba-images').getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
};
