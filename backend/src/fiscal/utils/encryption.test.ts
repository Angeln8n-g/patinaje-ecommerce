import { describe, it, expect } from 'vitest';
import { cifrar, descifrar } from './encryption.js';

describe('cifrar / descifrar', () => {
  const clave = 'mi-clave-secreta-para-certificados';

  it('round-trip: descifrar(cifrar(texto)) returns original text', () => {
    const texto = 'P@ssw0rd_Certificado!';
    const cifrado = cifrar(texto, clave);
    expect(descifrar(cifrado, clave)).toBe(texto);
  });

  it('encrypted text differs from plain text', () => {
    const texto = 'contraseña-secreta';
    const cifrado = cifrar(texto, clave);
    expect(cifrado).not.toBe(texto);
  });

  it('produces different ciphertext on each call (random IV)', () => {
    const texto = 'misma-entrada';
    const a = cifrar(texto, clave);
    const b = cifrar(texto, clave);
    expect(a).not.toBe(b);
  });

  it('handles empty string', () => {
    const cifrado = cifrar('', clave);
    expect(cifrado).not.toBe('');
    expect(descifrar(cifrado, clave)).toBe('');
  });

  it('handles unicode characters', () => {
    const texto = 'contraseña con ñ, ü y émojis 🔐';
    const cifrado = cifrar(texto, clave);
    expect(descifrar(cifrado, clave)).toBe(texto);
  });

  it('fails to decrypt with wrong key', () => {
    const texto = 'dato-sensible';
    const cifrado = cifrar(texto, clave);
    expect(() => descifrar(cifrado, 'clave-incorrecta')).toThrow();
  });

  it('fails to decrypt tampered ciphertext', () => {
    const texto = 'integridad';
    const cifrado = cifrar(texto, clave);
    // Flip a character in the middle of the base64 string
    const tampered = cifrado.slice(0, 10) + 'X' + cifrado.slice(11);
    expect(() => descifrar(tampered, clave)).toThrow();
  });
});
