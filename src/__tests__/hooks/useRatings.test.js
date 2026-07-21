// src/__tests__/hooks/useRatings.test.js

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockFetchRatingsSummary = vi.fn();
const mockUpsertRating        = vi.fn();
const mockUpdateManualWeight  = vi.fn();

vi.mock('../../services/ratingsService', () => ({
  fetchRatingsSummary: (...a) => mockFetchRatingsSummary(...a),
  upsertRating:        (...a) => mockUpsertRating(...a),
  updateManualWeight:  (...a) => mockUpdateManualWeight(...a),
}));

vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), {
    success: vi.fn(),
    error:   vi.fn(),
  }),
}));

import { useRatings } from '../../hooks/useRatings';
import toast from 'react-hot-toast';

const makeBaba    = (id = 'baba-1') => ({ id });
const makeUser    = (id = 'user-1') => ({ id });
const makePlayer  = (o = {}) => ({ id: 'player-1', user_id: 'user-1', name: 'Zé', ...o });
const makeRatings = () => ({ skill: 8, physical: 7, commitment: 9 });

const defaultProps = {
  currentBaba: makeBaba(),
  user:        makeUser(),
  players:     [makePlayer()],
};

describe('useRatings — getAllRatings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna [] quando currentBaba é null', async () => {
    const { result } = renderHook(() =>
      useRatings({ ...defaultProps, currentBaba: null })
    );
    const data = await result.current.getAllRatings();
    expect(data).toEqual([]);
    expect(mockFetchRatingsSummary).not.toHaveBeenCalled();
  });

  it('chama fetchRatingsSummary com o id do baba', async () => {
    mockFetchRatingsSummary.mockResolvedValue([]);
    const { result } = renderHook(() => useRatings(defaultProps));
    await act(async () => { await result.current.getAllRatings(); });
    expect(mockFetchRatingsSummary).toHaveBeenCalledWith('baba-1');
  });

  it('retorna o array do service', async () => {
    const ratings = [{ player_id: 'p-1', final_rating: 7.5 }];
    mockFetchRatingsSummary.mockResolvedValue(ratings);
    const { result } = renderHook(() => useRatings(defaultProps));
    const data = await act(async () => result.current.getAllRatings());
    expect(data).toEqual(ratings);
  });

  it('retorna [] e não crasha quando o service lança erro', async () => {
    mockFetchRatingsSummary.mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useRatings(defaultProps));
    const data = await act(async () => result.current.getAllRatings());
    expect(data).toEqual([]);
  });

  it('atualiza lastResultRef após chamada bem-sucedida', async () => {
    const ratings = [{ player_id: 'p-1', final_rating: 8 }];
    mockFetchRatingsSummary.mockResolvedValue(ratings);
    const { result } = renderHook(() => useRatings(defaultProps));
    await act(async () => { await result.current.getAllRatings(); });
    // getAllRatings é uma função estável — não crasha em segunda chamada
    mockFetchRatingsSummary.mockResolvedValue(ratings);
    const data2 = await act(async () => result.current.getAllRatings());
    expect(data2).toEqual(ratings);
  });
});

describe('useRatings — ratePlayer', () => {
  beforeEach(() => vi.clearAllMocks());

  it('não faz nada quando user é null', async () => {
    const { result } = renderHook(() =>
      useRatings({ ...defaultProps, user: null })
    );
    await act(async () => { await result.current.ratePlayer('p-2', makeRatings()); });
    expect(mockUpsertRating).not.toHaveBeenCalled();
  });

  it('não faz nada quando currentBaba é null', async () => {
    const { result } = renderHook(() =>
      useRatings({ ...defaultProps, currentBaba: null })
    );
    await act(async () => { await result.current.ratePlayer('p-2', makeRatings()); });
    expect(mockUpsertRating).not.toHaveBeenCalled();
  });

  it('chama toast.error quando jogador avaliador não está na lista', async () => {
    const { result } = renderHook(() =>
      useRatings({ ...defaultProps, players: [] })
    );
    await act(async () => { await result.current.ratePlayer('p-2', makeRatings()); });
    expect(toast.error).toHaveBeenCalledWith('Erro ao enviar avaliação');
    expect(mockUpsertRating).not.toHaveBeenCalled();
  });

  it('chama upsertRating com payload correto', async () => {
    mockUpsertRating.mockResolvedValue(undefined);
    const { result } = renderHook(() => useRatings(defaultProps));
    await act(async () => {
      await result.current.ratePlayer('p-2', makeRatings());
    });
    expect(mockUpsertRating).toHaveBeenCalledWith({
      babaId:     'baba-1',
      raterId:    'player-1',
      ratedId:    'p-2',
      skill:      8,
      physical:   7,
      commitment: 9,
    });
  });

  it('chama toast.success após avaliação bem-sucedida', async () => {
    mockUpsertRating.mockResolvedValue(undefined);
    const { result } = renderHook(() => useRatings(defaultProps));
    await act(async () => { await result.current.ratePlayer('p-2', makeRatings()); });
    expect(toast.success).toHaveBeenCalledWith('Avaliação enviada ⭐');
  });

  it('chama toast.error quando upsertRating falha', async () => {
    mockUpsertRating.mockRejectedValue(new Error('DB error'));
    const { result } = renderHook(() => useRatings(defaultProps));
    await act(async () => { await result.current.ratePlayer('p-2', makeRatings()); });
    expect(toast.error).toHaveBeenCalledWith('Erro ao enviar avaliação');
  });

  it('encontra o avaliador correto pelo user_id', async () => {
    mockUpsertRating.mockResolvedValue(undefined);
    const players = [
      makePlayer({ id: 'player-X', user_id: 'outro-user' }),
      makePlayer({ id: 'player-1', user_id: 'user-1' }),
    ];
    const { result } = renderHook(() =>
      useRatings({ ...defaultProps, players })
    );
    await act(async () => { await result.current.ratePlayer('p-2', makeRatings()); });
    expect(mockUpsertRating).toHaveBeenCalledWith(
      expect.objectContaining({ raterId: 'player-1' })
    );
  });
});

describe('useRatings — setManualWeight', () => {
  beforeEach(() => vi.clearAllMocks());

  it('não faz nada quando currentBaba é null', async () => {
    const { result } = renderHook(() =>
      useRatings({ ...defaultProps, currentBaba: null })
    );
    await act(async () => { await result.current.setManualWeight('p-1', 3); });
    expect(mockUpdateManualWeight).not.toHaveBeenCalled();
  });

  it('chama updateManualWeight com playerId, babaId e weight', async () => {
    mockUpdateManualWeight.mockResolvedValue(undefined);
    const { result } = renderHook(() => useRatings(defaultProps));
    await act(async () => { await result.current.setManualWeight('player-1', 4); });
    expect(mockUpdateManualWeight).toHaveBeenCalledWith('player-1', 'baba-1', 4);
  });

  it('chama toast.success quando atualização funciona', async () => {
    mockUpdateManualWeight.mockResolvedValue(undefined);
    const { result } = renderHook(() => useRatings(defaultProps));
    await act(async () => { await result.current.setManualWeight('player-1', 4); });
    expect(toast.success).toHaveBeenCalledWith('Peso manual atualizado');
  });

  it('chama toast.error quando updateManualWeight falha', async () => {
    mockUpdateManualWeight.mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useRatings(defaultProps));
    await act(async () => { await result.current.setManualWeight('player-1', 4); });
    expect(toast.error).toHaveBeenCalledWith('Erro ao atualizar peso');
  });

  it('retorna funções estáveis entre re-renders', () => {
    const { result, rerender } = renderHook(() => useRatings(defaultProps));
    const { setManualWeight: fn1 } = result.current;
    rerender();
    const { setManualWeight: fn2 } = result.current;
    expect(fn1).toBe(fn2);
  });
});
