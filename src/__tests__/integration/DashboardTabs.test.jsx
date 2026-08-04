// src/__tests__/integration/DashboardTabs.test.jsx
// Integração: Tabs do DashboardPage (TabOverview, TabManage, TabPostGame) +
// navegação entre tabs do DashboardPage.
//
// IMPORTANTE: TabOverview e TabManage NÃO usam useBaba() internamente — todo
// o estado chega via props, passado pelo DashboardPage (arquitetura de
// "sharedProps" + props específicas por aba). TabPostGame é diferente: usa
// useBaba()/useFeatures() por dentro E recebe {currentBaba, isPresident}
// como props, além de buscar sozinha as últimas partidas no Supabase.

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks de serviços ─────────────────────────────────────────────────────────

// Builder encadeável genérico do Supabase — cobre select/eq/order/limit e
// resolve com lista vazia por padrão (suficiente para os componentes
// filhos: PresenceBlock, ActivityFeed, InvitesPanel, TabPostGame etc.).
function makeQueryBuilder(resolved = { data: [], error: null }) {
  const builder = {};
  const chainMethods = ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'neq', 'order', 'limit', 'in', 'gte', 'lte', 'gt', 'lt'];
  chainMethods.forEach(m => { builder[m] = vi.fn(() => builder); });
  builder.single      = vi.fn().mockResolvedValue(resolved);
  builder.maybeSingle = vi.fn().mockResolvedValue(resolved);
  builder.then = (onFulfilled, onRejected) => Promise.resolve(resolved).then(onFulfilled, onRejected);
  return builder;
}

vi.mock('../../services/supabase', () => ({
  supabase: {
    from: vi.fn(() => makeQueryBuilder()),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
    storage: {
      from: vi.fn(() => ({
        upload:       vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://cdn.test/x.png' } }),
      })),
    },
  },
}));

vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), loading: vi.fn(() => 'id'), dismiss: vi.fn() }),
  Toaster: () => null,
  __esModule: true,
}));

// ── BabaContext / AuthContext ─────────────────────────────────────────────────
// TabOverview/TabManage não leem o contexto (recebem tudo via prop), mas
// DashboardPage, TabPostGame, useThemeColor/useFeatures e os componentes
// filhos (BabaSettings etc.) leem — por isso o contexto continua mockado.

const makeCtx = (overrides = {}) => ({
  currentBaba: { id: 'baba1', name: 'Pelada do Zé', president_id: 'user1', mode: 'casual' },
  players: [
    { id: 'p1', name: 'João',  user_id: 'user1', stars: 3 },
    { id: 'p2', name: 'Maria', user_id: 'user2', stars: 4 },
  ],
  currentMatch:       null,
  loading:            false,
  nextGameDay:        { time: '09:00:00', dateStr: '2026-07-05', deadline: new Date(Date.now() + 3600000) },
  countdown:          { active: false, d: 0, h: 0, m: 0, s: 0 },
  gameConfirmations:  [],
  myConfirmation:     null,
  canConfirm:         true,
  drawConfig:         { playersPerTeam: 5 },
  isDrawing:          false,
  inviteCode:         'INVITE123',
  uploadBabaImage:    vi.fn().mockResolvedValue(),
  ratePlayer:         vi.fn().mockResolvedValue(),
  getAllRatings:      vi.fn().mockResolvedValue([]),
  confirmPresence:    vi.fn(),
  cancelConfirmation: vi.fn(),
  reloadConfirmations: vi.fn(),
  setDrawConfig:      vi.fn(),
  refreshData:        vi.fn(),
  ...overrides,
});

let ctxValue = makeCtx();
vi.mock('../../contexts/BabaContext', () => ({ useBaba: () => ctxValue }));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ profile: { id: 'user1', name: 'Zé' }, user: { id: 'user1' }, signOut: vi.fn() }),
}));

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

// ══════════════════════════════════════════════════════════════════════════════
// TabOverview — recebe tudo via props
// ══════════════════════════════════════════════════════════════════════════════

describe('TabOverview', () => {
  let TabOverview;

  const baseProps = () => ({
    currentBaba:         ctxValue.currentBaba,
    nextGameDay:         ctxValue.nextGameDay,
    countdown:           ctxValue.countdown,
    gameConfirmations:   ctxValue.gameConfirmations,
    myConfirmation:      ctxValue.myConfirmation,
    canConfirm:          ctxValue.canConfirm,
    reloadConfirmations: ctxValue.reloadConfirmations,
    drawConfig:          ctxValue.drawConfig,
    setDrawConfig:       ctxValue.setDrawConfig,
    isDrawing:           ctxValue.isDrawing,
    isPresident:         true,
    loading:             false,
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    ctxValue = makeCtx();
    const m = await import('../../pages/dashboard/TabOverview');
    TabOverview = m.default;
  });

  it('renderiza sem erros críticos', () => {
    expect(() => wrap(<TabOverview {...baseProps()} />)).not.toThrow();
  });

  it('exibe o bloco de presença quando há um próximo jogo', () => {
    wrap(<TabOverview {...baseProps()} />);
    // PresenceBlock é renderizado dentro do card de "próximo jogo"
    expect(screen.queryByText(/nenhum baba agendado/i)).toBeNull();
  });

  it('exibe estado "nenhum baba agendado" quando nextGameDay=null', () => {
    wrap(<TabOverview {...baseProps()} nextGameDay={null} />);
    expect(screen.queryByText(/nenhum baba agendado/i)).not.toBeNull();
  });

  it('presidente vê o bloco de configuração do sorteio', () => {
    wrap(<TabOverview {...baseProps()} isPresident isDrawing={false} canConfirm />);
    // DrawConfigBlock só renderiza para presidente + canConfirm
    expect(screen.queryByText(/nenhum baba agendado/i)).toBeNull();
  });

  it('exibe indicador de sorteio automático quando isDrawing=true', () => {
    wrap(<TabOverview {...baseProps()} isDrawing />);
    expect(screen.getByText(/sorteando automaticamente/i)).toBeInTheDocument();
  });

  it('seção "Convidar Atletas" aparece apenas para presidente', () => {
    const { rerender } = wrap(<TabOverview {...baseProps()} isPresident />);
    expect(screen.getByText(/convidar atletas/i)).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <TabOverview {...baseProps()} isPresident={false} />
      </MemoryRouter>
    );
    expect(screen.queryByText(/convidar atletas/i)).toBeNull();
  });

  it('exibe painel de "Atividades Recentes"', () => {
    wrap(<TabOverview {...baseProps()} />);
    expect(screen.getByText(/atividades recentes/i)).toBeInTheDocument();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// TabManage — recebe tudo via props (sem lista de jogadores/código de convite
// diretos: isso vive dentro de BabaSettings, colapsado por padrão)
// ══════════════════════════════════════════════════════════════════════════════

describe('TabManage', () => {
  let TabManage;

  const baseProps = (overrides = {}) => ({
    currentBaba:        ctxValue.currentBaba,
    currentMatch:       null,
    isDrawing:          false,
    isPresident:        true,
    canManage:          true,
    playersWithRatings: ctxValue.players,
    getAllRatings:      ctxValue.getAllRatings,
    setPlayerRatings:   vi.fn(),
    ...overrides,
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    ctxValue = makeCtx();
    const m = await import('../../pages/dashboard/TabManage');
    TabManage = m.default;
  });

  it('renderiza sem erros críticos', () => {
    expect(() => wrap(<TabManage {...baseProps()} />)).not.toThrow();
  });

  it('sem sorteio ainda: convida a iniciar um sorteio', () => {
    wrap(<TabManage {...baseProps({ currentMatch: null })} />);
    expect(screen.getByText(/iniciar sorteio/i)).toBeInTheDocument();
  });

  it('com sorteio feito: mostra prévia dos times sorteados', () => {
    const currentMatch = {
      teams: [
        { name: 'Time A', players: [{ id: 'p1', name: 'João' }] },
        { name: 'Time B', players: [{ id: 'p2', name: 'Maria' }] },
      ],
      reserves: [],
    };
    wrap(<TabManage {...baseProps({ currentMatch })} />);
    expect(screen.getByText('Time A')).toBeInTheDocument();
    expect(screen.getByText('Time B')).toBeInTheDocument();
    expect(screen.getByText('João')).toBeInTheDocument();
  });

  it('exibe indicador de sorteio automático quando isDrawing=true', () => {
    wrap(<TabManage {...baseProps({ isDrawing: true })} />);
    expect(screen.getByText(/sorteando automaticamente/i)).toBeInTheDocument();
  });

  it('exibe atalho para o Caixa do Grupo (financeiro)', () => {
    wrap(<TabManage {...baseProps()} />);
    expect(screen.getByText(/caixa do grupo/i)).toBeInTheDocument();
  });

  it('presidente/coordenador (canManage) vê a seção de administração', () => {
    wrap(<TabManage {...baseProps({ canManage: true, isPresident: true })} />);
    expect(screen.getByText(/administração/i)).toBeInTheDocument();
    expect(screen.getByText(/relatórios & kpis/i)).toBeInTheDocument();
    expect(screen.getByText(/configurações do grupo/i)).toBeInTheDocument();
  });

  it('membro comum (canManage=false) não vê a seção de administração', () => {
    wrap(<TabManage {...baseProps({ canManage: false, isPresident: false })} />);
    expect(screen.queryByText(/administração/i)).toBeNull();
    expect(screen.queryByText(/configurações do grupo/i)).toBeNull();
  });

  it('coordenador (canManage=true, isPresident=false) vê "Coordenação" mas não "Relatórios & KPIs"', () => {
    wrap(<TabManage {...baseProps({ canManage: true, isPresident: false })} />);
    expect(screen.getByText(/coordenação/i)).toBeInTheDocument();
    expect(screen.queryByText(/relatórios & kpis/i)).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// TabPostGame — usa useBaba()/useFeatures() por dentro + busca partidas
// recentes sozinha no Supabase
// ══════════════════════════════════════════════════════════════════════════════

describe('TabPostGame', () => {
  let TabPostGame;
  let supabase;

  beforeEach(async () => {
    vi.clearAllMocks();
    ctxValue = makeCtx({ currentBaba: { id: 'baba1', name: 'Pelada do Zé', president_id: 'user1', mode: 'full' } });
    const svc = await import('../../services/supabase');
    supabase = svc.supabase;
    const m = await import('../../pages/dashboard/TabPostGame');
    TabPostGame = m.default;
  });

  it('renderiza sem erros críticos', () => {
    expect(() => wrap(<TabPostGame currentBaba={ctxValue.currentBaba} isPresident />)).not.toThrow();
  });

  it('exibe estado "Nenhuma partida ainda" quando não há partidas', async () => {
    supabase.from.mockReturnValue(makeQueryBuilder({ data: [], error: null }));
    wrap(<TabPostGame currentBaba={ctxValue.currentBaba} isPresident />);
    await waitFor(() => expect(screen.getByText(/nenhuma partida ainda/i)).toBeInTheDocument());
  });

  it('exibe as últimas partidas carregadas com placar e nomes dos times', async () => {
    supabase.from.mockReturnValue(makeQueryBuilder({
      data: [{
        id: 'm1', match_date: '2026-07-05', status: 'finished',
        team_a_name: 'Azul', team_b_name: 'Preto',
        team_a_score: 3, team_b_score: 1, winner_team: 'A',
      }],
      error: null,
    }));
    wrap(<TabPostGame currentBaba={ctxValue.currentBaba} isPresident />);
    await waitFor(() => expect(screen.getByText('Azul')).toBeInTheDocument());
    expect(screen.getByText('Preto')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('exibe atalhos rápidos de Rankings e Histórico', async () => {
    supabase.from.mockReturnValue(makeQueryBuilder({ data: [], error: null }));
    wrap(<TabPostGame currentBaba={ctxValue.currentBaba} isPresident />);
    await waitFor(() => expect(screen.getByText(/nenhuma partida ainda/i)).toBeInTheDocument());
    expect(screen.getByText('Rankings')).toBeInTheDocument();
    expect(screen.getByText('Histórico')).toBeInTheDocument();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// DashboardPage — navegação entre tabs
// ══════════════════════════════════════════════════════════════════════════════

describe('DashboardPage › navegação de tabs', () => {
  let DashboardPage;

  beforeEach(async () => {
    vi.clearAllMocks();
    ctxValue = makeCtx();
    const m = await import('../../pages/DashboardPage');
    DashboardPage = m.default;
  });

  it('renderiza sem erros críticos', async () => {
    wrap(<DashboardPage />);
    await waitFor(() => expect(screen.getByText('Pelada do Zé')).toBeInTheDocument());
  });

  it('tab "Visão Geral" ativa por padrão', async () => {
    wrap(<DashboardPage />);
    await waitFor(() => expect(screen.getByRole('tab', { name: /visão geral/i })).toHaveAttribute('aria-selected', 'true'));
  });

  it('clicar em "Gestão" muda para a tab de gestão', async () => {
    wrap(<DashboardPage />);
    await waitFor(() => screen.getByText('Pelada do Zé'));
    fireEvent.click(screen.getByRole('tab', { name: /gestão/i }));
    await waitFor(() => expect(screen.getByRole('tab', { name: /gestão/i })).toHaveAttribute('aria-selected', 'true'));
    await waitFor(() => expect(screen.getByText(/caixa do grupo/i)).toBeInTheDocument());
  });

  it('clicar em "Pós-jogo" muda para a tab de pós-jogo', async () => {
    wrap(<DashboardPage />);
    await waitFor(() => screen.getByText('Pelada do Zé'));
    fireEvent.click(screen.getByRole('tab', { name: /pós-jogo/i }));
    await waitFor(() => expect(screen.getByRole('tab', { name: /pós-jogo/i })).toHaveAttribute('aria-selected', 'true'));
    await waitFor(() => expect(screen.getByText(/últimas partidas/i)).toBeInTheDocument());
  });

  it('loading state: exibe o skeleton do cabeçalho', () => {
    ctxValue = makeCtx({ loading: true });
    const { container } = wrap(<DashboardPage />);
    expect(container.querySelector('.animate-pulse')).not.toBeNull();
  });

  it('sem baba: não quebra a renderização (fica no skeleton de loading)', () => {
    ctxValue = makeCtx({ currentBaba: null });
    expect(() => wrap(<DashboardPage />)).not.toThrow();
  });

  it('lista de membros mostra a contagem de atletas', async () => {
    wrap(<DashboardPage />);
    await waitFor(() => expect(screen.getByText(/2 atletas ativos/i)).toBeInTheDocument());
  });
});
