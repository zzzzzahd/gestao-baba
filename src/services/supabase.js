import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase não configurado: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY ausentes.'
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: localStorage
    }
  }
);

export const TABLES = {
  BABAS: 'babas',
  USERS: 'users',
  PROFILES: 'profiles',
  OFFICIAL_TEAMS: 'official_teams',
  PLAYERS: 'players',
  MATCHES: 'matches',
  MATCH_PLAYERS: 'match_players',
  GOALS: 'goals',
  CARDS: 'cards',
  FINANCIALS: 'financials',
  PAYMENTS: 'payments',
  PRESENCES: 'presences'
};
