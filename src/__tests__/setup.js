// src/__tests__/setup.js
// Setup global para todos os testes Vitest + Testing Library (em português)

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, vi } from 'vitest';

// ─── Cleanup automático após cada teste ──────────────────────────────────────
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});

// ─── Builder encadeável do Supabase (select().eq().order()…) ─────────────────
function createQueryBuilder(resolved = { data: null, error: null }) {
  const builder = {
    select:       vi.fn(),
    insert:       vi.fn(),
    update:       vi.fn(),
    delete:       vi.fn(),
    upsert:       vi.fn(),
    eq:           vi.fn(),
    neq:          vi.fn(),
    in:           vi.fn(),
    gte:          vi.fn(),
    lte:          vi.fn(),
    gt:           vi.fn(),
    lt:           vi.fn(),
    like:         vi.fn(),
    ilike:        vi.fn(),
    is:           vi.fn(),
    order:        vi.fn(),
    limit:        vi.fn(),
    range:        vi.fn(),
    match:        vi.fn(),
    filter:       vi.fn(),
    not:          vi.fn(),
    or:           vi.fn(),
    single:       vi.fn().mockResolvedValue(resolved),
    maybeSingle:  vi.fn().mockResolvedValue(resolved),
    then:         (onFulfilled, onRejected) =>
      Promise.resolve(resolved).then(onFulfilled, onRejected),
  };

  // Todos os métodos de filtro/mutação retornam o próprio builder
  const chainMethods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'in', 'gte', 'lte', 'gt', 'lt',
    'like', 'ilike', 'is', 'order', 'limit', 'range',
    'match', 'filter', 'not', 'or',
  ];
  for (const method of chainMethods) {
    builder[method].mockReturnValue(builder);
  }

  return builder;
}

// ─── Mock do Supabase (evita chamadas reais à API) ────────────────────────────
vi.mock('../services/supabase', () => ({
  supabase: {
    auth: {
      getSession:         vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange:  vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signInWithPassword:  vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signUp:             vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signOut:            vi.fn().mockResolvedValue({ error: null }),
      getUser:            vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    from: vi.fn(() => createQueryBuilder()),
    rpc:  vi.fn().mockResolvedValue({ data: null, error: null }),
    storage: {
      from: vi.fn().mockReturnValue({
        upload:       vi.fn().mockResolvedValue({ data: {}, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/img.png' },
        }),
      }),
    },
    channel: vi.fn().mockReturnValue({
      on:        vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn(),
  },
  TABLES: {
    BABAS: 'babas',
    USERS: 'users',
    PROFILES: 'profiles',
    PLAYERS: 'players',
    MATCHES: 'matches',
    MATCH_PLAYERS: 'match_players',
    GOALS: 'goals',
    CARDS: 'cards',
    FINANCIALS: 'financials',
    PAYMENTS: 'payments',
    PRESENCES: 'presences',
  },
}));

// ─── Mock do React Router ─────────────────────────────────────────────────────
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(() => vi.fn()),
    useLocation: vi.fn(() => ({ pathname: '/home', search: '', hash: '' })),
    useParams:   vi.fn(() => ({})),
  };
});

// ─── Mock react-hot-toast ─────────────────────────────────────────────────────
vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), {
    success: vi.fn(),
    error:   vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  }),
  Toaster: () => null,
}));

// ─── Mock do Sentry ───────────────────────────────────────────────────────────
vi.mock('@sentry/react', () => ({
  init:                      vi.fn(),
  browserTracingIntegration: vi.fn(),
  replayIntegration:         vi.fn(),
  ErrorBoundary:             ({ children }) => children,
  captureException:          vi.fn(),
  captureMessage:            vi.fn(),
}));

// ─── Browser APIs que o jsdom não implementa ──────────────────────────────────
beforeAll(() => {
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: true,
  });

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches:             false,
      media:               query,
      onchange:            null,
      addListener:         vi.fn(),
      removeListener:      vi.fn(),
      addEventListener:    vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent:       vi.fn(),
    })),
  });

  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe:    vi.fn(),
    unobserve:  vi.fn(),
    disconnect: vi.fn(),
  }));

  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe:    vi.fn(),
    unobserve:  vi.fn(),
    disconnect: vi.fn(),
  }));

  global.Notification = {
    permission:        'default',
    requestPermission: vi.fn().mockResolvedValue('granted'),
  };

  // Variáveis de ambiente de teste (sem precisar de .env)
  vi.stubEnv?.('VITE_SUPABASE_URL', 'https://test.supabase.co');
  vi.stubEnv?.('VITE_SUPABASE_PUBLISHABLE_KEY', 'test-anon-key');
  vi.stubEnv?.('VITE_VAPID_PUBLIC_KEY', 'test-vapid-key');
});
