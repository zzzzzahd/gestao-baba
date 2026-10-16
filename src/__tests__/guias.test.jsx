// src/__tests__/guias.test.jsx  (ajuste a pasta ao padrão dos seus outros testes)
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useParams } from 'react-router-dom';
import { GUIAS, getGuia } from '../data/guias';
import GuiasPage from '../pages/GuiasPage';
import GuiaPage from '../pages/GuiaPage';

describe('dados dos guias', () => {
  it('tem 6 guias com slugs únicos, minúsculos e sem espaços', () => {
    expect(GUIAS).toHaveLength(6);
    const slugs = GUIAS.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    slugs.forEach((s) => expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/));
  });

  it('cada guia tem metadados e ao menos 4 seções com h2', () => {
    GUIAS.forEach((g) => {
      expect(g.title.length).toBeGreaterThan(10);
      expect(g.description.length).toBeGreaterThan(50);
      expect(g.description.length).toBeLessThanOrEqual(160);
      expect(g.published).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(g.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(g.intro.length).toBeGreaterThan(50);
      expect(g.sections.length).toBeGreaterThanOrEqual(4);
      g.sections.forEach((s) => expect(s.h2).toBeTruthy());
    });
  });

  it('toda mídia tem src em /marketing/, alt descritivo e legenda', () => {
    const todas = GUIAS.flatMap((g) => g.sections.flatMap((s) => s.media || []));
    expect(todas.length).toBeGreaterThan(0);
    todas.forEach((m) => {
      expect(m.src).toMatch(/^\/marketing\/.+\.(webp|png)$/);
      expect(m.alt.length).toBeGreaterThan(30);
      expect(m.caption.length).toBeGreaterThan(10);
    });
  });

  it('getGuia devolve o guia certo e null para slug inválido', () => {
    expect(getGuia(GUIAS[0].slug)).toBe(GUIAS[0]);
    expect(getGuia('nao-existe')).toBeNull();
  });
});

describe('GuiasPage', () => {
  it('mostra o H1 e um link por guia', () => {
    render(
      <MemoryRouter initialEntries={['/guias']}>
        <GuiasPage />
      </MemoryRouter>
    );
    expect(
      screen.getByRole('heading', { level: 1, name: 'Guias para organizar seu baba' })
    ).toBeInTheDocument();
    GUIAS.forEach((g) => {
      const link = screen.getByRole('heading', { level: 2, name: g.title }).closest('a');
      expect(link).toHaveAttribute('href', `/guias/${g.slug}`);
    });
  });
});

describe('GuiaPage', () => {
  // O setup.js global mocka useParams (sempre {}), então injetamos o slug da URL aqui.
  afterEach(() => useParams.mockReturnValue({}));

  const renderAt = (path) => {
    useParams.mockReturnValue({ slug: path.split('/').pop() });
    return render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/guias/:slug" element={<GuiaPage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renderiza título, introdução e todas as seções de um guia válido', () => {
    const g = GUIAS[0];
    renderAt(`/guias/${g.slug}`);
    expect(screen.getByRole('heading', { level: 1, name: g.title })).toBeInTheDocument();
    expect(screen.getByText(g.intro)).toBeInTheDocument();
    g.sections.forEach((s) => {
      expect(screen.getByRole('heading', { level: 2, name: s.h2 })).toBeInTheDocument();
    });
  });

  it('lista os outros guias e não repete o atual', () => {
    const g = GUIAS[0];
    renderAt(`/guias/${g.slug}`);
    const bloco = screen.getByRole('heading', { level: 2, name: 'Outros guias' }).closest('section');
    expect(within(bloco).getAllByRole('link')).toHaveLength(GUIAS.length - 1);
    expect(within(bloco).queryByRole('link', { name: g.title })).not.toBeInTheDocument();
  });

  it('não mostra o artigo quando o slug é inválido', () => {
    renderAt('/guias/nao-existe');
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });
});
