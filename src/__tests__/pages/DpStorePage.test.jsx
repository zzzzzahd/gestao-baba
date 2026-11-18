// src/__tests__/pages/DpStorePage.test.jsx
// Retorno do checkout do Mercado Pago: /dpstore?status=success|pending|failure

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

const fetchWallet = vi.fn();
vi.mock('../../services/dpStore', () => ({
  fetchWallet: (...a) => fetchWallet(...a),
  fetchDpPackages: vi.fn().mockResolvedValue([]),
  fetchStoreItems: vi.fn().mockResolvedValue([]),
  fetchTransactions: vi.fn().mockResolvedValue([]),
  startDpPurchase: vi.fn(),
  redeemStoreItem: vi.fn(),
}));

import DpStorePage from '../../pages/DpStorePage';

function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="search">{loc.search}</div>;
}

function renderAt(url) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path="/dpstore"
          element={
            <>
              <DpStorePage />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('DpStorePage — retorno do Mercado Pago', () => {
  beforeEach(() => {
    fetchWallet.mockReset();
    fetchWallet.mockResolvedValue({ balance: 0, lifetime_earned: 0, lifetime_spent: 0 });
  });

  it('exibe mensagem de sucesso com ?status=success', async () => {
    renderAt('/dpstore?status=success');
    expect(await screen.findByRole('status')).toHaveTextContent(/Pagamento aprovado/i);
  });

  it('exibe mensagem de pendente com ?status=pending', async () => {
    renderAt('/dpstore?status=pending');
    expect(await screen.findByRole('status')).toHaveTextContent(/pendente/i);
  });

  it('exibe mensagem de falha com ?status=failure', async () => {
    renderAt('/dpstore?status=failure');
    expect(await screen.findByRole('status')).toHaveTextContent(/não foi concluído/i);
  });

  it('remove o parâmetro status da URL depois de mostrar a mensagem', async () => {
    renderAt('/dpstore?status=success');
    await screen.findByRole('status');
    await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent(''));
    expect(screen.getByTestId('search').textContent).not.toContain('status');
  });

  it('não exibe mensagem sem o parâmetro status', async () => {
    renderAt('/dpstore');
    await waitFor(() => expect(fetchWallet).toHaveBeenCalled());
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('ignora um status desconhecido, sem mensagem', async () => {
    renderAt('/dpstore?status=qualquer-coisa');
    await waitFor(() => expect(fetchWallet).toHaveBeenCalled());
    expect(screen.queryByRole('status')).toBeNull();
  });
});
