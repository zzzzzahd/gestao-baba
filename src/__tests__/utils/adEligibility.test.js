import { describe, it, expect, vi, afterEach } from 'vitest';
import { isAdEligiblePath, isAdScriptPath, rewardedExportEnabled } from '../../utils/adEligibility';

afterEach(() => vi.unstubAllEnvs());

describe('política de anúncios', () => {
  it('páginas editoriais são elegíveis', () => {
    for (const p of ['/', '/sobre', '/player/abc', '/guias', '/guias/como-organizar-um-baba']) {
      expect(isAdEligiblePath(p)).toBe(true);
    }
  });
  it('ferramentas, login, convite, termos, placar, área logada e 404 não são', () => {
    for (const p of ['/ferramentas', '/ferramentas/sorteador', '/login', '/join/ABC123', '/termos', '/privacidade',
      '/visitor-match', '/home', '/dashboard', '/financial', '/rota-inexistente']) {
      expect(isAdEligiblePath(p)).toBe(false);
    }
  });
  it('com a flag desligada, nenhuma ferramenta carrega o script', () => {
    expect(rewardedExportEnabled()).toBe(false);
    expect(isAdScriptPath('/ferramentas/sorteador')).toBe(false);
  });
  it('com a flag ligada, só o sorteador carrega o script (e continua sem banner)', () => {
    vi.stubEnv('VITE_TOOLS_REWARDED_EXPORT', 'true');
    expect(isAdScriptPath('/ferramentas/sorteador')).toBe(true);
    expect(isAdScriptPath('/ferramentas/calculadora-torneio')).toBe(false);
    expect(isAdScriptPath('/dashboard')).toBe(false);
    expect(isAdEligiblePath('/ferramentas/sorteador')).toBe(false);
  });
});
