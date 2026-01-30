-- =============================================
-- SCHEMA DO SUPABASE PARA GESTÃO DE BABA
-- =============================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABELA: users (perfil estendido do auth.users)
-- =============================================
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- =============================================
-- TABELA: babas (grupos de pelada)
-- =============================================
CREATE TABLE public.babas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  president_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  coordinators UUID[] DEFAULT '{}',
  modality TEXT NOT NULL CHECK (modality IN ('futsal', 'society')),
  is_private BOOLEAN DEFAULT false,
  game_days INTEGER[] DEFAULT '{}', -- 0=Domingo, 1=Segunda, etc
  game_time TIME NOT NULL,
  match_duration INTEGER DEFAULT 10, -- minutos
  pix_key TEXT,
  invite_code TEXT UNIQUE,
  winner_photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_babas_president ON public.babas(president_id);
CREATE INDEX idx_babas_invite_code ON public.babas(invite_code);

-- RLS para babas
ALTER TABLE public.babas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public babas"
  ON public.babas FOR SELECT
  USING (is_private = false OR president_id = auth.uid() OR auth.uid() = ANY(coordinators));

CREATE POLICY "President can manage baba"
  ON public.babas FOR ALL
  USING (president_id = auth.uid());

-- =============================================
-- TABELA: players (jogadores em cada baba)
-- =============================================
CREATE TABLE public.players (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  baba_id UUID REFERENCES public.babas(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position TEXT CHECK (position IN ('goleiro', 'linha')) DEFAULT 'linha',
  is_suspended BOOLEAN DEFAULT false,
  suspension_until DATE,
  total_goals_month INTEGER DEFAULT 0,
  total_assists_month INTEGER DEFAULT 0,
  total_goals_year INTEGER DEFAULT 0,
  total_assists_year INTEGER DEFAULT 0,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_players_baba ON public.players(baba_id);
CREATE INDEX idx_players_user ON public.players(user_id);

-- RLS para players
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view baba members"
  ON public.players FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.babas b
      WHERE b.id = baba_id
      AND (b.is_private = false OR b.president_id = auth.uid() OR auth.uid() = ANY(b.coordinators))
    )
  );

-- =============================================
-- TABELA: matches (partidas realizadas)
-- =============================================
CREATE TABLE public.matches (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  baba_id UUID REFERENCES public.babas(id) ON DELETE CASCADE NOT NULL,
  match_date TIMESTAMP WITH TIME ZONE NOT NULL,
  team_a_name TEXT NOT NULL,
  team_b_name TEXT NOT NULL,
  team_a_score INTEGER DEFAULT 0,
  team_b_score INTEGER DEFAULT 0,
  winner_team TEXT, -- 'a', 'b', ou NULL para empate
  status TEXT CHECK (status IN ('scheduled', 'in_progress', 'finished')) DEFAULT 'scheduled',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  finished_at TIMESTAMP WITH TIME ZONE
);

-- Índices
CREATE INDEX idx_matches_baba ON public.matches(baba_id);
CREATE INDEX idx_matches_date ON public.matches(match_date);

-- RLS para matches
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view baba matches"
  ON public.matches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.babas b
      WHERE b.id = baba_id
      AND (b.is_private = false OR b.president_id = auth.uid())
    )
  );

-- =============================================
-- TABELA: match_players (jogadores em cada partida)
-- =============================================
CREATE TABLE public.match_players (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
  team TEXT CHECK (team IN ('a', 'b')) NOT NULL,
  position TEXT CHECK (position IN ('goleiro', 'linha')) NOT NULL
);

-- Índices
CREATE INDEX idx_match_players_match ON public.match_players(match_id);
CREATE INDEX idx_match_players_player ON public.match_players(player_id);

-- RLS para match_players
ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view match players"
  ON public.match_players FOR SELECT
  USING (true);

-- =============================================
-- TABELA: goals (gols marcados)
-- =============================================
CREATE TABLE public.goals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
  assisted_by UUID REFERENCES public.players(id) ON DELETE SET NULL,
  team TEXT CHECK (team IN ('a', 'b')) NOT NULL,
  scored_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_goals_match ON public.goals(match_id);
CREATE INDEX idx_goals_player ON public.goals(player_id);

-- RLS para goals
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view goals"
  ON public.goals FOR SELECT
  USING (true);

-- =============================================
-- TABELA: cards (cartões disciplinares)
-- =============================================
CREATE TABLE public.cards (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
  card_type TEXT CHECK (card_type IN ('yellow', 'blue', 'red')) NOT NULL,
  reason TEXT,
  given_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_cards_match ON public.cards(match_id);
CREATE INDEX idx_cards_player ON public.cards(player_id);

-- RLS para cards
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view cards"
  ON public.cards FOR SELECT
  USING (true);

-- =============================================
-- TABELA: presences (confirmações de presença)
-- =============================================
CREATE TABLE public.presences (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
  confirmed BOOLEAN DEFAULT false,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  showed_up BOOLEAN DEFAULT NULL,
  UNIQUE(match_id, player_id)
);

-- Índices
CREATE INDEX idx_presences_match ON public.presences(match_id);
CREATE INDEX idx_presences_player ON public.presences(player_id);

-- RLS para presences
ALTER TABLE public.presences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can manage own presence"
  ON public.presences FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.players p
      WHERE p.id = player_id
      AND p.user_id = auth.uid()
    )
  );

-- =============================================
-- TABELA: financials (itens de cobrança)
-- =============================================
CREATE TABLE public.financials (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  baba_id UUID REFERENCES public.babas(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  due_date DATE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_financials_baba ON public.financials(baba_id);

-- RLS para financials
ALTER TABLE public.financials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view baba financials"
  ON public.financials FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.players p
      WHERE p.baba_id = financials.baba_id
      AND p.user_id = auth.uid()
    )
  );

-- =============================================
-- TABELA: payments (pagamentos realizados)
-- =============================================
CREATE TABLE public.payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  financial_id UUID REFERENCES public.financials(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'confirmed', 'rejected')) DEFAULT 'pending',
  paid_at TIMESTAMP WITH TIME ZONE,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  confirmed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  UNIQUE(financial_id, player_id)
);

-- Índices
CREATE INDEX idx_payments_financial ON public.payments(financial_id);
CREATE INDEX idx_payments_player ON public.payments(player_id);

-- RLS para payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can manage own payments"
  ON public.payments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.players p
      WHERE p.id = player_id
      AND p.user_id = auth.uid()
    )
  );

-- =============================================
-- FUNCTIONS E TRIGGERS
-- =============================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers de updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_babas_updated_at BEFORE UPDATE ON public.babas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para gerar código de convite único
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger para gerar código de convite automaticamente
CREATE OR REPLACE FUNCTION set_invite_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invite_code IS NULL THEN
    NEW.invite_code := generate_invite_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_baba_invite_code BEFORE INSERT ON public.babas
  FOR EACH ROW EXECUTE FUNCTION set_invite_code();

-- Função para atualizar estatísticas mensais (resetar todo dia 1)
CREATE OR REPLACE FUNCTION reset_monthly_stats()
RETURNS void AS $$
BEGIN
  UPDATE public.players
  SET total_goals_month = 0, total_assists_month = 0
  WHERE EXTRACT(DAY FROM NOW()) = 1;
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar estatísticas anuais (resetar todo 1º de janeiro)
CREATE OR REPLACE FUNCTION reset_yearly_stats()
RETURNS void AS $$
BEGIN
  UPDATE public.players
  SET total_goals_year = 0, total_assists_year = 0
  WHERE EXTRACT(MONTH FROM NOW()) = 1 AND EXTRACT(DAY FROM NOW()) = 1;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- INSERÇÃO DE DADOS DE EXEMPLO (OPCIONAL)
-- =============================================

-- Você pode descomentar e adaptar conforme necessário
/*
INSERT INTO public.users (id, name, avatar_url) VALUES
  ('user-uuid-1', 'João Silva', NULL),
  ('user-uuid-2', 'Maria Santos', NULL);

INSERT INTO public.babas (name, president_id, modality, game_time) VALUES
  ('Baba da Galera', 'user-uuid-1', 'futsal', '20:00');
*/
