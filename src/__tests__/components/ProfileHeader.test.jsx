// src/__tests__/components/ProfileHeader.test.jsx

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../services/supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn().mockReturnValue({
        upload:       vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://cdn.test/avatar.png' } }),
      }),
    },
    from: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockResolvedValue({ error: null }),
    }),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

import ProfileHeader        from '../../components/ProfileHeader';
import { supabase }         from '../../services/supabase';
import toast                from 'react-hot-toast';

const makeProfile = (o = {}) => ({
  id:          'player-1',
  name:        'Zé Bola',
  position:    'atacante',
  avatar_url:  null,
  favorite_team: 'Flamengo',
  ...o,
});

const renderHeader = (props = {}) =>
  render(
    <MemoryRouter>
      <ProfileHeader
        profile={makeProfile()}
        globalRating={0}
        tab="stats"
        onTabChange={vi.fn()}
        onProfileRefresh={vi.fn()}
        {...props}
      />
    </MemoryRouter>
  );

describe('ProfileHeader — renderização', () => {
  beforeEach(() => vi.clearAllMocks());

  it('exibe a inicial do nome quando não há avatar_url', () => {
    renderHeader();
    expect(screen.getByText('Z')).toBeInTheDocument();
  });

  it('exibe a imagem quando avatar_url está definida', () => {
    renderHeader({ profile: makeProfile({ avatar_url: 'https://cdn.test/foto.jpg' }) });
    const img = screen.getByAltText('Zé Bola');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://cdn.test/foto.jpg');
  });

  it('exibe o nome do perfil', () => {
    renderHeader();
    expect(screen.getByText('Zé Bola')).toBeInTheDocument();
  });

  it('exibe "Atleta" quando profile é null', () => {
    renderHeader({ profile: null });
    expect(screen.getByText('Atleta')).toBeInTheDocument();
  });

  it('exibe posição traduzida (atacante → Atacante)', () => {
    renderHeader();
    expect(screen.getByText('Atacante')).toBeInTheDocument();
  });

  it('exibe time favorito', () => {
    renderHeader();
    expect(screen.getByText('Flamengo')).toBeInTheDocument();
  });

  it('não exibe separador e time quando favorite_team é null', () => {
    renderHeader({ profile: makeProfile({ favorite_team: null }) });
    expect(screen.queryByText('Flamengo')).toBeNull();
  });

  it('exibe rating global quando > 0', () => {
    renderHeader({ globalRating: 7.85 });
    expect(screen.getByText('7.85')).toBeInTheDocument();
    expect(screen.getByText('rating global')).toBeInTheDocument();
  });

  it('não exibe rating quando globalRating é 0', () => {
    renderHeader({ globalRating: 0 });
    expect(screen.queryByText('rating global')).toBeNull();
  });
});

describe('ProfileHeader — POSITION_LABEL', () => {
  const positions = [
    ['goleiro',   'Goleiro'],
    ['zagueiro',  'Zagueiro'],
    ['lateral',   'Lateral'],
    ['meia',      'Meia'],
    ['atacante',  'Atacante'],
    ['linha',     'Linha'],
    ['fixo',      'Fixo'],
    ['ala',       'Ala'],
    ['pivo',      'Pivô'],
  ];

  positions.forEach(([pos, label]) => {
    it(`mapeia "${pos}" → "${label}"`, () => {
      renderHeader({ profile: makeProfile({ position: pos }) });
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('exibe a string original para posição desconhecida', () => {
    renderHeader({ profile: makeProfile({ position: 'libero' }) });
    expect(screen.getByText('libero')).toBeInTheDocument();
  });
});

describe('ProfileHeader — botão voltar', () => {
  it('chama navigate(-1) ao clicar em voltar', () => {
    renderHeader();
    const backBtn = screen.getByRole('button', { name: '' });
    // Pegar pelo ArrowLeft — primeiro botão no header
    const { container } = renderHeader();
    const buttons = container.querySelectorAll('button');
    fireEvent.click(buttons[0]); // primeiro botão = voltar
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});

describe('ProfileHeader — botão editar', () => {
  it('exibe "Editar" quando tab !== "edit"', () => {
    renderHeader({ tab: 'stats' });
    expect(screen.getByText('Editar')).toBeInTheDocument();
  });

  it('exibe "Cancelar" quando tab === "edit"', () => {
    renderHeader({ tab: 'edit' });
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
  });

  it('chama onTabChange("edit") ao clicar em Editar', () => {
    const onTabChange = vi.fn();
    renderHeader({ tab: 'stats', onTabChange });
    fireEvent.click(screen.getByText('Editar'));
    expect(onTabChange).toHaveBeenCalledWith('edit');
  });

  it('chama onTabChange("stats") ao clicar em Cancelar', () => {
    const onTabChange = vi.fn();
    renderHeader({ tab: 'edit', onTabChange });
    fireEvent.click(screen.getByText('Cancelar'));
    expect(onTabChange).toHaveBeenCalledWith('stats');
  });
});

describe('ProfileHeader — upload de avatar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabase.storage.from.mockReturnValue({
      upload:       vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://cdn.test/novo.png' } }),
    });
    supabase.from.mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockResolvedValue({ error: null }),
    });
  });

  const makeFile = (overrides = {}) =>
    Object.assign(
      new File(['x'], 'foto.jpg', { type: 'image/jpeg' }),
      overrides
    );

  it('rejeita arquivo > 5MB com toast.error', async () => {
    const { container } = renderHeader();
    const input = container.querySelector('input[type="file"]');
    const bigFile = makeFile();
    Object.defineProperty(bigFile, 'size', { value: 6 * 1024 * 1024 });
    fireEvent.change(input, { target: { files: [bigFile] } });
    expect(toast.error).toHaveBeenCalledWith('Imagem inválida (máx 5 MB)');
  });

  it('rejeita arquivo não-imagem com toast.error', async () => {
    const { container } = renderHeader();
    const input = container.querySelector('input[type="file"]');
    const pdfFile = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [pdfFile] } });
    expect(toast.error).toHaveBeenCalledWith('Imagem inválida (máx 5 MB)');
  });

  it('chama supabase.storage.upload com arquivo válido', async () => {
    const onProfileRefresh = vi.fn().mockResolvedValue(undefined);
    const { container } = renderHeader({ onProfileRefresh });
    const input   = container.querySelector('input[type="file"]');
    const file    = makeFile();
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(supabase.storage.from).toHaveBeenCalledWith('avatars');
    });
  });

  it('chama onProfileRefresh após upload bem-sucedido', async () => {
    const onProfileRefresh = vi.fn().mockResolvedValue(undefined);
    const { container } = renderHeader({ onProfileRefresh });
    const input = container.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [makeFile()] } });

    await waitFor(() => {
      expect(onProfileRefresh).toHaveBeenCalledTimes(1);
    });
  });

  it('chama toast.success após upload bem-sucedido', async () => {
    const { container } = renderHeader();
    const input = container.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [makeFile()] } });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Foto atualizada');
    });
  });

  it('chama toast.error quando storage.upload falha', async () => {
    supabase.storage.from.mockReturnValue({
      upload:       vi.fn().mockResolvedValue({ error: new Error('upload fail') }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: '' } }),
    });
    const { container } = renderHeader();
    const input = container.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [makeFile()] } });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Erro no upload');
    });
  });

  it('chama toast.error quando update do perfil falha', async () => {
    supabase.from.mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockResolvedValue({ error: new Error('db error') }),
    });
    const { container } = renderHeader();
    const input = container.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [makeFile()] } });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Erro no upload');
    });
  });
});
