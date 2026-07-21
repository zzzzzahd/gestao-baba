// src/__tests__/components/QRCodeModal.test.jsx
// Sprint T-5 — Componente: QRCodeModal (InviteModal)
// Exibe QR Code de convite, permite copiar código/link e renovar o código.

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import QRCodeModal from '../../components/QRCodeModal';

// qrcode.react não roda em jsdom — mockar
vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }) => (
    <svg data-testid="qr-svg" data-value={value} />
  ),
}));

// navigator.clipboard e navigator.share
const writeText = vi.fn().mockResolvedValue(undefined);
const share     = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, 'clipboard', {
    writable: true,
    value: { writeText },
  });
  Object.defineProperty(navigator, 'share', {
    writable: true,
    value: share,
  });
  // Simular location.origin
  Object.defineProperty(window, 'location', {
    writable: true,
    value: { ...window.location, origin: 'https://gestao-baba.vercel.app' },
  });
});

const mk = (props = {}) =>
  render(
    <QRCodeModal
      isOpen={true}
      onClose={vi.fn()}
      inviteCode="ABC123"
      babaName="Baba do Zé"
      onRefresh={vi.fn()}
      {...props}
    />
  );

// ─── Visibilidade ─────────────────────────────────────────────────────────────
describe('QRCodeModal › visibilidade', () => {
  it('não monta quando isOpen=false', () => {
    const { container } = mk({ isOpen: false });
    expect(container.firstChild).toBeNull();
  });

  it('monta quando isOpen=true', () => {
    mk();
    expect(screen.getByText('Convite QR')).toBeInTheDocument();
  });

  it('botão fechar (×) chama onClose', () => {
    const onClose = vi.fn();
    mk({ onClose });
    // O botão com ícone X está no header
    const closeBtn = screen.getAllByRole('button').find(b =>
      b.className.includes('text-white')
    );
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('click no backdrop chama onClose', () => {
    const onClose = vi.fn();
    const { container } = mk({ onClose });
    fireEvent.click(container.querySelector('.fixed'));
    expect(onClose).toHaveBeenCalled();
  });

  it('click no card interno NÃO fecha', () => {
    const onClose = vi.fn();
    mk({ onClose });
    // O card é o div que NÃO chama onClose
    const card = screen.getByText('Convite QR').closest('div[class*="rounded"]');
    if (card) fireEvent.click(card);
    expect(onClose).not.toHaveBeenCalled();
  });
});

// ─── Conteúdo com código válido ───────────────────────────────────────────────
describe('QRCodeModal › com código', () => {
  it('exibe o babaName no header', () => {
    mk();
    expect(screen.getByText('Baba do Zé')).toBeInTheDocument();
  });

  it('exibe o inviteCode em destaque', () => {
    mk({ inviteCode: 'XYZ789' });
    expect(screen.getByText('XYZ789')).toBeInTheDocument();
  });

  it('renderiza o QR Code SVG', () => {
    mk();
    expect(screen.getByTestId('qr-svg')).toBeInTheDocument();
  });

  it('URL do QR aponta para /join/:code', () => {
    mk({ inviteCode: 'ABC123' });
    const svg = screen.getByTestId('qr-svg');
    expect(svg.getAttribute('data-value')).toContain('/join/ABC123');
  });

  it('exibe botão Compartilhar', () => {
    mk();
    expect(screen.getByRole('button', { name: /compartilhar/i })).toBeInTheDocument();
  });

  it('exibe botão Código (copiar código)', () => {
    mk();
    expect(screen.getByRole('button', { name: /código/i })).toBeInTheDocument();
  });

  it('exibe botão Renovar', () => {
    mk();
    expect(screen.getByRole('button', { name: /renovar/i })).toBeInTheDocument();
  });

  it('exibe rótulo "Código"', () => {
    mk();
    expect(screen.getByText('Código')).toBeInTheDocument();
  });
});

// ─── Sem código ───────────────────────────────────────────────────────────────
describe('QRCodeModal › sem código', () => {
  it('exibe mensagem "Nenhum código ativo" quando inviteCode=null', () => {
    mk({ inviteCode: null });
    expect(screen.getByText(/Nenhum código ativo/i)).toBeInTheDocument();
  });

  it('NÃO renderiza QR quando inviteCode=null', () => {
    mk({ inviteCode: null });
    expect(screen.queryByTestId('qr-svg')).toBeNull();
  });
});

// ─── Ações ────────────────────────────────────────────────────────────────────
describe('QRCodeModal › ações', () => {
  it('copiar código chama clipboard.writeText com o código', async () => {
    mk({ inviteCode: 'MYCODE' });
    fireEvent.click(screen.getByRole('button', { name: /código/i }));
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith('MYCODE')
    );
  });

  it('compartilhar chama navigator.share com URL correta', async () => {
    mk({ inviteCode: 'ABC123' });
    fireEvent.click(screen.getByRole('button', { name: /compartilhar/i }));
    await waitFor(() => expect(share).toHaveBeenCalled());
    const call = share.mock.calls[0][0];
    expect(call.url).toContain('/join/ABC123');
  });

  it('renovar chama onRefresh', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    mk({ onRefresh });
    fireEvent.click(screen.getByRole('button', { name: /renovar/i }));
    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));
  });

  it('renovar fica desabilitado durante refresh', async () => {
    let resolve;
    const onRefresh = vi.fn(() => new Promise(r => { resolve = r; }));
    mk({ onRefresh });
    fireEvent.click(screen.getByRole('button', { name: /renovar/i }));
    const btn = screen.getByRole('button', { name: /renovar/i });
    expect(btn).toBeDisabled();
    resolve();
  });

  it('fallback para WhatsApp quando navigator.share indefinido', async () => {
    Object.defineProperty(navigator, 'share', { writable: true, value: undefined });
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    mk({ inviteCode: 'ABC123' });
    fireEvent.click(screen.getByRole('button', { name: /compartilhar/i }));
    await waitFor(() => expect(openSpy).toHaveBeenCalled());
    const url = openSpy.mock.calls[0][0];
    expect(url).toContain('wa.me');
  });
});
