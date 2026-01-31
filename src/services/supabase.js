import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Supabase não inicializado: variáveis de ambiente ausentes'
  );
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase };

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
