import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../components/Logo', () => ({ default: () => <div>Logo</div> }));

import FerramentasPage from '../../pages/FerramentasPage';
import TorneioCalculadora from '../../pages/tools/TorneioCalculadora';
import DivisaoDespesas from '../../pages/tools/DivisaoDespesas';
import OrganizadorPresenca from '../../pages/tools/OrganizadorPresenca';
import TabelaJogos from '../../pages/tools/TabelaJogos';
import SorteadorTimes from '../../pages/tools/SorteadorTimes';
import { TOOLS } from '../../content/toolsCatalog';

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);
const type = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('Hub /ferramentas', () => {
  it('tem um h1 e um link para cada ferramenta do catálogo', () => {
    wrap(<FerramentasPage />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    for (const t of TOOLS) {
      expect(screen.getAllByRole('link').some((a) => a.getAttribute('href') === t.path)).toBe(true);
    }
  });
});

describe('Calculadora de torneio', () => {
  it('8 equipes, mata-mata: 7 jogos; 6 equipes pontos corridos ida e volta: 30', () => {
    wrap(<TorneioCalculadora />);
    const results = screen.getByLabelText('Resultado', { selector: 'section' });
    expect(within(results).getAllByText('Jogos')[0].nextSibling.textContent).toBe('7');
    fireEvent.click(screen.getByRole('button', { name: 'Pontos corridos' }));
    type('Equipes', '6');
    fireEvent.click(screen.getByRole('button', { name: 'Ida e volta' }));
    expect(within(screen.getByLabelText('Resultado', { selector: 'section' })).getAllByText('Jogos')[0].nextSibling.textContent).toBe('30');
  });
  it('mostra erro com 1 equipe e some o resultado', () => {
    wrap(<TorneioCalculadora />);
    type('Equipes', '1');
    expect(screen.getByRole('alert').textContent).toMatch(/pelo menos 2 equipes/i);
    expect(screen.queryByText('Resultado')).toBeNull();
  });
  it('campo vazio não quebra', () => {
    wrap(<TorneioCalculadora />);
    type('Equipes', '');
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});

describe('Divisão de despesas', () => {
  it('R$ 200 / 12 pagantes → R$ 16,67 por pessoa', () => {
    wrap(<DivisaoDespesas />);
    type(/Quadra/i, '150');
    type(/Arbitragem/i, '50');
    const r = screen.getByLabelText('Resultado', { selector: 'section' });
    expect(within(r).getByText('Total').nextSibling.textContent).toBe('R$ 200,00');
    expect(within(r).getByText('Por participante').nextSibling.textContent).toBe('R$ 16,67');
  });
  it('valor inválido mostra mensagem', () => {
    wrap(<DivisaoDespesas />);
    type(/Quadra/i, 'abc');
    expect(screen.getByRole('alert').textContent).toMatch(/valor inválido/i);
  });
});

describe('Lista de presença', () => {
  it('conta confirmados, ausentes, reservas e times', () => {
    wrap(<OrganizadorPresenca />);
    type('Lista de jogadores', '1. Ana\n2. Bia\n3. Caio\n4. Davi\n5. Edu\n6. Fer\n7. Gui');
    type('Jogadores por time', '3');
    for (const n of ['Ana', 'Bia', 'Caio', 'Davi', 'Edu', 'Fer', 'Gui']) fireEvent.click(screen.getByLabelText(n));
    const r = screen.getByLabelText('Resumo', { selector: 'section' });
    expect(within(r).getByText('Confirmados').nextSibling.textContent).toBe('7');
    expect(within(r).getByText('Times possíveis').nextSibling.textContent).toBe('2');
    expect(within(r).getByText('Reservas').nextSibling.textContent).toBe('1');
    fireEvent.click(screen.getByLabelText('Gui'));
    expect(within(screen.getByLabelText('Resumo', { selector: 'section' })).getByText('Ausentes').nextSibling.textContent).toBe('1');
  });
});

describe('Tabela de jogos', () => {
  it('gera pontos corridos com folga para 5 equipes', () => {
    wrap(<TabelaJogos />);
    type('Equipes (uma por linha)', 'A\nB\nC\nD\nE');
    fireEvent.click(screen.getByRole('button', { name: 'Gerar tabela' }));
    expect(screen.getAllByText(/^Folga:/).length).toBe(5);
  });
  it('bloqueia nomes repetidos', () => {
    wrap(<TabelaJogos />);
    type('Equipes (uma por linha)', 'A\nB\na');
    expect(screen.getByRole('alert').textContent).toMatch(/repetidos/i);
    expect(screen.getByRole('button', { name: 'Gerar tabela' })).toBeDisabled();
  });
});

describe('Sorteador', () => {
  it('importa lista, sorteia 2 times de 3 e mostra todos os jogadores', () => {
    localStorage.clear();
    wrap(<SorteadorTimes />);
    type('Jogadores por time', '3');
    type(/Ou cole uma lista/i, 'Ana\nBia\nCaio\nDavi\nEdu\nFer');
    fireEvent.click(screen.getByRole('button', { name: 'Importar lista' }));
    fireEvent.click(screen.getByRole('button', { name: /Sortear times/i }));
    const teams = screen.getByLabelText('Times sorteados', { selector: 'section' });
    expect(within(teams).getAllByRole('listitem')).toHaveLength(6);
  });
  it('avisa quando faltam jogadores', () => {
    localStorage.clear();
    wrap(<SorteadorTimes />);
    type('Nome', 'Ana');
    fireEvent.click(screen.getByRole('button', { name: '+ Adicionar' }));
    expect(screen.getByRole('alert').textContent).toMatch(/pelo menos 10 jogadores/i);
  });
});

describe('Exportar imagem dos times', () => {
  const sortear = () => {
    localStorage.clear();
    wrap(<SorteadorTimes />);
    type('Jogadores por time', '3');
    type(/Ou cole uma lista/i, 'Ana\nBia\nCaio\nDavi\nEdu\nFer');
    fireEvent.click(screen.getByRole('button', { name: 'Importar lista' }));
    fireEvent.click(screen.getByRole('button', { name: /Sortear times/i }));
  };
  it('flag desligada: botão baixa direto, sem modal de anúncio', () => {
    sortear();
    window.html2canvas = vi.fn().mockResolvedValue({ toBlob: (cb) => cb(new Blob(['x'])) });
    URL.createObjectURL = vi.fn(() => 'blob:x'); URL.revokeObjectURL = vi.fn();
    fireEvent.click(screen.getByRole('button', { name: /Baixar imagem dos times/i }));
    expect(screen.queryByText(/Assista a um anúncio curto/i)).toBeNull();
    expect(window.html2canvas).toHaveBeenCalled();
  });
  it('flag ligada: abre o modal e só gera a imagem depois', () => {
    vi.stubEnv('VITE_TOOLS_REWARDED_EXPORT', 'true');
    sortear();
    window.html2canvas = vi.fn();
    fireEvent.click(screen.getByRole('button', { name: /Baixar imagem dos times/i }));
    expect(screen.getByText(/Assista a um anúncio curto/i)).toBeInTheDocument();
    expect(window.html2canvas).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });
  it('sem html2canvas mostra erro amigável e o texto continua copiável', () => {
    sortear();
    delete window.html2canvas;
    fireEvent.click(screen.getByRole('button', { name: /Baixar imagem dos times/i }));
    expect(screen.getByRole('alert').textContent).toMatch(/Copiar times/);
    expect(screen.getByRole('button', { name: /Copiar times/i })).toBeInTheDocument();
  });
});

import GeradorRegulamento from '../../pages/tools/GeradorRegulamento';
import ControleFinanceiro from '../../pages/tools/ControleFinanceiro';

describe('Gerador de regulamento', () => {
  it('exige o nome e mantém o botão desabilitado', () => {
    wrap(<GeradorRegulamento />);
    expect(screen.getByRole('alert').textContent).toMatch(/nome do torneio/i);
    expect(screen.getByRole('button', { name: 'Gerar regulamento' })).toBeDisabled();
  });
  it('gera o texto, que fica editável, e some a seção de pontuação no mata-mata', () => {
    wrap(<GeradorRegulamento />);
    type('Nome do torneio', 'Copa Teste');
    fireEvent.click(screen.getByRole('button', { name: 'Gerar regulamento' }));
    const ta = screen.getByLabelText('Texto do regulamento');
    expect(ta.value).toContain('COPA TESTE');
    expect(ta.value).toMatch(/PONTUAÇÃO, CLASSIFICAÇÃO E DESEMPATE/);
    fireEvent.change(ta, { target: { value: 'editado' } });
    expect(screen.getByLabelText('Texto do regulamento').value).toBe('editado');
    fireEvent.click(screen.getByRole('button', { name: 'Mata-mata' }));
    expect(screen.getByRole('status').textContent).toMatch(/Gerar novamente/);
    fireEvent.click(screen.getByRole('button', { name: 'Gerar novamente' }));
    expect(screen.getByLabelText('Texto do regulamento').value).not.toMatch(/PONTUAÇÃO/);
  });
  it('reordena critérios de desempate', () => {
    wrap(<GeradorRegulamento />);
    type('Nome do torneio', 'Copa');
    fireEvent.click(screen.getByRole('button', { name: /Descer Maior número de vitórias/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Gerar regulamento' }));
    const t = screen.getByLabelText('Texto do regulamento').value;
    expect(t.indexOf('saldo de gols')).toBeLessThan(t.indexOf('número de vitórias'));
  });
});

describe('Controle financeiro', () => {
  it('calcula saldo atual e se todos pagarem', () => {
    wrap(<ControleFinanceiro />);
    type('Contribuição por jogador (R$)', '50');
    type('Jogadores (um por linha)', 'Ana\nBia\nCaio\nDavi');
    fireEvent.click(screen.getByLabelText('Ana'));
    fireEvent.click(screen.getByLabelText('Bia'));
    fireEvent.change(screen.getByLabelText('Despesas: descrição 1'), { target: { value: 'Quadra' } });
    fireEvent.change(screen.getByLabelText('Despesas: valor 1 (R$)'), { target: { value: '120' } });
    const r = screen.getByLabelText(/^Resumo/, { selector: 'section' });
    expect(within(r).getByText('Saldo atual').nextSibling.textContent).toBe('-R$ 20,00');
    expect(within(r).getByText('Se todos pagarem').nextSibling.textContent).toBe('R$ 80,00');
    expect(r.textContent).toMatch(/Pagaram 2 de 4/);
    expect(r.textContent).toMatch(/Pendentes: Caio, Davi/);
  });
  it('valor inválido gera alerta', () => {
    wrap(<ControleFinanceiro />);
    type('Contribuição por jogador (R$)', 'abc');
    expect(screen.getByRole('alert').textContent).toMatch(/valor inválido/i);
  });
  it('linhas de despesa podem ser adicionadas e removidas', () => {
    wrap(<ControleFinanceiro />);
    fireEvent.click(screen.getAllByRole('button', { name: /Adicionar linha/i })[1]);
    expect(screen.getByLabelText('Despesas: descrição 2')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Remover linha 2 de Despesas'));
    expect(screen.queryByLabelText('Despesas: descrição 2')).toBeNull();
  });
});
