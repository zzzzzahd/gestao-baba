// src/__tests__/security/seguranca-basica.test.js
// Testes básicos de segurança / validação (em português)

import { describe, it, expect } from 'vitest';
import {
  isValidEmail,
  sanitizeText,
  maskEmail,
  isValidUUID,
} from '../../utils/securityUtils';

describe('Segurança › e-mail', () => {
  it('aceita e-mail válido', () => {
    expect(isValidEmail('a@b.com')).toBe(true);
  });

  it('rejeita e-mail sem @', () => {
    expect(isValidEmail('semArroba')).toBe(false);
  });

  it('rejeita payload javascript:', () => {
    expect(isValidEmail('javascript:alert(1)')).toBe(false);
  });

  it('rejeita string vazia e null', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail(null)).toBe(false);
  });
});

describe('Segurança › sanitização', () => {
  it('remove tags HTML perigosas do texto', () => {
    const dirty = '<script>alert(1)</script>ola';
    const clean = sanitizeText(dirty);
    expect(String(clean).toLowerCase()).not.toContain('<script');
  });
});

describe('Segurança › máscara e UUID', () => {
  it('mascara e-mail parcialmente', () => {
    const masked = maskEmail('jogador@draft.com');
    expect(masked).not.toBe('jogador@draft.com');
    expect(masked).toContain('@');
  });

  it('valida UUID', () => {
    expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isValidUUID('nao-e-uuid')).toBe(false);
  });
});
