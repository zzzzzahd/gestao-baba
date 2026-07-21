// src/__tests__/utils/securityUtils.test.js
// Sprint — Utils: securityUtils.js

import { describe, it, expect } from 'vitest';
import {
  maskPix,
  maskPhone,
  maskCPF,
  maskEmail,
  sanitizeText,
  isValidUUID,
  isValidEmail,
} from '../../utils/securityUtils';

// ─── maskPix ─────────────────────────────────────────────────────────────────
describe('maskPix', () => {
  it('retorna "—" para undefined', () => expect(maskPix(undefined)).toBe('—'));
  it('retorna "—" para null', () => expect(maskPix(null)).toBe('—'));
  it('retorna "—" para string vazia', () => expect(maskPix('')).toBe('—'));
  it('retorna "****" para chave com menos de 4 chars', () => expect(maskPix('abc')).toBe('****'));
  it('exibe apenas últimos 4 chars', () => expect(maskPix('12345678901')).toBe('****8901'));
  it('funciona com chave Pix email', () => expect(maskPix('zico@teste.com')).toBe('****.com'));
  it('funciona com exatamente 4 chars', () => expect(maskPix('1234')).toBe('****'));
  it('funciona com 5 chars', () => expect(maskPix('12345')).toBe('****2345'));
});

// ─── maskPhone ───────────────────────────────────────────────────────────────
describe('maskPhone', () => {
  it('retorna "—" para null', () => expect(maskPhone(null)).toBe('—'));
  it('retorna "—" para undefined', () => expect(maskPhone(undefined)).toBe('—'));
  it('mascara número 11 dígitos', () => {
    const result = maskPhone('11999991234');
    expect(result).toContain('****');
    expect(result).toContain('11');
    expect(result).toContain('1234');
  });
  it('não expõe dígitos do meio', () => {
    expect(maskPhone('11999991234')).not.toContain('99999');
  });
});

// ─── maskCPF ─────────────────────────────────────────────────────────────────
describe('maskCPF', () => {
  it('retorna "—" para null', () => expect(maskCPF(null)).toBe('—'));
  it('retorna "—" para string vazia', () => expect(maskCPF('')).toBe('—'));
  it('mascara primeiro e segundo blocos', () => {
    const result = maskCPF('123.456.789-00');
    expect(result).toContain('***');
    expect(result).not.toContain('123');
  });
  it('não expõe último bloco completo', () => {
    expect(maskCPF('123.456.789-00')).not.toContain('00');
  });
});

// ─── maskEmail ────────────────────────────────────────────────────────────────
describe('maskEmail', () => {
  it('retorna "—" para null', () => expect(maskEmail(null)).toBe('—'));
  it('retorna "—" para string sem @', () => expect(maskEmail('invalido')).toBe('—'));
  it('exibe primeiro char + *** + domínio', () => {
    expect(maskEmail('zico@pelada.com')).toBe('z***@pelada.com');
  });
  it('preserva domínio completo', () => {
    expect(maskEmail('user@mail.test.br')).toContain('mail.test.br');
  });
  it('funciona com usuário de 1 char', () => {
    expect(maskEmail('a@b.com')).toBe('a***@b.com');
  });
  it('email longo — parte visível é só o primeiro char', () => {
    const result = maskEmail('usuario.muito.longo@dominio.com.br');
    const userPart = result.split('@')[0];
    expect(userPart).toBe('u***');
  });
});

// ─── sanitizeText ─────────────────────────────────────────────────────────────
describe('sanitizeText', () => {
  it('retorna string vazia para null', () => expect(sanitizeText(null)).toBe(''));
  it('retorna string vazia para undefined', () => expect(sanitizeText(undefined)).toBe(''));
  it('retorna string vazia para número', () => expect(sanitizeText(123)).toBe(''));
  it('remove espaços das extremidades', () => expect(sanitizeText('  olá  ')).toBe('olá'));
  it('respeita maxLength default (200)', () => {
    expect(sanitizeText('a'.repeat(300))).toHaveLength(200);
  });
  it('respeita maxLength customizado', () => {
    expect(sanitizeText('abcdefgh', 3)).toBe('abc');
  });
  it('remove caracteres de controle', () => {
    expect(sanitizeText('ola\u0000mundo')).toBe('olamundo');
  });
  it('remove tags HTML básicas', () => {
    expect(sanitizeText('<script>alert(1)</script>')).toBe('alert(1)');
  });
  it('remove tags com atributos', () => {
    expect(sanitizeText('<img src="x" onerror="alert(1)">')).toBe('');
  });
  it('preserva texto normal com acentos', () => {
    expect(sanitizeText('Pelada do Zé')).toBe('Pelada do Zé');
  });
  it('preserva valores monetários', () => {
    expect(sanitizeText('R$50,00')).toBe('R$50,00');
  });
});

// ─── isValidUUID ─────────────────────────────────────────────────────────────
describe('isValidUUID', () => {
  it('aceita UUID v4 válido', () => {
    expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });
  it('rejeita UUID v1', () => {
    expect(isValidUUID('550e8400-e29b-11d4-a716-446655440000')).toBe(false);
  });
  it('rejeita string sem hífens', () => {
    expect(isValidUUID('550e8400e29b41d4a716446655440000')).toBe(false);
  });
  it('rejeita UUID com zeros apenas', () => {
    expect(isValidUUID('00000000-0000-0000-0000-000000000000')).toBe(false);
  });
  it('rejeita null', () => expect(isValidUUID(null)).toBe(false));
  it('rejeita undefined', () => expect(isValidUUID(undefined)).toBe(false));
  it('rejeita string vazia', () => expect(isValidUUID('')).toBe(false));
  it('rejeita "admin"', () => expect(isValidUUID('admin')).toBe(false));
  it('rejeita path traversal', () => expect(isValidUUID('../etc/passwd')).toBe(false));
  it('aceita UUID v4 com maiúsculas', () => {
    expect(isValidUUID('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
  });
});

// ─── isValidEmail ─────────────────────────────────────────────────────────────
describe('isValidEmail', () => {
  it('aceita email válido simples', () => expect(isValidEmail('a@b.com')).toBe(true));
  it('aceita email com subdomínio', () => expect(isValidEmail('a@mail.b.com')).toBe(true));
  it('aceita email com + e pontos', () => expect(isValidEmail('user.name+tag@example.org')).toBe(true));
  it('rejeita sem @', () => expect(isValidEmail('semArroba')).toBe(false));
  it('rejeita sem domínio', () => expect(isValidEmail('a@')).toBe(false));
  it('rejeita sem extensão', () => expect(isValidEmail('a@b')).toBe(false));
  it('rejeita string vazia', () => expect(isValidEmail('')).toBe(false));
  it('rejeita com espaços', () => expect(isValidEmail('a @b.com')).toBe(false));
  it('rejeita dois @', () => expect(isValidEmail('a@@b.com')).toBe(false));
  it('rejeita null', () => expect(isValidEmail(null)).toBe(false));
  it('rejeita javascript: URI', () => expect(isValidEmail('javascript:alert(1)')).toBe(false));
});
