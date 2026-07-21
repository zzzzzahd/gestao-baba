// src/__tests__/integration/financialFlow.test.jsx
// Testes de integração — FinancialPage (carregar, criar, excluir, aprovar)

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../contexts/BabaContext', () => ({ useBaba: vi.fn() }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../services/supabase', () => ({ supabase: { from: vi.fn(), storage: { from: vi.fn() } } }));
vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));
vi.mock('../../components/SkeletonLoader', () => ({
  PageSkeleton: () => <div data-testid="skeleton">Loading...</div>,
}));
vi.mock('../../utils/constants', () => ({
  CYAN_GRADIENT: { background: 'linear-gradient(#00f2ff, #0066ff)' },
}));
vi.mock('../../utils/securityUtils', () => ({
  maskPix: (key) => key ? `****${key.slice(-4)}` : '—',
}));

import FinancialPage from '../../pages/FinancialPage';
import { useBaba }   from '../../contexts/BabaContext';
import { useAuth }   from '../../contexts/AuthContext';
import { supabase }  from '../../services/supabase';
import toast         from 'react-hot-toast';

// ─── Dados de teste ───────────────────────────────────────────────────────────
const BABA = { id: 'baba-1', name: 'Baba do Zé', president_id: 'user-1' };
const USER_PRESIDENT = { id: 'user-1' };
const USER_MEMBER    = { id: 'user-2' };

const makeFinancial = (overrides = {}) => ({
  id:          'fin-1',
  title:       'MENSALIDADE JUNHO',
  description: 'Taxa mensal',
  amount:      '50.00',
  due_date:    '2025-06-30',
  pix_key:     '11999991234',
  status:      'active',
  baba_id:     'baba-1',
  payments:    [],
  ...overrides,
});

const makePayment = (overrides = {}) => ({
  id:        'pay-1',
  status:    'pending',
  amount:    '50.00',
  proof_url: 'https://cdn.test/proof.jpg',
  player_id: 'p-2',
  player:    { name: 'João', user_id: 'user-2' },
  ...overrides,
});

const setupMocks = ({ financials = [], user = USER_PRESIDENT } = {}) => {
  useBaba.mockReturnValue({ currentBaba: BABA });
  useAuth.mockReturnValue({ user });

  const chain = {
    select:  vi.fn().mockReturnThis(),
    eq:      vi.fn().mockReturnThis(),
    order:   vi.fn().mockResolvedValue({ data: financials, error: null }),
    update:  vi.fn().mockReturnThis(),
    insert:  vi.fn().mockReturnThis(),
    delete:  vi.fn().mockReturnThis(),
    upsert:  vi.fn().mockReturnThis(),
    single:  vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  supabase.from.mockReturnValue(chain);
  supabase.storage.from.mockReturnValue({
    upload:       vi.fn().mockResolvedValue({ error: null }),
    getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://cdn.test/proof.jpg' } }),
  });
  return chain;
};

const renderPage = () =>
  render(<MemoryRouter><FinancialPage /></MemoryRouter>);

// ─── Testes ───────────────────────────────────────────────────────────────────

describe('FinancialPage — carregamento', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('exibe skeleton durante carregamento', () => {
    useBaba.mockReturnValue({ currentBaba: BABA });
    useAuth.mockReturnValue({ user: USER_PRESIDENT });
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      order:  vi.fn().mockReturnValue(new Promise(() => {})),
    });
    renderPage();
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });

  it('redireciona para /home quando não há baba', async () => {
    useBaba.mockReturnValue({ currentBaba: null });
    useAuth.mockReturnValue({ user: USER_PRESIDENT });
    renderPage();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/home'));
  });

  it('exibe título "Financeiro"', async () => {
    setupMocks();
    renderPage();
    await waitFor(() => expect(screen.getByText('Financeiro.')).toBeInTheDocument());
  });

  it('exibe lista vazia quando não há cobranças', async () => {
    setupMocks({ financials: [] });
    renderPage();
    await waitFor(() => expect(screen.getByText('Financeiro.')).toBeInTheDocument());
    expect(screen.queryByText('MENSALIDADE JUNHO')).toBeNull();
  });

  it('exibe cobranças carregadas', async () => {
    setupMocks({ financials: [makeFinancial()] });
    renderPage();
    await waitFor(() => expect(screen.getByText('MENSALIDADE JUNHO')).toBeInTheDocument());
  });

  it('toast.error quando loadFinancials falha', async () => {
    useBaba.mockReturnValue({ currentBaba: BABA });
    useAuth.mockReturnValue({ user: USER_PRESIDENT });
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      order:  vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
    });
    renderPage();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Erro ao carregar dados'));
  });
});

describe('FinancialPage — exibição de cobrança', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('exibe valor formatado em R$', async () => {
    setupMocks({ financials: [makeFinancial()] });
    renderPage();
    await waitFor(() => expect(screen.getByText('R$ 50.00')).toBeInTheDocument());
  });

  it('exibe chave PIX mascarada', async () => {
    setupMocks({ financials: [makeFinancial()] });
    renderPage();
    await waitFor(() => expect(screen.getByText('PIX: ****1234')).toBeInTheDocument());
  });

  it('exibe badge "Encerrada" para cobrança fechada', async () => {
    setupMocks({ financials: [makeFinancial({ status: 'closed' })] });
    renderPage();
    await waitFor(() => expect(screen.getByText('Encerrada')).toBeInTheDocument());
  });

  it('exibe botão "Pagar Agora" quando membro não pagou', async () => {
    setupMocks({ financials: [makeFinancial()], user: USER_MEMBER });
    renderPage();
    await waitFor(() => expect(screen.getByText('Pagar Agora')).toBeInTheDocument());
  });

  it('exibe status "Aguardando Aprovação" quando pagamento está pendente', async () => {
    const fin = makeFinancial({
      payments: [makePayment({ player: { name: 'Eu', user_id: 'user-2' } })],
    });
    setupMocks({ financials: [fin], user: USER_MEMBER });
    renderPage();
    await waitFor(() => expect(screen.getByText('Aguardando Aprovação')).toBeInTheDocument());
  });

  it('exibe status "Confirmado" quando pagamento foi aprovado', async () => {
    const fin = makeFinancial({
      payments: [makePayment({ status: 'confirmed', player: { name: 'Eu', user_id: 'user-2' } })],
    });
    setupMocks({ financials: [fin], user: USER_MEMBER });
    renderPage();
    await waitFor(() => expect(screen.getByText('Confirmado')).toBeInTheDocument());
  });

  it('exibe seção "Já Pagaram" quando há pagamentos confirmados', async () => {
    const fin = makeFinancial({
      payments: [makePayment({ status: 'confirmed', player: { name: 'João', user_id: 'user-2' } })],
    });
    setupMocks({ financials: [fin] });
    renderPage();
    await waitFor(() => expect(screen.getByText(/Já Pagaram/i)).toBeInTheDocument());
  });

  it('presidente vê seção de "Aprovações Pendentes"', async () => {
    const fin = makeFinancial({ payments: [makePayment()] });
    setupMocks({ financials: [fin] });
    renderPage();
    await waitFor(() => expect(screen.getByText(/Aprovações Pendentes/i)).toBeInTheDocument());
  });

  it('membro não vê botão de deletar', async () => {
    setupMocks({ financials: [makeFinancial()], user: USER_MEMBER });
    renderPage();
    await waitFor(() => screen.getByText('Pagar Agora'));
    expect(screen.queryByRole('button', { name: /excluir|apagar/i })).toBeNull();
  });
});

describe('FinancialPage — presidente: criar cobrança', () => {
  beforeEach(() => { vi.clearAllMocks(); setupMocks(); });

  it('exibe botão "Nova Cobrança" para presidente', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Nova Cobrança')).toBeInTheDocument());
  });

  it('não exibe botão "Nova Cobrança" para membro', async () => {
    setupMocks({ user: USER_MEMBER });
    renderPage();
    await waitFor(() => screen.getByText('Financeiro.'));
    expect(screen.queryByText('Nova Cobrança')).toBeNull();
  });

  it('abre modal de criação ao clicar em Nova Cobrança', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Nova Cobrança'));
    fireEvent.click(screen.getByText('Nova Cobrança'));
    expect(screen.getByText('Nova Taxa')).toBeInTheDocument();
  });

  it('fecha modal ao clicar em Cancelar', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Nova Cobrança'));
    fireEvent.click(screen.getByText('Nova Cobrança'));
    fireEvent.click(screen.getByText('Cancelar'));
    await waitFor(() => expect(screen.queryByText('Nova Taxa')).toBeNull());
  });

  it('chama supabase.from("financials").insert com dados corretos', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    supabase.from.mockImplementation((table) => {
      if (table === 'financials') return {
        select:  vi.fn().mockReturnThis(),
        eq:      vi.fn().mockReturnThis(),
        order:   vi.fn().mockResolvedValue({ data: [], error: null }),
        insert:  insertMock,
      };
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: [], error: null }) };
    });

    renderPage();
    await waitFor(() => screen.getByText('Nova Cobrança'));
    fireEvent.click(screen.getByText('Nova Cobrança'));

    fireEvent.change(screen.getByPlaceholderText('TÍTULO (EX: MENSALIDADE)'), {
      target: { value: 'MENSALIDADE JULHO' },
    });
    fireEvent.change(screen.getByPlaceholderText('VALOR R$'), { target: { value: '80' } });
    fireEvent.change(screen.getByPlaceholderText('CHAVE PIX'), { target: { value: '11999998888' } });
    // date
    const dateInput = screen.getByDisplayValue('');
    if (dateInput) fireEvent.change(dateInput, { target: { value: '2025-07-31' } });

    fireEvent.click(screen.getByText('Lançar Agora'));

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            title:   'MENSALIDADE JULHO',
            amount:  '80',
            pix_key: '11999998888',
            baba_id: 'baba-1',
            status:  'active',
          }),
        ])
      );
    });
  });

  it('toast.success após criar cobrança', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    supabase.from.mockReturnValue({
      select:  vi.fn().mockReturnThis(),
      eq:      vi.fn().mockReturnThis(),
      order:   vi.fn().mockResolvedValue({ data: [], error: null }),
      insert:  insertMock,
    });

    renderPage();
    await waitFor(() => screen.getByText('Nova Cobrança'));
    fireEvent.click(screen.getByText('Nova Cobrança'));

    fireEvent.change(screen.getByPlaceholderText('TÍTULO (EX: MENSALIDADE)'), { target: { value: 'TAXA' } });
    fireEvent.change(screen.getByPlaceholderText('VALOR R$'), { target: { value: '50' } });
    fireEvent.change(screen.getByPlaceholderText('CHAVE PIX'), { target: { value: '123' } });
    fireEvent.click(screen.getByText('Lançar Agora'));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Cobrança lançada'));
  });

  it('toast.error ao criar cobrança com falha', async () => {
    supabase.from.mockReturnValue({
      select:  vi.fn().mockReturnThis(),
      eq:      vi.fn().mockReturnThis(),
      order:   vi.fn().mockResolvedValue({ data: [], error: null }),
      insert:  vi.fn().mockResolvedValue({ error: new Error('insert fail') }),
    });

    renderPage();
    await waitFor(() => screen.getByText('Nova Cobrança'));
    fireEvent.click(screen.getByText('Nova Cobrança'));
    fireEvent.change(screen.getByPlaceholderText('TÍTULO (EX: MENSALIDADE)'), { target: { value: 'X' } });
    fireEvent.change(screen.getByPlaceholderText('VALOR R$'), { target: { value: '10' } });
    fireEvent.change(screen.getByPlaceholderText('CHAVE PIX'), { target: { value: '1' } });
    fireEvent.click(screen.getByText('Lançar Agora'));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Erro ao criar'));
  });
});

describe('FinancialPage — presidente: encerrar/reativar cobrança', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('alterna status de active → closed', async () => {
    const updateMock = vi.fn().mockReturnThis();
    const eqMock     = vi.fn().mockReturnThis();
    const selectMock = vi.fn().mockResolvedValue({ error: null });

    supabase.from.mockImplementation((table) => ({
      select:  table === 'financials' ? vi.fn().mockReturnThis() : vi.fn().mockReturnThis(),
      eq:      eqMock,
      order:   vi.fn().mockResolvedValue({ data: [makeFinancial()], error: null }),
      update:  updateMock,
      insert:  vi.fn().mockReturnThis(),
      delete:  vi.fn().mockReturnThis(),
    }));
    selectMock.mockResolvedValue({ error: null });
    updateMock.mockReturnThis();
    eqMock.mockReturnThis();

    setupMocks({ financials: [makeFinancial()] });
    renderPage();
    await waitFor(() => screen.getByText('MENSALIDADE JUNHO'));

    // Clicar no botão Ban (toggle status)
    const banBtns = screen.getAllByRole('button').filter(b => b.querySelector('svg'));
    // O botão de toggle de status está entre os botões do presidente
    fireEvent.click(banBtns[banBtns.length - 2]); // penúltimo (antes do trash)

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Encerrada'));
    });
  });

  it('toast.error quando toggleStatus falha', async () => {
    const chain = setupMocks({ financials: [makeFinancial()] });
    chain.update.mockReturnThis();
    chain.eq.mockReturnThis();
    chain.select = vi.fn().mockResolvedValue({ error: new Error('rls fail') });

    renderPage();
    await waitFor(() => screen.getByText('MENSALIDADE JUNHO'));

    supabase.from.mockReturnValue({
      ...chain,
      update: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ error: new Error('fail') }),
    });

    const banBtns = screen.getAllByRole('button').filter(b => b.querySelector('svg'));
    fireEvent.click(banBtns[banBtns.length - 2]);

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });
});

describe('FinancialPage — presidente: excluir cobrança', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('abre ConfirmModal ao clicar em Excluir', async () => {
    setupMocks({ financials: [makeFinancial()] });
    renderPage();
    await waitFor(() => screen.getByText('MENSALIDADE JUNHO'));

    // Botão Trash2 (último botão com svg)
    const allBtns = screen.getAllByRole('button');
    const trashBtn = allBtns[allBtns.length - 1];
    fireEvent.click(trashBtn);

    await waitFor(() => expect(screen.getByText('Apagar esta cobrança?')).toBeInTheDocument());
  });

  it('exibe descrição do modal de confirmação', async () => {
    setupMocks({ financials: [makeFinancial()] });
    renderPage();
    await waitFor(() => screen.getByText('MENSALIDADE JUNHO'));

    const allBtns = screen.getAllByRole('button');
    fireEvent.click(allBtns[allBtns.length - 1]);

    await waitFor(() => {
      expect(screen.getByText(/Todos os registros de pagamento/i)).toBeInTheDocument();
    });
  });

  it('cancela exclusão ao clicar em Cancelar no modal', async () => {
    setupMocks({ financials: [makeFinancial()] });
    renderPage();
    await waitFor(() => screen.getByText('MENSALIDADE JUNHO'));

    const allBtns = screen.getAllByRole('button');
    fireEvent.click(allBtns[allBtns.length - 1]);
    await waitFor(() => screen.getByText('Cancelar'));
    fireEvent.click(screen.getByText('Cancelar'));

    await waitFor(() => expect(screen.queryByText('Apagar esta cobrança?')).toBeNull());
    expect(supabase.from().delete).not.toHaveBeenCalled();
  });
});

describe('FinancialPage — presidente: aprovar pagamento', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('exibe botão Aprovar para pagamento pendente', async () => {
    const fin = makeFinancial({ payments: [makePayment()] });
    setupMocks({ financials: [fin] });
    renderPage();
    await waitFor(() => expect(screen.getByText('Aprovar')).toBeInTheDocument());
  });

  it('chama supabase.from("payments").update com status=confirmed', async () => {
    const updateMock = vi.fn().mockReturnThis();
    const eqMock     = vi.fn().mockResolvedValue({ error: null });

    supabase.from.mockImplementation((table) => {
      if (table === 'payments') return { update: updateMock, eq: eqMock };
      return {
        select: vi.fn().mockReturnThis(),
        eq:     vi.fn().mockReturnThis(),
        order:  vi.fn().mockResolvedValue({ data: [makeFinancial({ payments: [makePayment()] })], error: null }),
      };
    });

    renderPage();
    await waitFor(() => screen.getByText('Aprovar'));
    fireEvent.click(screen.getByText('Aprovar'));

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'confirmed' }));
    });
  });

  it('toast.success após aprovar pagamento', async () => {
    supabase.from.mockImplementation((table) => {
      if (table === 'payments') return {
        update: vi.fn().mockReturnThis(),
        eq:     vi.fn().mockResolvedValue({ error: null }),
      };
      return {
        select: vi.fn().mockReturnThis(),
        eq:     vi.fn().mockReturnThis(),
        order:  vi.fn().mockResolvedValue({ data: [makeFinancial({ payments: [makePayment()] })], error: null }),
      };
    });

    renderPage();
    await waitFor(() => screen.getByText('Aprovar'));
    fireEvent.click(screen.getByText('Aprovar'));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Pagamento Confirmado'));
  });

  it('toast.error quando aprovação falha', async () => {
    supabase.from.mockImplementation((table) => {
      if (table === 'payments') return {
        update: vi.fn().mockReturnThis(),
        eq:     vi.fn().mockResolvedValue({ error: new Error('rls') }),
      };
      return {
        select: vi.fn().mockReturnThis(),
        eq:     vi.fn().mockReturnThis(),
        order:  vi.fn().mockResolvedValue({ data: [makeFinancial({ payments: [makePayment()] })], error: null }),
      };
    });

    renderPage();
    await waitFor(() => screen.getByText('Aprovar'));
    fireEvent.click(screen.getByText('Aprovar'));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Erro na confirmação'));
  });
});

describe('FinancialPage — modal de pagamento (membro)', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('abre modal de PIX ao clicar em Pagar Agora', async () => {
    setupMocks({ financials: [makeFinancial()], user: USER_MEMBER });
    renderPage();
    await waitFor(() => screen.getByText('Pagar Agora'));
    fireEvent.click(screen.getByText('Pagar Agora'));
    expect(screen.getByText('Pagar Taxa')).toBeInTheDocument();
  });

  it('exibe chave PIX completa (sem máscara) no modal de pagamento', async () => {
    setupMocks({ financials: [makeFinancial()], user: USER_MEMBER });
    renderPage();
    await waitFor(() => screen.getByText('Pagar Agora'));
    fireEvent.click(screen.getByText('Pagar Agora'));
    expect(screen.getByText('11999991234')).toBeInTheDocument();
  });

  it('exibe botão "Copiar Chave" no modal', async () => {
    setupMocks({ financials: [makeFinancial()], user: USER_MEMBER });
    renderPage();
    await waitFor(() => screen.getByText('Pagar Agora'));
    fireEvent.click(screen.getByText('Pagar Agora'));
    expect(screen.getByText('Copiar Chave')).toBeInTheDocument();
  });

  it('fecha modal ao clicar em X', async () => {
    setupMocks({ financials: [makeFinancial()], user: USER_MEMBER });
    renderPage();
    await waitFor(() => screen.getByText('Pagar Agora'));
    fireEvent.click(screen.getByText('Pagar Agora'));
    expect(screen.getByText('Pagar Taxa')).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: '' });
    // Fechar botão X é o primeiro botão sem texto
    const allBtns = screen.getAllByRole('button');
    const xBtn = allBtns.find(b => !b.textContent.trim() || b.querySelector('svg'));
    if (xBtn) {
      fireEvent.click(xBtn);
      await waitFor(() => expect(screen.queryByText('Pagar Taxa')).toBeNull());
    }
  });
});
