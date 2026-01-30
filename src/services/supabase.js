import { createClient } from '@supabase/supabase-js';

// Substitua pelas suas credenciais do Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Tipos de dados
export const TABLES = {
  BABAS: 'babas',
  USERS: 'users',
  PLAYERS: 'players',
  MATCHES: 'matches',
  MATCH_PLAYERS: 'match_players',
  GOALS: 'goals',
  CARDS: 'cards',
  FINANCIALS: 'financials',
  PAYMENTS: 'payments',
  PRESENCES: 'presences'
};
