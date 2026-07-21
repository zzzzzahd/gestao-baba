// src/__tests__/components/PresenceBlock.test.jsx
// Sprint T-5 — Componente: PresenceBlock (PresenceList)
// Coração da HomePage: lista de confirmados, fila, progresso e botões de ação.

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PresenceBlock from '../../components/PresenceBlock';

// Supabase já mockado em setup.js — garantir retorno padrão
const { supabase } = vi.hoisted(() => ({
  supabase: {
    rpc: vi.fn(),
  },
}));
vi.mock('../../services/supabase', () => ({ supabase }));

const nextGameDay = {
  time: '09:00:00',
  dateStr: '2026-07-05',
};

const mkBlock = (props = {}) =>
  render(
    <PresenceBlock
      nextGameDay={nextGameDay}
      gameConfirmations={[]}
      myConfirmation={null}
      canConfirm={true}
      countdown={{ active: false, d: 0, h: 0, m: 0, s: 0 }}
      loading={false}
      drawConfig={{ playersPerTeam: 5 }}
      currentBaba={{ id: 'baba1' }}
      onReload={vi.fn()}
      {...props}
    />
  );

// ─── Null guard ───────────────────────────────────────────────────────────────
describe('PresenceBlock › null guard', () => {
  it('não renderiza quando nextGameDay=null', () => {
    const { container } = render(
      <PresenceBlock nextGameDay={null} gameConfirmations={[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('não renderiza quando nextGameDay=undefined', () => {
    const { container } = render(<PresenceBlock />);
    expect(container.firstChild).toBeNull();
  });
});

// ─── Cabeçalho e horário ──────────────────────────────────────────────────────
describe('PresenceBlock › cabeçalho', () => {
  it('exibe horário formatado HH:MM', () => {
    mkBlock();
    expect(screen.getByText('09:00')).toBeInTheDocument();
  });

  it('exibe "0 confirmados" quando lista vazia', () => {
    mkBlock();
    expect(screen.getByText(/confirmados/i)).toBeInTheDocument();
  });

  it('exibe contagem correta de confirmados', () => {
    const conf = [
      { conf_id: '1', status: 'confirmed', player_name: 'João' },
      { conf_id: '2', status: 'confirmed', player_name: 'Maria' },
    ];
    mkBlock({ gameConfirmations: conf });
    expect(screen.getByText(/2/)).toBeInTheDocument();
  });

  it('exibe "faltam N" quando abaixo do mínimo', () => {
    mkBlock({ gameConfirmations: [] });
    expect(screen.getByText(/faltam 10/i)).toBeInTheDocument();
  });

  it('exibe info de fila quando há waitlist', () => {
    const conf = [
      { conf_id: '1', status: 'waitlist', player_name: 'Extra', position: 1 },
    ];
    mkBlock({ gameConfirmations: conf });
    expect(screen.getByText(/na fila/i)).toBeInTheDocument();
  });
});

// ─── Barra de progresso ───────────────────────────────────────────────────────
describe('PresenceBlock › progresso', () => {
  it('barra de progresso está no DOM', () => {
    const { container } = mkBlock();
    expect(container.querySelector('.rounded-full')).not.toBeNull();
  });

  it('progresso vira verde quando 100% atingido', () => {
    const conf = Array.from({ length: 10 }, (_, i) => ({
      conf_id: String(i),
      status: 'confirmed',
      player_name: `Jogador ${i}`,
    }));
    const { container } = mkBlock({ gameConfirmations: conf });
    expect(container.querySelector('.bg-green-400')).not.toBeNull();
  });
});

// ─── Avatares ─────────────────────────────────────────────────────────────────
describe('PresenceBlock › avatares', () => {
  it('renderiza inicial do nome quando sem avatar_url', () => {
    const conf = [{ conf_id: '1', status: 'confirmed', player_name: 'Zico' }];
    mkBlock({ gameConfirmations: conf });
    expect(screen.getByText('Z')).toBeInTheDocument();
  });

  it('renderiza img quando avatar_url fornecido', () => {
    const conf = [{
      conf_id: '1', status: 'confirmed',
      player_name: 'Zico', avatar_url: 'https://img.test/z.jpg',
    }];
    mkBlock({ gameConfirmations: conf });
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('exibe "+N" quando mais de 12 confirmados', () => {
    const conf = Array.from({ length: 14 }, (_, i) => ({
      conf_id: String(i), status: 'confirmed', player_name: `J${i}`,
    }));
    mkBlock({ gameConfirmations: conf });
    expect(screen.getByText('+2')).toBeInTheDocument();
  });
});

// ─── Estado do usuário ────────────────────────────────────────────────────────
describe('PresenceBlock › estado do usuário', () => {
  it('exibe "Você está confirmado" quando status=confirmed', () => {
    mkBlock({ myConfirmation: { status: 'confirmed' } });
    expect(screen.getByText(/Você está confirmado/i)).toBeInTheDocument();
  });

  it('exibe "Fila de espera" com posição quando status=waitlist', () => {
    mkBlock({ myConfirmation: { status: 'waitlist', position: 2 } });
    expect(screen.getByText(/Fila de espera.*2º/i)).toBeInTheDocument();
  });
});

// ─── Botões de ação ───────────────────────────────────────────────────────────
describe('PresenceBlock › botão confirmar', () => {
  beforeEach(() => vi.clearAllMocks());

  it('exibe "Confirmar presença" quando canConfirm=true e sem status', () => {
    mkBlock({ myConfirmation: null, canConfirm: true });
    expect(screen.getByRole('button', { name: /confirmar presença/i })).toBeInTheDocument();
  });

  it('exibe "Cancelar presença" quando já confirmado', () => {
    mkBlock({ myConfirmation: { status: 'confirmed' }, canConfirm: true });
    expect(screen.getByRole('button', { name: /cancelar presença/i })).toBeInTheDocument();
  });

  it('exibe "Confirmações encerradas" quando canConfirm=false sem myStatus', () => {
    mkBlock({ canConfirm: false, myConfirmation: null });
    expect(screen.getByText(/Confirmações encerradas/i)).toBeInTheDocument();
  });

  it('botão confirmar chama supabase.rpc confirm_presence', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: { status: 'confirmed' }, error: null });
    mkBlock({ myConfirmation: null, canConfirm: true });
    fireEvent.click(screen.getByRole('button', { name: /confirmar presença/i }));
    await waitFor(() =>
      expect(supabase.rpc).toHaveBeenCalledWith('confirm_presence', expect.any(Object))
    );
  });

  it('botão cancelar chama supabase.rpc cancel_presence', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: {}, error: null });
    mkBlock({ myConfirmation: { status: 'confirmed' }, canConfirm: true });
    fireEvent.click(screen.getByRole('button', { name: /cancelar presença/i }));
    await waitFor(() =>
      expect(supabase.rpc).toHaveBeenCalledWith('cancel_presence', expect.any(Object))
    );
  });

  it('botão confirmar fica desabilitado durante acting', async () => {
    let resolve;
    supabase.rpc.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    mkBlock({ myConfirmation: null, canConfirm: true });
    fireEvent.click(screen.getByRole('button', { name: /confirmar presença/i }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /confirmando/i })).toBeDisabled()
    );
    resolve({ data: {}, error: null });
  });

  it('botão disabled quando loading=true', () => {
    mkBlock({ myConfirmation: null, canConfirm: true, loading: true });
    expect(screen.getByRole('button', { name: /confirmar presença/i })).toBeDisabled();
  });
});

// ─── Countdown urgente ────────────────────────────────────────────────────────
describe('PresenceBlock › countdown urgente', () => {
  it('exibe aviso vermelho quando < 5 min restante', () => {
    mkBlock({
      countdown: { active: true, d: 0, h: 0, m: 3, s: 0 },
    });
    expect(screen.getByText(/Encerra em/i)).toBeInTheDocument();
  });

  it('NÃO exibe aviso quando countdown > 5 min', () => {
    mkBlock({
      countdown: { active: true, d: 0, h: 0, m: 10, s: 0 },
    });
    expect(screen.queryByText(/Encerra em/i)).toBeNull();
  });
});

// ─── Fila de espera expansível ────────────────────────────────────────────────
describe('PresenceBlock › fila de espera', () => {
  const waitlistConf = [
    { conf_id: 'w1', status: 'waitlist', player_name: 'Reserva1', position: 1 },
    { conf_id: 'w2', status: 'waitlist', player_name: 'Reserva2', position: 2 },
  ];

  it('exibe botão "Lista de espera (2)"', () => {
    mkBlock({ gameConfirmations: waitlistConf });
    expect(screen.getByText(/Lista de espera \(2\)/i)).toBeInTheDocument();
  });

  it('lista de espera começa recolhida', () => {
    mkBlock({ gameConfirmations: waitlistConf });
    expect(screen.queryByText('Reserva1')).toBeNull();
  });

  it('expande ao clicar no toggle', () => {
    mkBlock({ gameConfirmations: waitlistConf });
    fireEvent.click(screen.getByText(/Lista de espera/i));
    expect(screen.getByText('Reserva1')).toBeInTheDocument();
    expect(screen.getByText('Reserva2')).toBeInTheDocument();
  });

  it('recolhe ao clicar novamente', () => {
    mkBlock({ gameConfirmations: waitlistConf });
    fireEvent.click(screen.getByText(/Lista de espera/i));
    fireEvent.click(screen.getByText(/Lista de espera/i));
    expect(screen.queryByText('Reserva1')).toBeNull();
  });

  it('exibe posição 1º e 2º quando expandido', () => {
    mkBlock({ gameConfirmations: waitlistConf });
    fireEvent.click(screen.getByText(/Lista de espera/i));
    expect(screen.getByText('1º')).toBeInTheDocument();
    expect(screen.getByText('2º')).toBeInTheDocument();
  });
});

// ─── onReload ────────────────────────────────────────────────────────────────
describe('PresenceBlock › onReload', () => {
  it('chama onReload após confirmar com sucesso', async () => {
    const onReload = vi.fn();
    supabase.rpc.mockResolvedValueOnce({ data: { status: 'confirmed' }, error: null });
    mkBlock({ myConfirmation: null, canConfirm: true, onReload });
    fireEvent.click(screen.getByRole('button', { name: /confirmar presença/i }));
    await waitFor(() => expect(onReload).toHaveBeenCalled());
  });
});

// ─── Erro do RPC ─────────────────────────────────────────────────────────────
describe('PresenceBlock › erro RPC', () => {
  it('NÃO chama onReload quando RPC retorna erro', async () => {
    const onReload = vi.fn();
    supabase.rpc.mockResolvedValueOnce({ data: null, error: { message: 'fail' } });
    mkBlock({ myConfirmation: null, canConfirm: true, onReload });
    fireEvent.click(screen.getByRole('button', { name: /confirmar presença/i }));
    await waitFor(() => {
      // o botão voltou ao estado normal = operação terminou
      expect(screen.getByRole('button', { name: /confirmar presença/i })).toBeEnabled();
    });
    expect(onReload).not.toHaveBeenCalled();
  });
});
