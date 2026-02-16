import { describe, it, expect } from 'vitest';
import { validarRNC, validarRNCDetallado } from './validators.js';

describe('validarRNC', () => {
  it('accepts a 9-digit numeric string', () => {
    expect(validarRNC('123456789')).toBe(true);
  });

  it('accepts an 11-digit numeric string', () => {
    expect(validarRNC('12345678901')).toBe(true);
  });

  it('rejects an empty string', () => {
    expect(validarRNC('')).toBe(false);
  });

  it('rejects strings with non-numeric characters', () => {
    expect(validarRNC('12345678a')).toBe(false);
    expect(validarRNC('abcdefghi')).toBe(false);
    expect(validarRNC('123-456-789')).toBe(false);
  });

  it('rejects strings with wrong length', () => {
    expect(validarRNC('12345678')).toBe(false);   // 8 digits
    expect(validarRNC('1234567890')).toBe(false);  // 10 digits
    expect(validarRNC('123456789012')).toBe(false); // 12 digits
  });

  it('rejects strings with spaces', () => {
    expect(validarRNC(' 123456789')).toBe(false);
    expect(validarRNC('123456789 ')).toBe(false);
    expect(validarRNC('123 456 789')).toBe(false);
  });
});

describe('validarRNCDetallado', () => {
  it('returns valid for correct 9-digit RNC', () => {
    const result = validarRNCDetallado('123456789');
    expect(result.valido).toBe(true);
    expect(result.errores).toHaveLength(0);
  });

  it('returns valid for correct 11-digit RNC', () => {
    const result = validarRNCDetallado('12345678901');
    expect(result.valido).toBe(true);
    expect(result.errores).toHaveLength(0);
  });

  it('returns error for empty string', () => {
    const result = validarRNCDetallado('');
    expect(result.valido).toBe(false);
    expect(result.errores.length).toBeGreaterThan(0);
  });

  it('returns error for non-numeric characters', () => {
    const result = validarRNCDetallado('12345abcd');
    expect(result.valido).toBe(false);
    expect(result.errores[0]).toContain('dígitos numéricos');
  });

  it('returns error for wrong length', () => {
    const result = validarRNCDetallado('12345');
    expect(result.valido).toBe(false);
    expect(result.errores[0]).toContain('9 u 11 dígitos');
  });
});
