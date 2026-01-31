import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Verificação de segurança no log para você debugar no Vercel
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'AVISO: Variáveis de ambiente do Supabase não encontradas. Verifique o arquivo .env ou as configurações do Vercel.'
  );
}

// Exportamos a instância diretamente. 
// Se as chaves forem undefined, o createClient não quebra o JS, 
// ele apenas retornará erro nas requisições, o que é melhor que uma tela branca.
export const supabase = createClient(
  supabaseUrl || '', 
  supabaseAnonKey || ''
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
