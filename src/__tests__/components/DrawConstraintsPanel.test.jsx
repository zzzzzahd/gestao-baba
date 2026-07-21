// src/__tests__/components/DrawConstraintsPanel.test.jsx

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

// Mock BabaContext
const mockUseBaba = vi.fn();
vi.mock('../../contexts/BabaContext', () => ({
  useBaba: () => mockUseBaba(),
}));

// Mock Supabase
vi.mock('../../services/supabase', () => ({
  supabase: {
    rpc:  vi.fn(),
    from: vi.fn(),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
  },
}));

vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

import DrawConstraintsPanel from '../../components/DrawConstraintsPanel';
import { supabase }         from '../../services/supabase';
import toast                from 'react-hot-toast';

const makePlayer = (id, name) => ({ id, name, profile: null });
const PLAYERS = [makePlayer('p-1', 'Zé'), makePlayer('p-2', 'João'), makePlayer('p-3', 'Bia')];

const makeConstraint = (o = {}) => ({
  player_a_id:       'p-1',
  player_b_id:       'p-2',
  constraint_type:   'must_together',
  reason:            null,
  player_a:          { name: 'Zé',  profile: null },
  player_b:          { name: 'João', profile: null },
  ...o,
});

const setupDefault = (constraints = []) => {
  mockUseBaba.mockReturnValue({
    currentBaba: { id: 'baba-1', name: 'Baba do Zé' },
    players:     PLAYERS,
  });
  supabase.rpc.mockResolvedValue({ data: constraints, error: null });
};

const makeChain = (err = null) => ({
  insert: vi.fn().mockResolvedValue({ error: err }),
  update: vi.fn().mockReturnThis(),
  eq:     vi.fn().mockReturnThis(),
  then:   vi.fn(),
});

describe('DrawConstraintsPanel — carregamento', () => {
  beforeEach(() => { vi.clearAllMocks(); setupDefault(); });

  it('chama RPC get_draw_constraints ao montar', async () => {
    render(<DrawConstraintsPanel />);
    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('get_draw_constraints', { p_baba_id: 'baba-1' });
    });
  });

  it('exibe estado vazio quando não há restrições', async () => {
    render(<DrawConstraintsPanel />);
    await waitFor(() => {
      expect(screen.getByText('Nenhuma restrição definida')).toBeInTheDocument();
    });
  });

  it('exibe constraint do tipo must_together', async () => {
    setupDefault([makeConstraint()]);
    render(<DrawConstraintsPanel />);
    await waitFor(() => {
      expect(screen.getByText('Zé')).toBeInTheDocument();
      expect(screen.getByText('João')).toBeInTheDocument();
    });
  });

  it('exibe constraint do tipo must_apart', async () => {
    setupDefault([makeConstraint({ constraint_type: 'must_apart', player_a: { name: 'Zé', profile: null }, player_b: { name: 'Bia', profile: null } })]);
    render(<DrawConstraintsPanel />);
    await waitFor(() => {
      expect(screen.getByText('Jogam separados (1)')).toBeInTheDocument();
    });
  });

  it('exibe seção "Jogam juntos" quando há constraints must_together', async () => {
    setupDefault([makeConstraint()]);
    render(<DrawConstraintsPanel />);
    await waitFor(() => {
      expect(screen.getByText('Jogam juntos (1)')).toBeInTheDocument();
    });
  });

  it('não crasha quando currentBaba é null', async () => {
    mockUseBaba.mockReturnValue({ currentBaba: null, players: [] });
    expect(() => render(<DrawConstraintsPanel />)).not.toThrow();
  });

  it('exibe motivo da constraint quando definido', async () => {
    setupDefault([makeConstraint({ reason: 'Melhores amigos' })]);
    render(<DrawConstraintsPanel />);
    await waitFor(() => {
      expect(screen.getByText('Melhores amigos')).toBeInTheDocument();
    });
  });
});

describe('DrawConstraintsPanel — avatar', () => {
  beforeEach(() => { vi.clearAllMocks(); setupDefault(); });

  it('exibe inicial do nome quando sem avatarUrl', async () => {
    setupDefault([makeConstraint()]);
    render(<DrawConstraintsPanel />);
    await waitFor(() => {
      const initials = screen.getAllByText('Z');
      expect(initials.length).toBeGreaterThan(0);
    });
  });
});

describe('DrawConstraintsPanel — formulário', () => {
  beforeEach(() => { vi.clearAllMocks(); setupDefault(); });

  it('formulário começa oculto', async () => {
    render(<DrawConstraintsPanel />);
    await waitFor(() => expect(screen.queryByText('Nova restrição')).toBeNull());
  });

  it('exibe formulário ao clicar em Nova', async () => {
    render(<DrawConstraintsPanel />);
    await waitFor(() => screen.getByText('Nova'));
    fireEvent.click(screen.getByText('Nova'));
    expect(screen.getByText('Nova restrição')).toBeInTheDocument();
  });

  it('esconde formulário ao clicar em Nova novamente (toggle)', async () => {
    render(<DrawConstraintsPanel />);
    await waitFor(() => screen.getByText('Nova'));
    fireEvent.click(screen.getByText('Nova'));
    expect(screen.getByText('Nova restrição')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Nova'));
    expect(screen.queryByText('Nova restrição')).toBeNull();
  });

  it('esconde formulário ao clicar em Cancelar', async () => {
    render(<DrawConstraintsPanel />);
    await waitFor(() => screen.getByText('Nova'));
    fireEvent.click(screen.getByText('Nova'));
    fireEvent.click(screen.getByText('Cancelar'));
    expect(screen.queryByText('Nova restrição')).toBeNull();
  });

  it('exibe os dois tipos: Juntos e Separados', async () => {
    render(<DrawConstraintsPanel />);
    await waitFor(() => screen.getByText('Nova'));
    fireEvent.click(screen.getByText('Nova'));
    expect(screen.getByText('Juntos')).toBeInTheDocument();
    expect(screen.getByText('Separados')).toBeInTheDocument();
  });

  it('lista todos os jogadores no select de Jogador 1', async () => {
    render(<DrawConstraintsPanel />);
    await waitFor(() => screen.getByText('Nova'));
    fireEvent.click(screen.getByText('Nova'));
    expect(screen.getByText('Zé')).toBeInTheDocument();
    expect(screen.getByText('João')).toBeInTheDocument();
    expect(screen.getByText('Bia')).toBeInTheDocument();
  });

  it('exclui jogador A do select de Jogador 2', async () => {
    render(<DrawConstraintsPanel />);
    await waitFor(() => screen.getByText('Nova'));
    fireEvent.click(screen.getByText('Nova'));

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'p-1' } }); // Jogador 1 = Zé

    // Jogador 2 não deve ter Zé
    const optionsB = within(selects[1]).queryAllByText('Zé');
    expect(optionsB).toHaveLength(0);
  });
});

describe('DrawConstraintsPanel — validação ao criar', () => {
  beforeEach(() => { vi.clearAllMocks(); setupDefault(); });

  it('toast.error se nenhum jogador selecionado', async () => {
    render(<DrawConstraintsPanel />);
    await waitFor(() => screen.getByText('Nova'));
    fireEvent.click(screen.getByText('Nova'));
    fireEvent.click(screen.getByText('Criar'));
    expect(toast.error).toHaveBeenCalledWith('Selecione dois jogadores');
  });

  it('botão Criar fica desabilitado sem os dois jogadores', async () => {
    render(<DrawConstraintsPanel />);
    await waitFor(() => screen.getByText('Nova'));
    fireEvent.click(screen.getByText('Nova'));
    const createBtn = screen.getByRole('button', { name: /criar/i });
    expect(createBtn).toBeDisabled();
  });

  it('botão Criar fica habilitado com os dois jogadores', async () => {
    render(<DrawConstraintsPanel />);
    await waitFor(() => screen.getByText('Nova'));
    fireEvent.click(screen.getByText('Nova'));

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'p-1' } });
    fireEvent.change(selects[1], { target: { value: 'p-2' } });

    const createBtn = screen.getByRole('button', { name: /criar/i });
    expect(createBtn).not.toBeDisabled();
  });

  it('toast.error ao tentar criar constraint duplicada', async () => {
    setupDefault([makeConstraint()]);
    render(<DrawConstraintsPanel />);
    await waitFor(() => screen.getByText('Nova'));
    fireEvent.click(screen.getByText('Nova'));

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'p-1' } });
    fireEvent.change(selects[1], { target: { value: 'p-2' } });

    fireEvent.click(screen.getByRole('button', { name: /criar/i }));
    expect(toast.error).toHaveBeenCalledWith('Restrição já existe para estes jogadores');
  });
});

describe('DrawConstraintsPanel — criar constraint', () => {
  beforeEach(() => { vi.clearAllMocks(); setupDefault(); });

  it('chama supabase.from("draw_constraints").insert com payload correto', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    supabase.from.mockReturnValue({ insert: insertMock });

    render(<DrawConstraintsPanel />);
    await waitFor(() => screen.getByText('Nova'));
    fireEvent.click(screen.getByText('Nova'));

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'p-1' } });
    fireEvent.change(selects[1], { target: { value: 'p-2' } });
    fireEvent.click(screen.getByRole('button', { name: /criar/i }));

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('draw_constraints');
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          baba_id:     'baba-1',
          player_a_id: 'p-1',
          player_b_id: 'p-2',
          type:        'must_together',
        })
      );
    });
  });

  it('toast.success após criação bem-sucedida', async () => {
    supabase.from.mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) });
    render(<DrawConstraintsPanel />);
    await waitFor(() => screen.getByText('Nova'));
    fireEvent.click(screen.getByText('Nova'));

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'p-1' } });
    fireEvent.change(selects[1], { target: { value: 'p-2' } });
    fireEvent.click(screen.getByRole('button', { name: /criar/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Restrição criada');
    });
  });

  it('toast.error quando insert falha', async () => {
    supabase.from.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: new Error('DB fail') }),
    });
    render(<DrawConstraintsPanel />);
    await waitFor(() => screen.getByText('Nova'));
    fireEvent.click(screen.getByText('Nova'));

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'p-1' } });
    fireEvent.change(selects[1], { target: { value: 'p-2' } });
    fireEvent.click(screen.getByRole('button', { name: /criar/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Erro ao criar restrição');
    });
  });
});

describe('DrawConstraintsPanel — deletar constraint', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('chama supabase.from("draw_constraints").update com is_active=false', async () => {
    setupDefault([makeConstraint()]);
    const eqMock     = vi.fn().mockReturnThis();
    const updateMock = vi.fn().mockReturnThis();
    supabase.from.mockImplementation((table) => {
      if (table === 'draw_constraints') return { update: updateMock, eq: eqMock };
      return { update: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ error: null }) };
    });
    eqMock.mockResolvedValueOnce({ error: null });

    render(<DrawConstraintsPanel />);
    await waitFor(() => screen.getAllByRole('button', { name: '' }));

    const deleteBtn = screen.getByRole('button', { name: '' });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith({ is_active: false });
    });
  });

  it('toast.success após deletar com sucesso', async () => {
    setupDefault([makeConstraint()]);
    const eqMock = vi.fn().mockReturnThis();
    eqMock.mockResolvedValueOnce({ error: null });
    supabase.from.mockReturnValue({ update: vi.fn().mockReturnThis(), eq: eqMock });

    render(<DrawConstraintsPanel />);
    await waitFor(() => screen.getAllByTitle?.('') || screen.getAllByRole('button'));

    const buttons = screen.getAllByRole('button');
    const trashBtn = buttons.find(b => b.querySelector('svg'));
    if (trashBtn) {
      fireEvent.click(trashBtn);
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Restrição removida');
      });
    }
  });

  it('toast.error quando delete falha', async () => {
    setupDefault([makeConstraint()]);
    supabase.from.mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockResolvedValue({ error: new Error('fail') }),
    });

    render(<DrawConstraintsPanel />);
    await waitFor(() => screen.getByText('Zé'));

    const buttons = screen.getAllByRole('button');
    const trashBtn = buttons[buttons.length - 1];
    fireEvent.click(trashBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Erro ao remover');
    });
  });
});
