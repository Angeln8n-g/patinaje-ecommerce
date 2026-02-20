import { describe, it, expect } from 'vitest';
import { validateColorOptions } from './color-validation.js';

describe('validateColorOptions', () => {
  it('returns null for valid color options', () => {
    expect(validateColorOptions(['Rojo:#FF0000', 'Azul:#0000FF'])).toBeNull();
  });

  it('returns null for an empty array', () => {
    expect(validateColorOptions([])).toBeNull();
  });

  it('accepts lowercase hex codes', () => {
    expect(validateColorOptions(['Verde:#00ff00'])).toBeNull();
  });

  it('accepts mixed-case hex codes', () => {
    expect(validateColorOptions(['Rosa:#Ff69B4'])).toBeNull();
  });

  it('rejects non-string elements', () => {
    const result = validateColorOptions([123 as any]);
    expect(result).toContain('debe ser un string');
  });

  it('rejects options without :# separator', () => {
    const result = validateColorOptions(['RojoFF0000']);
    expect(result).toContain('formato "Nombre:#HexCode"');
  });

  it('rejects options with empty name', () => {
    const result = validateColorOptions([':#FF0000']);
    expect(result).toContain('nombre vacío');
  });

  it('rejects options with whitespace-only name', () => {
    const result = validateColorOptions(['   :#FF0000']);
    expect(result).toContain('nombre vacío');
  });

  it('rejects invalid hex codes (too short)', () => {
    const result = validateColorOptions(['Rojo:#FFF']);
    expect(result).toContain('hex inválido');
  });

  it('rejects options missing # in hex code', () => {
    const result = validateColorOptions(['Rojo:FF0000']);
    expect(result).toContain('formato "Nombre:#HexCode"');
  });

  it('rejects invalid hex codes (non-hex characters)', () => {
    const result = validateColorOptions(['Rojo:#GGGGGG']);
    expect(result).toContain('hex inválido');
  });

  it('returns error for the first invalid option in the array', () => {
    const result = validateColorOptions(['Rojo:#FF0000', 'Malo:#ZZZ']);
    expect(result).toContain('variant_options[1]');
  });

  it('accepts names with special characters', () => {
    expect(validateColorOptions(['Azul Marino:#000080'])).toBeNull();
    expect(validateColorOptions(['Rojo-Oscuro:#8B0000'])).toBeNull();
  });
});
