// src/__tests__/pages/PrivacyPage.test.jsx

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

import PrivacyPage from '../../pages/PrivacyPage';

const renderPage = () =>
  render(<MemoryRouter><PrivacyPage /></MemoryRouter>);

describe('PrivacyPage — estrutura', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renderiza sem crashar', () => {
    expect(() => renderPage()).not.toThrow();
  });

  it('exibe título "Privacidade"', () => {
    renderPage();
    expect(screen.getByText('Privacidade')).toBeInTheDocument();
  });

  it('exibe versão e data da política', () => {
    renderPage();
    expect(screen.getByText(/Versão 1\.0/i)).toBeInTheDocument();
    expect(screen.getByText(/Mai\/2026/i)).toBeInTheDocument();
  });

  it('exibe ícone Shield (intro LGPD)', () => {
    const { container } = renderPage();
    // Lucide renderiza como SVG
    expect(container.querySelectorAll('svg').length).toBeGreaterThan(0);
  });

  it('exibe menção à LGPD na introdução', () => {
    renderPage();
    expect(screen.getByText(/LGPD/i)).toBeInTheDocument();
    expect(screen.getByText(/Lei 13\.709\/2018/i)).toBeInTheDocument();
  });
});

describe('PrivacyPage — seções de conteúdo', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  const sections = [
    '1. Quais dados coletamos',
    '2. Como usamos seus dados',
    '3. Com quem compartilhamos',
    '4. Por quanto tempo guardamos',
    '5. Seus direitos (LGPD)',
    '6. Segurança',
    '7. Encarregado de Dados (DPO)',
    '8. Exercício de direitos',
    '9. Contato',
  ];

  sections.forEach((section) => {
    it(`exibe seção "${section}"`, () => {
      renderPage();
      expect(screen.getByText(section)).toBeInTheDocument();
    });
  });
});

describe('PrivacyPage — itens de coleta de dados', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('lista nome e email como dados coletados', () => {
    renderPage();
    expect(screen.getByText('Nome e email (cadastro)')).toBeInTheDocument();
  });

  it('lista foto de perfil como opcional', () => {
    renderPage();
    expect(screen.getByText('Foto de perfil (opcional)')).toBeInTheDocument();
  });

  it('menciona dados de partidas', () => {
    renderPage();
    expect(screen.getByText(/gols, assistências, presenças/i)).toBeInTheDocument();
  });

  it('menciona chave Pix como opcional', () => {
    renderPage();
    expect(screen.getByText(/Chave Pix/i)).toBeInTheDocument();
  });
});

describe('PrivacyPage — direitos LGPD', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('menciona exportar dados em JSON', () => {
    renderPage();
    expect(screen.getByText(/Exportar seus dados/i)).toBeInTheDocument();
  });

  it('menciona exclusão de conta', () => {
    renderPage();
    expect(screen.getByText(/Excluir sua conta/i)).toBeInTheDocument();
  });

  it('menciona revogação de consentimento', () => {
    renderPage();
    expect(screen.getByText(/Revogar consentimento/i)).toBeInTheDocument();
  });
});

describe('PrivacyPage — segurança', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('menciona Row Level Security', () => {
    renderPage();
    expect(screen.getByText(/Row Level Security/i)).toBeInTheDocument();
  });

  it('menciona HTTPS', () => {
    renderPage();
    expect(screen.getByText(/HTTPS/i)).toBeInTheDocument();
  });

  it('menciona Supabase Auth', () => {
    renderPage();
    expect(screen.getByText(/Supabase Auth/i)).toBeInTheDocument();
  });

  it('garante que senhas não são em texto simples', () => {
    renderPage();
    expect(screen.getByText(/Senhas nunca são armazenadas em texto/i)).toBeInTheDocument();
  });
});

describe('PrivacyPage — compartilhamento', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('afirma que dados nunca são vendidos', () => {
    renderPage();
    expect(screen.getByText(/nunca são vendidos/i)).toBeInTheDocument();
  });

  it('menciona Supabase como parceiro de dados', () => {
    renderPage();
    expect(screen.getByText(/Supabase/i)).toBeInTheDocument();
  });

  it('menciona Sentry como parceiro de monitoramento', () => {
    renderPage();
    expect(screen.getByText(/Sentry/i)).toBeInTheDocument();
  });

  it('menciona Vercel como hospedagem', () => {
    renderPage();
    expect(screen.getByText(/Vercel/i)).toBeInTheDocument();
  });
});

describe('PrivacyPage — contato e DPO', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('exibe email de contato de privacidade', () => {
    renderPage();
    const links = screen.getAllByText('privacidade@gestao-baba.app');
    expect(links.length).toBeGreaterThan(0);
  });

  it('link de email tem href correto', () => {
    renderPage();
    const link = screen.getAllByText('privacidade@gestao-baba.app')[0].closest('a');
    expect(link).toHaveAttribute('href', 'mailto:privacidade@gestao-baba.app');
  });

  it('exibe link para ANPD', () => {
    renderPage();
    expect(screen.getByText('www.gov.br/anpd')).toBeInTheDocument();
  });

  it('link da ANPD abre em nova aba', () => {
    renderPage();
    const link = screen.getByText('www.gov.br/anpd').closest('a');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('menciona prazo de resposta de 15 dias úteis', () => {
    renderPage();
    expect(screen.getByText(/15 dias úteis/i)).toBeInTheDocument();
  });
});

describe('PrivacyPage — navegação', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('botão voltar chama navigate(-1)', () => {
    renderPage();
    const backBtn = screen.getByRole('button');
    fireEvent.click(backBtn);
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('exibe rodapé com versão LGPD', () => {
    renderPage();
    expect(screen.getByText(/Draft Play · LGPD v1\.0/i)).toBeInTheDocument();
  });
});
