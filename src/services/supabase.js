import { createClient } from '@supabase/supabase-js';

// As variáveis de ambiente são carregadas automaticamente pelo Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Se as variáveis não existirem, o cliente não será criado corretamente, 
// o que causaria a tela branca. Adicionei uma proteção simples aqui.
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("ERRO: Variáveis de ambiente do Supabase não encontradas!");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Lista atualizada com TODAS as tabelas que vi no seu print do Supabase
export const TABLES = {
  BABAS: 'babas',
  USERS: 'users',
  PROFILES: 'profiles',         // Adicionado conforme seu print
  OFFICIAL_TEAMS: 'official_teams', // Adicionado conforme seu print
  PLAYERS: 'players',
  MATCHES: 'matches',
  MATCH_PLAYERS: 'match_players',
  GOALS: 'goals',
  CARDS: 'cards',
  FINANCIALS: 'financials',
  PAYMENTS: 'payments',
  PRESENCES: 'presences'
};

