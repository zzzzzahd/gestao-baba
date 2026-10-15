import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../components/Logo', () => ({ default: () => <div>Logo</div> }));

import ModelosTorneioPage from '../../pages/ModelosTorneioPage';
import { MODELO_PAGES } from '../../pages/modelos/modeloPages';
import PontosCorridos from '../../pages/modelos/PontosCorridos';
import ControleArtilharia from '../../pages/modelos/ControleArtilharia';
import OrcamentoTorneio from '../../pages/modelos/OrcamentoTorneio';
import CalendarioPartidas from '../../pages/modelos/CalendarioPartidas';
import TabelaMataMata from '../../pages/modelos/TabelaMataMata';
import GruposClassificacao from '../../pages/modelos/GruposClassificacao';
import CriteriosDesempate from '../../pages/modelos/CriteriosDesempate';
import { MODELOS, modeloPath } from '../../content/modelosCatalog';

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);
const type = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('catálogo e hub', () => {
  it('o mapa de páginas cobre exatamente o catálogo', () => {
    expect(Object.keys(MODELO_PAGES).sort()).toEqual(MODELOS.map((m) => modeloPath(m.slug)).sort());
  });
  it('hub lista os 10 modelos e filtra por categoria', () => {
    wrap(<ModelosTorneioPage />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    for (const m of MODELOS) {
      expect(screen.getAllByRole('link').some((a) => a.getAttribute('href') === modeloPath(m.slug))).toBe(true);
    }
    fireEvent.click(screen.getByRole('button', { name: 'Finanças' }));
    const cards = screen.getAllByRole('heading', { level: 2 }).filter((h) => h.closest('li') && h.closest('ul')?.className.includes('grid'));
    expect(cards.map((h) => h.textContent)).toEqual(['Orçamento do torneio']);
  });
  it.each(MODELOS.map((m) => [m.slug, MODELO_PAGES[modeloPath(m.slug)]]))('%s renderiza com um único h1', (slug, Page) => {
    wrap(<Page />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });
  it('modelos com prévia inicial oferecem copiar, imprimir e baixar', () => {
    for (const slug of ['tabela-mata-mata', 'grupos-e-classificacao', 'calendario-de-partidas', 'controle-de-resultados', 'lista-presenca-por-equipe', 'regulamento-torneio-interno', 'criterios-de-desempate']) {
      const { unmount } = wrap(React.createElement(MODELO_PAGES[modeloPath(slug)]));
      for (const name of [/Copiar modelo/i, /Imprimir/i, /Baixar \.txt/i]) expect(screen.getByRole('button', { name })).toBeInTheDocument();
      unmount();
    }
  });
});

describe('Pontos corridos com classificação automática', () => {
  it('placar preenchido atualiza a classificação', () => {
    wrap(<PontosCorridos />);
    fireEvent.change(screen.getByLabelText('Gols de Equipe 1 contra Equipe 4, rodada 1'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Gols de Equipe 4 contra Equipe 1, rodada 1'), { target: { value: '0' } });
    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row').slice(1);
    const first = within(rows[0]).getAllByRole('cell').map((c) => c.textContent);
    expect(within(rows[0]).getByRole('rowheader').textContent).toContain('Equipe 1');
    expect(first[1]).toBe('3'); // pontos
    expect(screen.getByLabelText('Texto para copiar: jogos e classificação').textContent).toMatch(/Equipe 1\s+3\s+1\s+1/);
  });
  it('pontuação incoerente mostra erro', () => {
    wrap(<PontosCorridos />);
    type('Pontos por vitória', '1');
    expect(screen.getByRole('alert').textContent).toMatch(/vitória maior que empate/i);
  });
});

describe('Artilharia', () => {
  it('soma gols repetidos e divide posição em caso de empate', () => {
    wrap(<ControleArtilharia />);
    const set = (i, p, t, g) => {
      type(`Jogador ${i}`, p); type(`Equipe do jogador ${i}`, t); type(`Gols do jogador ${i}`, g);
    };
    set(1, 'João', 'A', '2'); set(2, 'joao', 'a', '1'); set(3, 'Pedro', 'B', '3');
    const pre = screen.getByLabelText('Texto do ranking de artilheiros').textContent;
    expect(pre).toMatch(/1\s+João\s+A\s+3/);
    expect(pre).toMatch(/1\s+Pedro\s+B\s+3/);
  });
  it('avisa sobre linhas incompletas', () => {
    wrap(<ControleArtilharia />);
    type('Jogador 1', 'Sem gols');
    expect(screen.getByRole('status').textContent).toMatch(/1 linha\(s\) incompleta/);
  });
});

describe('Orçamento do torneio', () => {
  it('calcula saldo e inscrição para cobrir', () => {
    wrap(<OrcamentoTorneio />);
    fireEvent.change(screen.getByLabelText('Despesas: valor 1 (R$)'), { target: { value: '1000' } });
    fireEvent.change(screen.getByLabelText('Despesas: valor 2 (R$)'), { target: { value: '300' } });
    const r = screen.getByLabelText('Resumo do orçamento', { selector: 'section' });
    expect(within(r).getByText('Saldo previsto').nextSibling.textContent).toBe('-R$ 1.300,00');
    expect(within(r).getByText('Inscrição p/ cobrir').nextSibling.textContent).toBe('R$ 162,50');
  });
});

describe('Calendário de partidas', () => {
  it('mostra o término previsto e valida o horário', () => {
    wrap(<CalendarioPartidas />);
    expect(screen.getByLabelText('Prévia do calendário de partidas').textContent).toMatch(/Término previsto: 01:10/);
    fireEvent.change(screen.getByLabelText('Horário de início'), { target: { value: '' } });
    expect(screen.getByRole('alert').textContent).toMatch(/horário de início/i);
  });
});

describe('Tabelas e grupos', () => {
  it('mata-mata com 8 equipes termina em Final com campeão', () => {
    wrap(<TabelaMataMata />);
    const t = screen.getByLabelText('Prévia da tabela de mata-mata').textContent;
    expect(t).toMatch(/Quartas de final/);
    expect(t).toMatch(/Campeão:/);
  });
  it('grupos: valida quantidade de grupos', () => {
    wrap(<GruposClassificacao />);
    type('Quantidade de grupos', '5');
    expect(screen.getByRole('alert').textContent).toMatch(/pelo menos 2 equipes/i);
  });
});

describe('Critérios de desempate', () => {
  it('trocar a ordem altera o texto', () => {
    wrap(<CriteriosDesempate />);
    expect(screen.getByLabelText('Texto dos critérios de desempate').textContent).toMatch(/1\. Maior número de vitórias/);
    fireEvent.click(screen.getByRole('button', { name: 'Confronto direto primeiro' }));
    expect(screen.getByLabelText('Texto dos critérios de desempate').textContent).toMatch(/1\. Confronto direto/);
  });
});
