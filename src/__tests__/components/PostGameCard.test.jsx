// src/__tests__/components/PostGameCard.test.jsx
// Componente: card de placar para Stories/WhatsApp

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PostGameCard from '../../components/PostGameCard';

const mkMatch = (o = {}) => ({
  teamA: { name: 'Vermelho' },
  teamB: { name: 'Verde' },
  scoreA: 2,
  scoreB: 1,
  ...o,
});

const mk = (props = {}) =>
  render(
    <PostGameCard
      match={mkMatch()}
      babaName="Pelada das Sextas"
      {...props}
    />
  );

describe('PostGameCard › null guard', () => {
  it('não renderiza nada quando match=null', () => {
    const { container } = render(<PostGameCard match={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('não renderiza nada quando match=undefined', () => {
    const { container } = render(<PostGameCard />);
    expect(container.firstChild).toBeNull();
  });
});

describe('PostGameCard › estrutura', () => {
  it('exibe label RESULTADO', () => {
    mk();
    expect(screen.getByText('RESULTADO')).toBeInTheDocument();
  });

  it('exibe babaName', () => {
    mk({ babaName: 'Baba do Zé' });
    expect(screen.getByText('Baba do Zé')).toBeInTheDocument();
  });

  it('exibe rodapé DRAFT PLAY', () => {
    mk();
    expect(screen.getByText('DRAFT PLAY')).toBeInTheDocument();
  });

  it('exibe separador ×', () => {
    mk();
    expect(screen.getByText('×')).toBeInTheDocument();
  });
});

describe('PostGameCard › placar', () => {
  it('exibe nomes dos dois times', () => {
    mk({
      match: mkMatch({
        teamA: { name: 'Vermelho' },
        teamB: { name: 'Verde' },
      }),
    });
    expect(screen.getByText('Vermelho')).toBeInTheDocument();
    expect(screen.getByText('Verde')).toBeInTheDocument();
  });

  it('exibe scores numéricos', () => {
    const { container } = render(
      <PostGameCard match={mkMatch({ scoreA: 3, scoreB: 1 })} />
    );
    expect(container.textContent).toContain('3');
    expect(container.textContent).toContain('1');
  });

  it('fallback "Time A" e "Time B" quando teams não têm name', () => {
    mk({
      match: {
        teamA: {},
        teamB: {},
        scoreA: 1,
        scoreB: 0,
      },
    });
    expect(screen.getByText('Time A')).toBeInTheDocument();
    expect(screen.getByText('Time B')).toBeInTheDocument();
  });

  it('fallback quando teamA/B são null', () => {
    mk({
      match: {
        teamA: null,
        teamB: null,
        scoreA: 1,
        scoreB: 0,
      },
    });
    expect(screen.getByText('Time A')).toBeInTheDocument();
    expect(screen.getByText('Time B')).toBeInTheDocument();
  });

  it('default 0×0 quando scores ausentes', () => {
    const { container } = render(
      <PostGameCard
        match={{
          teamA: { name: 'A' },
          teamB: { name: 'B' },
        }}
      />
    );
    const zeros = container.querySelectorAll('p.text-5xl');
    expect([...zeros].some((el) => el.textContent === '0')).toBe(true);
  });

  it('suporta placar alto (10 × 8)', () => {
    const { container } = render(
      <PostGameCard match={mkMatch({ scoreA: 10, scoreB: 8 })} />
    );
    expect(container.textContent).toContain('10');
    expect(container.textContent).toContain('8');
  });
});

describe('PostGameCard › resultado vitória', () => {
  it('exibe "venceu" quando time A ganha', () => {
    mk({
      match: mkMatch({
        teamA: { name: 'Azul' },
        scoreA: 3,
        scoreB: 1,
      }),
    });
    expect(screen.getByText(/Azul venceu/i)).toBeInTheDocument();
  });

  it('exibe "venceu" do time B quando B ganha', () => {
    mk({
      match: mkMatch({
        teamA: { name: 'Branco' },
        teamB: { name: 'Preto' },
        scoreA: 0,
        scoreB: 2,
      }),
    });
    expect(screen.getByText(/Preto venceu/i)).toBeInTheDocument();
  });

  it('ícone Trophy presente quando não empate', () => {
    const { container } = mk({ match: mkMatch({ scoreA: 2, scoreB: 0 }) });
    expect(container.querySelector('svg')).not.toBeNull();
  });
});

describe('PostGameCard › resultado empate', () => {
  it('exibe "Empate" em 1×1', () => {
    mk({ match: mkMatch({ scoreA: 1, scoreB: 1 }) });
    expect(screen.getByText(/empate/i)).toBeInTheDocument();
  });

  it('exibe "Empate" em 0×0', () => {
    mk({ match: mkMatch({ scoreA: 0, scoreB: 0 }) });
    expect(screen.getByText(/empate/i)).toBeInTheDocument();
  });

  it('NÃO exibe "venceu" em empate', () => {
    mk({ match: mkMatch({ scoreA: 2, scoreB: 2 }) });
    expect(screen.queryByText(/venceu/i)).toBeNull();
  });
});

describe('PostGameCard › MVP', () => {
  it('exibe nome do MVP quando fornecido', () => {
    mk({ mvpName: 'Ronaldo' });
    expect(screen.getByText('Ronaldo')).toBeInTheDocument();
  });

  it('exibe label "⭐ MVP', () => {
    mk({ mvpName: 'Ronaldo' });
    expect(screen.getByText(/MVP:/)).toBeInTheDocument();
  });

  it('NÃO exibe seção MVP quando mvpName=null', () => {
    mk({ mvpName: null });
    expect(screen.queryByText(/MVP:/)).toBeNull();
  });

  it('NÃO exibe seção MVP quando mvpName=undefined', () => {
    mk();
    expect(screen.queryByText(/MVP:/)).toBeNull();
  });
});
