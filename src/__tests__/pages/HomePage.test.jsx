// src/__tests__/pages/HomePage.test.jsx

import React from 'react';
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
} from 'vitest';

import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react';

import { MemoryRouter } from 'react-router-dom';

import HomePage from '../../pages/HomePage';

// -----------------------------------------------------------------------------
// Router
// -----------------------------------------------------------------------------

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// -----------------------------------------------------------------------------
// Logo
// -----------------------------------------------------------------------------

vi.mock('../../components/Logo', () => ({
  default: () => <div data-testid="logo">Logo</div>,
}));

// -----------------------------------------------------------------------------
// PullToRefreshIndicator
// -----------------------------------------------------------------------------

vi.mock('../../components/PullToRefreshIndicator', () => ({
  default: () => null,
}));

// -----------------------------------------------------------------------------
// CreateTournamentModal
// -----------------------------------------------------------------------------

vi.mock('../../components/CreateTournamentModal', () => ({
  default: ({ open }) =>
    open ? (
      <div data-testid="tournament-modal">
        Tournament Modal
      </div>
    ) : null,
}));

// -----------------------------------------------------------------------------
// PullToRefresh Hook
// -----------------------------------------------------------------------------

vi.mock('../../hooks/usePullToRefresh', () => ({
  usePullToRefresh: () => ({
    pulling: false,
    pullY: 0,
    refreshing: false,
    progress: 0,
  }),
}));

// -----------------------------------------------------------------------------
// Toast
// -----------------------------------------------------------------------------

const toastError = vi.fn();
const toastSuccess = vi.fn();

vi.mock('react-hot-toast', () => ({
  default: {
    error: toastError,
    success: toastSuccess,
  },
}));

// -----------------------------------------------------------------------------
// Supabase
// -----------------------------------------------------------------------------

const orderMock = vi.fn(() =>
  Promise.resolve({
    data: [],
    error: null,
  })
);

const eqMock = vi.fn(() => ({
  order: orderMock,
}));

const selectMock = vi.fn(() => ({
  eq: eqMock,
}));

const fromMock = vi.fn(() => ({
  select: selectMock,
}));

vi.mock('../../services/supabase', () => ({
  supabase: {
    from: fromMock,
  },
}));

// -----------------------------------------------------------------------------
// Auth Context
// -----------------------------------------------------------------------------

let mockAuth = {
  profile: {
    name: 'Zico',
    avatar_url: null,
  },

  user: {
    id: 'user-1',
  },
};

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

// -----------------------------------------------------------------------------
// Baba Context
// -----------------------------------------------------------------------------

let mockBaba = {
  myBabas: [],

  setCurrentBaba: vi.fn(),

  joinBaba: vi.fn(),

  loading: false,

  syncData: vi.fn(),
};

vi.mock('../../contexts/BabaContext', () => ({
  useBaba: () => mockBaba,
}));

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const renderPage = () =>
  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>
  );

const baba1 = {
  id: '1',
  name: 'Baba do Zé',
  game_days_config: [6],
  game_time: '09:00:00',
  logo_url: null,
  modality: 'Futebol',
};

const baba2 = {
  id: '2',
  name: 'Pelada das Sextas',
  game_days_config: [5],
  game_time: '19:00:00',
  logo_url: null,
  modality: 'Futebol',
};

// -----------------------------------------------------------------------------
// Reset
// -----------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();

  mockNavigate.mockReset();

  mockAuth = {
    profile: {
      name: 'Zico',
      avatar_url: null,
    },

    user: {
      id: 'user-1',
    },
  };

  mockBaba = {
    myBabas: [],

    setCurrentBaba: vi.fn(),

    joinBaba: vi.fn(),

    loading: false,

    syncData: vi.fn(),
  };

  orderMock.mockResolvedValue({
    data: [],
    error: null,
  });
});

// -----------------------------------------------------------------------------
// Render
// -----------------------------------------------------------------------------

describe('HomePage - renderização', () => {
  it('renderiza sem lançar erro', () => {
    expect(() => renderPage()).not.toThrow();
  });

  it('exibe a Logo', () => {
    renderPage();

    expect(
      screen.getByTestId('logo')
    ).toBeInTheDocument();
  });

  it('exibe o avatar do usuário', () => {
    renderPage();

    expect(
      screen.getByText('Z')
    ).toBeInTheDocument();
  });

  it('exibe seção de torneios', () => {
    renderPage();

    expect(
      screen.getByText(/Meus Torneios/i)
    ).toBeInTheDocument();
  });

  it('exibe caixa de convite', () => {
    renderPage();

    expect(
      screen.getByPlaceholderText('AB12CD')
    ).toBeInTheDocument();
  });
});

// -----------------------------------------------------------------------------
// Loading
// -----------------------------------------------------------------------------

describe('HomePage - loading', () => {
  it('mostra spinner quando loading=true', () => {
    mockBaba.loading = true;

    const { container } = renderPage();

    expect(
      container.querySelector('.animate-spin')
    ).not.toBeNull();
  });

  it('não mostra estado vazio durante loading', () => {
    mockBaba.loading = true;

    renderPage();

    expect(
      screen.queryByText(/Bem-vindo ao Draft/i)
    ).toBeNull();
  });
});

// -----------------------------------------------------------------------------
// Estado vazio
// -----------------------------------------------------------------------------

describe('HomePage - estado vazio', () => {
  it('mostra mensagem principal', () => {
    renderPage();

    expect(
      screen.getByText(/Bem-vindo ao Draft/i)
    ).toBeInTheDocument();
  });

  it('mostra botão Criar meu Baba', () => {
    renderPage();

    expect(
      screen.getByRole('button', {
        name: /Criar meu Baba/i,
      })
    ).toBeInTheDocument();
  });

  it('mostra botão Entrar com código de convite', () => {
    renderPage();

    expect(
      screen.getByRole('button', {
        name: /Entrar com código de convite/i,
      })
    ).toBeInTheDocument();
  });

  it('clicar em Criar meu Baba navega para /create', () => {
    renderPage();

    fireEvent.click(
      screen.getByRole('button', {
        name: /Criar meu Baba/i,
      })
    );

    expect(mockNavigate).toHaveBeenCalledWith('/create');
  });
});

// -----------------------------------------------------------------------------
// Com babas
// -----------------------------------------------------------------------------

describe('HomePage - com babas', () => {
  beforeEach(() => {
    mockBaba.myBabas = [baba1, baba2];
  });

  it('exibe o hero card do primeiro baba', () => {
    renderPage();

    expect(
      screen.getByText('Baba do Zé')
    ).toBeInTheDocument();
  });

  it('exibe a seção Meus Babas', () => {
    renderPage();

    expect(
      screen.getByText(/Meus Babas \(2\)/i)
    ).toBeInTheDocument();
  });

  it('exibe os dois babas', () => {
    renderPage();

    expect(
      screen.getAllByText('Baba do Zé').length
    ).toBeGreaterThan(0);

    expect(
      screen.getByText('Pelada das Sextas')
    ).toBeInTheDocument();
  });

  it('mostra a inicial quando não existe logo', () => {
    renderPage();

    expect(
      screen.getAllByText('B').length
    ).toBeGreaterThan(0);
  });

  it('mostra o horário do jogo', () => {
    renderPage();

    expect(
      screen.getByText(/09:00/)
    ).toBeInTheDocument();
  });

  it('abre dashboard ao clicar no hero', () => {
    renderPage();

    fireEvent.click(
      screen.getAllByText('Baba do Zé')[0].closest('button')
    );

    expect(
      mockBaba.setCurrentBaba
    ).toHaveBeenCalledWith(baba1);

    expect(
      mockNavigate
    ).toHaveBeenCalledWith('/dashboard');
  });

  it('abre dashboard ao clicar no segundo baba', () => {
    renderPage();

    fireEvent.click(
      screen.getByText('Pelada das Sextas').closest('button')
    );

    expect(
      mockBaba.setCurrentBaba
    ).toHaveBeenCalledWith(baba2);

    expect(
      mockNavigate
    ).toHaveBeenCalledWith('/dashboard');
  });
});

// -----------------------------------------------------------------------------
// Avatar
// -----------------------------------------------------------------------------

describe('HomePage - avatar', () => {
  it('mostra inicial do usuário', () => {
    renderPage();

    expect(
      screen.getByText('Z')
    ).toBeInTheDocument();
  });

  it('navega para profile ao clicar no avatar', () => {
    renderPage();

    fireEvent.click(
      screen.getByText('Z').closest('button')
    );

    expect(
      mockNavigate
    ).toHaveBeenCalledWith('/profile');
  });

  it('renderiza imagem quando avatar_url existe', () => {
    mockAuth.profile.avatar_url =
      'https://teste.com/avatar.png';

    renderPage();

    expect(
      document.querySelector('img')
    ).not.toBeNull();
  });
});

// -----------------------------------------------------------------------------
// Torneios
// -----------------------------------------------------------------------------

describe('HomePage - torneios', () => {
  it('consulta torneios no Supabase', async () => {
    renderPage();

    await waitFor(() => {
      expect(fromMock).toHaveBeenCalledWith(
        'tournaments'
      );
    });

    expect(selectMock).toHaveBeenCalledWith('*');

    expect(eqMock).toHaveBeenCalledWith(
      'user_id',
      'user-1'
    );
  });

  it('mostra mensagem quando não existem torneios', async () => {
    renderPage();

    expect(
      await screen.findByText(/Nenhum torneio ainda/i)
    ).toBeInTheDocument();
  });

  it('mostra torneios retornados pelo Supabase', async () => {
    orderMock.mockResolvedValue({
      data: [
        {
          id: 't1',
          name: 'Copa Verão',
          sport: 'Futebol',
          format: 'knockout',
          status: 'active',
        },
      ],
      error: null,
    });

    renderPage();

    expect(
      await screen.findByText('Copa Verão')
    ).toBeInTheDocument();
  });

  it('abre torneio ao clicar', async () => {
    orderMock.mockResolvedValue({
      data: [
        {
          id: 't1',
          name: 'Copa Verão',
          sport: 'Futebol',
          format: 'knockout',
          status: 'active',
        },
      ],
      error: null,
    });

    renderPage();

    fireEvent.click(
      await screen.findByText('Copa Verão')
    );

    expect(
      mockNavigate
    ).toHaveBeenCalledWith('/torneio/t1');
  });

  it('mostra badge Finalizado', async () => {
    orderMock.mockResolvedValue({
      data: [
        {
          id: 't2',
          name: 'Liga 2025',
          sport: 'Futebol',
          format: 'league',
          status: 'finished',
        },
      ],
      error: null,
    });

    renderPage();

    expect(
      await screen.findByText(/Finalizado/i)
    ).toBeInTheDocument();
  });
});

// -----------------------------------------------------------------------------
// Countdown
// -----------------------------------------------------------------------------

describe('HomePage - countdown', () => {
  beforeEach(() => {
    mockBaba.myBabas = [baba1];
  });

  it('renderiza hero card normalmente', () => {
    renderPage();

    expect(
      screen.getByText('Baba do Zé')
    ).toBeInTheDocument();
  });

  it('renderiza o horário do jogo', () => {
    renderPage();

    expect(
      screen.getByText(/09:00/)
    ).toBeInTheDocument();
  });
});

// -----------------------------------------------------------------------------
// Join por código
// -----------------------------------------------------------------------------

describe('HomePage - join por código', () => {
  it('input aceita somente letras maiúsculas e números', () => {
    renderPage();

    const input = screen.getByPlaceholderText('AB12CD');

    fireEvent.change(input, {
      target: {
        value: 'ab@#12',
      },
    });

    expect(input.value).toBe('AB12');
  });

  it('botão inicia desabilitado', () => {
    renderPage();

    expect(
      screen.getByRole('button', {
        name: /Entrar no Baba/i,
      })
    ).toBeDisabled();
  });

  it('habilita botão com 6 caracteres', () => {
    renderPage();

    const input = screen.getByPlaceholderText('AB12CD');

    fireEvent.change(input, {
      target: {
        value: 'ABC123',
      },
    });

    expect(
      screen.getByRole('button', {
        name: /Entrar no Baba/i,
      })
    ).not.toBeDisabled();
  });

  it('chama joinBaba', async () => {
    mockBaba.joinBaba.mockResolvedValue({
      id: '1',
    });

    renderPage();

    fireEvent.change(
      screen.getByPlaceholderText('AB12CD'),
      {
        target: {
          value: 'ABC123',
        },
      }
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: /Entrar no Baba/i,
      })
    );

    await waitFor(() => {
      expect(
        mockBaba.joinBaba
      ).toHaveBeenCalledWith('ABC123');
    });
  });

  it('navega após join com sucesso', async () => {
    mockBaba.joinBaba.mockResolvedValue({
      id: '1',
    });

    renderPage();

    fireEvent.change(
      screen.getByPlaceholderText('AB12CD'),
      {
        target: {
          value: 'ABC123',
        },
      }
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: /Entrar no Baba/i,
      })
    );

    await waitFor(() => {
      expect(
        mockNavigate
      ).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('não navega quando join retorna null', async () => {
    mockBaba.joinBaba.mockResolvedValue(null);

    renderPage();

    fireEvent.change(
      screen.getByPlaceholderText('AB12CD'),
      {
        target: {
          value: 'ABC123',
        },
      }
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: /Entrar no Baba/i,
      })
    );

    await waitFor(() => {
      expect(
        mockBaba.joinBaba
      ).toHaveBeenCalled();
    });

    expect(mockNavigate).not.toHaveBeenCalledWith(
      '/dashboard'
    );
  });
});

// -----------------------------------------------------------------------------
// FAB
// -----------------------------------------------------------------------------

describe('HomePage - FAB', () => {
  it('renderiza FAB', () => {
    renderPage();

    expect(
      screen.getByRole('button', {
        name: /Criar baba/i,
      })
    ).toBeInTheDocument();
  });

  it('abre menu ao clicar', () => {
    renderPage();

    fireEvent.click(
      screen.getByRole('button', {
        name: /Criar baba/i,
      })
    );

    expect(
      screen.getByRole('button', {
        name: /^Criar baba$/i,
      })
    ).toBeInTheDocument();
  });

  it('menu possui Criar torneio', () => {
    renderPage();

    fireEvent.click(
      screen.getByRole('button', {
        name: /Criar baba/i,
      })
    );

    expect(
      screen.getByRole('button', {
        name: /Criar torneio/i,
      })
    ).toBeInTheDocument();
  });

  it('menu possui Entrar com código', () => {
    renderPage();

    fireEvent.click(
      screen.getByRole('button', {
        name: /Criar baba/i,
      })
    );

    expect(
      screen.getByRole('button', {
        name: /Entrar com código/i,
      })
    ).toBeInTheDocument();
  });

  it('Criar baba navega para /create', () => {
    renderPage();

    fireEvent.click(
      screen.getByRole('button', {
        name: /Criar baba/i,
      })
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: /^Criar baba$/i,
      })
    );

    expect(mockNavigate).toHaveBeenCalledWith(
      '/create'
    );
  });

  it('Criar torneio abre modal', () => {
    renderPage();

    fireEvent.click(
      screen.getByRole('button', {
        name: /Criar baba/i,
      })
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: /Criar torneio/i,
      })
    );

    expect(
      screen.getByTestId('tournament-modal')
    ).toBeInTheDocument();
  });
});

// -----------------------------------------------------------------------------
// Pull To Refresh
// -----------------------------------------------------------------------------

describe('HomePage - pull refresh', () => {
  it('renderiza normalmente', () => {
    renderPage();

    expect(
      screen.getByTestId('logo')
    ).toBeInTheDocument();
  });
});

// -----------------------------------------------------------------------------
// Navegação
// -----------------------------------------------------------------------------

describe('HomePage - navegação', () => {
  it('abre profile', () => {
    renderPage();

    fireEvent.click(
      screen.getByText('Z').closest('button')
    );

    expect(
      mockNavigate
    ).toHaveBeenCalledWith('/profile');
  });

  it('abre create pelo estado vazio', () => {
    renderPage();

    fireEvent.click(
      screen.getByRole('button', {
        name: /Criar meu Baba/i,
      })
    );

    expect(
      mockNavigate
    ).toHaveBeenCalledWith('/create');
  });
});

// -----------------------------------------------------------------------------
// Smoke
// -----------------------------------------------------------------------------

describe('HomePage - smoke', () => {
  it('renderiza sem erros', () => {
    expect(() => renderPage()).not.toThrow();
  });
});