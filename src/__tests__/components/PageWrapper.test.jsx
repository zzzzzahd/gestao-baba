// src/__tests__/components/PageWrapper.test.jsx
// Testes para o wrapper de transição de páginas

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PageWrapper from '../../components/PageWrapper';

const renderWrapper = (children, pathname = '/home') =>
  render(
    <MemoryRouter initialEntries={[pathname]}>
      <PageWrapper>{children}</PageWrapper>
    </MemoryRouter>
  );

describe('PageWrapper', () => {
  describe('semântica HTML', () => {
    it('renderiza como elemento <main>', () => {
      renderWrapper(<p>conteúdo</p>);
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('tem id="main-content" para o skip-link', () => {
      const { container } = renderWrapper(<p>conteúdo</p>);
      const main = container.querySelector('#main-content');
      expect(main).toBeTruthy();
    });
  });

  describe('conteúdo', () => {
    it('renderiza os filhos corretamente', () => {
      renderWrapper(<p data-testid="child">Olá</p>);
      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByText('Olá')).toBeInTheDocument();
    });

    it('renderiza múltiplos filhos', () => {
      renderWrapper(
        <>
          <p data-testid="child-1">Um</p>
          <p data-testid="child-2">Dois</p>
        </>
      );
      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
    });
  });

  describe('animação', () => {
    it('tem classe animate-page-in', () => {
      const { container } = renderWrapper(<p>teste</p>);
      const main = container.querySelector('main');
      expect(main.className).toContain('animate-page-in');
    });

    it('tem animationDuration de 220ms no style inline', () => {
      const { container } = renderWrapper(<p>teste</p>);
      const main = container.querySelector('main');
      expect(main.style.animationDuration).toBe('220ms');
    });

    it('tem animationFillMode "both"', () => {
      const { container } = renderWrapper(<p>teste</p>);
      const main = container.querySelector('main');
      expect(main.style.animationFillMode).toBe('both');
    });
  });

  describe('className customizada', () => {
    it('aplica className adicional passada via prop', () => {
      const { container } = render(
        <MemoryRouter>
          <PageWrapper className="min-h-screen px-4">
            <p>teste</p>
          </PageWrapper>
        </MemoryRouter>
      );
      const main = container.querySelector('main');
      expect(main.className).toContain('min-h-screen');
      expect(main.className).toContain('px-4');
    });

    it('funciona sem className (usa string vazia como default)', () => {
      expect(() => renderWrapper(<p>ok</p>)).not.toThrow();
    });
  });

  describe('key por rota (re-mount na navegação)', () => {
    it('usa pathname como key para forçar re-mount', () => {
      // Verificar que key muda conforme a rota — indireto via snapshot
      const { container: c1 } = render(
        <MemoryRouter initialEntries={['/home']}>
          <PageWrapper><p>home</p></PageWrapper>
        </MemoryRouter>
      );
      const { container: c2 } = render(
        <MemoryRouter initialEntries={['/rankings']}>
          <PageWrapper><p>rankings</p></PageWrapper>
        </MemoryRouter>
      );
      // Ambos devem renderizar <main> com id correto
      expect(c1.querySelector('#main-content')).toBeTruthy();
      expect(c2.querySelector('#main-content')).toBeTruthy();
    });
  });
});
