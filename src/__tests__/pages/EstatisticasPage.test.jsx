import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../components/Logo', () => ({ default: () => <div>Logo</div> }));

import EstatisticasPage from '../../pages/EstatisticasPage';

const renderPage = () => render(<MemoryRouter><EstatisticasPage /></MemoryRouter>);
const select = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('/estatisticas', () => {
  it('um único h1, índice com âncoras existentes e aviso de dados fictícios em cada demonstração', () => {
    renderPage();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    const nav = screen.getByRole('navigation', { name: 'Nesta página' });
    for (const a of within(nav).getAllByRole('link')) {
      const id = a.getAttribute('href').slice(1);
      expect(document.getElementById(id), `âncora #${id}`).not.toBeNull();
    }
    // topo + 6 demonstrações (perfil, ranking, comparação, histórico, evolução, times)
    expect(screen.getAllByRole('note').length).toBeGreaterThanOrEqual(7);
    screen.getAllByRole('note').forEach((n) => expect(n.textContent).toMatch(/fictícios/i));
  });

  it('todos os atletas são identificados como fictícios e nenhum nome real aparece', () => {
    renderPage();
    const options = screen.getAllByRole('option').map((o) => o.textContent);
    expect(options.length).toBeGreaterThan(0);
    options.forEach((o) => expect(o).toMatch(/^Atleta /));
  });

  it('perfil mostra números derivados das partidas (Alfa: 16 gols, 60%)', () => {
    renderPage();
    const card = screen.getByRole('heading', { name: 'Atleta Alfa', level: 3 }).closest('div').parentElement;
    expect(card.textContent).toMatch(/Gols\s*16/);
    expect(card.textContent).toMatch(/Aproveit\.\s*60%/);
    expect(card.textContent).toMatch(/Platina/);
  });

  it('ranking alterna entre gols, assistências e MVP', () => {
    renderPage();
    const section = document.getElementById('ranking');
    const rows = () => within(section).getAllByRole('row').slice(1);
    expect(within(rows()[0]).getByRole('rowheader').textContent).toBe('Atleta Alfa');
    fireEvent.click(within(section).getByRole('button', { name: 'MVP' }));
    expect(rows()[0].textContent).toMatch(/\(\d+ \+ \d+\)/);
    fireEvent.click(within(section).getByRole('button', { name: 'Assistências' }));
    expect(within(section).getByRole('table').textContent).toMatch(/assist\./);
  });

  it('comparação destaca quem está à frente e bloqueia comparar o mesmo jogador', () => {
    renderPage();
    const section = document.getElementById('comparacao');
    expect(within(section).getAllByText('(à frente)', { exact: false }).length).toBeGreaterThan(0);
    expect(within(section).getByText(/Gols por partida \(cálculo didático\)/)).toBeInTheDocument();
    expect(within(section).queryByRole('status')).toBeNull(); // Alfa e Bravo jogaram as mesmas 10 partidas
    fireEvent.change(within(section).getByLabelText('Jogador B'), { target: { value: 'hotel' } });
    expect(within(section).getByRole('status').textContent).toMatch(/jogou 10 partidas e Atleta Hotel jogou 6/);
    fireEvent.change(within(section).getByLabelText('Jogador B'), { target: { value: 'alfa' } });
    expect(within(section).getByRole('alert').textContent).toMatch(/dois jogadores diferentes/i);
    expect(within(section).queryByRole('table')).toBeNull();
  });

  it('histórico tem 10 partidas e números coletivos coerentes', () => {
    renderPage();
    const section = document.getElementById('historico');
    expect(within(section).getAllByText(/^Partida \d+:/, { exact: false }).length).toBe(10);
    expect(section.textContent).toMatch(/10 partidas, \d+ gols/);
    expect(section.textContent).toMatch(/Maior placar: 4 x 1 \(partida 7\)/);
  });

  it('evolução oferece gráfico acessível com tabela de números', () => {
    renderPage();
    const section = document.getElementById('evolucao');
    const imgs = within(section).getAllByRole('img');
    expect(imgs.length).toBe(2);
    imgs.forEach((i) => expect(i.getAttribute('aria-label')).toMatch(/Partida 1/));
    expect(within(section).getAllByText('Ver os números')).toHaveLength(2);
  });

  it('critérios usam a tabela real de divisões e dizem que as notas não afetam o sorteio', () => {
    renderPage();
    const section = document.getElementById('criterios');
    for (const d of ['Ferro', 'Bronze', 'Prata', 'Ouro', 'Platina', 'Diamante']) expect(section.textContent).toContain(d);
    expect(section.textContent).toMatch(/não afetam o sorteio/);
  });

  it('montagem de equipes: 2 times de 5, resultado inicial estável e botão de novo sorteio', () => {
    renderPage();
    const section = document.getElementById('times');
    const first = section.textContent;
    expect(within(section).getAllByRole('listitem')).toHaveLength(10);
    fireEvent.click(within(section).getByRole('button', { name: /Sortear de novo/ }));
    expect(within(section).getAllByRole('listitem')).toHaveLength(10);
    expect(first).toMatch(/TIME A/);
  });
});
