import { describe, it, expect } from 'vitest';
import {
  formatNCF,
  calcularUso,
  evaluarAlerta,
  verificarBloqueo,
} from './ncf-manager.js';

// ============================================================
// Unit tests for NCFManagerService pure logic
// (no database required)
// ============================================================

describe('formatNCF', () => {
  it('formats a basic NCF with tipo 31 and zero-padded number', () => {
    expect(formatNCF('31', '', 1)).toBe('E310000000001');
  });

  it('formats NCF with a prefix', () => {
    expect(formatNCF('32', 'A', 42)).toBe('E32A000000042');
  });

  it('handles large numbers without extra padding', () => {
    expect(formatNCF('31', '', 9999999999)).toBe('E319999999999');
  });

  it('includes the tipo in the output', () => {
    const ncf = formatNCF('46', '', 5);
    expect(ncf).toMatch(/^E46/);
  });
});

describe('calcularUso', () => {
  it('returns 0% usage when at the start of the range', () => {
    const result = calcularUso(1, 100, 1);
    expect(result.porcentajeUso).toBe(0);
    expect(result.disponibles).toBe(100);
  });

  it('returns 50% usage at the midpoint', () => {
    const result = calcularUso(1, 100, 51);
    expect(result.porcentajeUso).toBe(50);
    expect(result.disponibles).toBe(50);
  });

  it('returns 100% when fully exhausted (past the end)', () => {
    const result = calcularUso(1, 100, 101);
    expect(result.porcentajeUso).toBe(100);
    expect(result.disponibles).toBe(0);
  });

  it('handles a single-element range', () => {
    const result = calcularUso(5, 5, 5);
    expect(result.porcentajeUso).toBe(0);
    expect(result.disponibles).toBe(1);
  });

  it('returns correct values at exactly 80%', () => {
    // range 1..10 (10 items), 8 used → current = 9
    const result = calcularUso(1, 10, 9);
    expect(result.porcentajeUso).toBe(80);
    expect(result.disponibles).toBe(2);
  });
});

describe('evaluarAlerta', () => {
  it('returns null when usage is below 80%', () => {
    // range 1..100, current = 1 → 0% usage
    const alerta = evaluarAlerta('31', 1, 100, 1);
    expect(alerta).toBeNull();
  });

  it('returns alert when usage reaches exactly 80%', () => {
    // range 1..10, current = 9 → 80% used
    const alerta = evaluarAlerta('31', 1, 10, 9);
    expect(alerta).not.toBeNull();
    expect(alerta!.tipo).toBe('alerta_80_porciento');
    expect(alerta!.porcentajeUso).toBe(80);
  });

  it('returns alert when usage exceeds 80%', () => {
    // range 1..10, current = 10 → 90% used
    const alerta = evaluarAlerta('32', 1, 10, 10);
    expect(alerta).not.toBeNull();
    expect(alerta!.tipoComprobante).toBe('32');
    expect(alerta!.porcentajeUso).toBe(90);
    expect(alerta!.disponibles).toBe(1);
  });

  it('returns alert at 100% usage', () => {
    const alerta = evaluarAlerta('31', 1, 10, 11);
    expect(alerta).not.toBeNull();
    expect(alerta!.porcentajeUso).toBe(100);
    expect(alerta!.disponibles).toBe(0);
  });

  it('returns null at 79% usage', () => {
    // range 1..100, current = 80 → 79% used
    const alerta = evaluarAlerta('31', 1, 100, 80);
    expect(alerta).toBeNull();
  });
});

describe('verificarBloqueo', () => {
  const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

  it('returns null for an active, non-expired sequence with room', () => {
    expect(verificarBloqueo('activa', futureDate, 5, 100)).toBeNull();
  });

  it('returns error when estado is agotada', () => {
    const msg = verificarBloqueo('agotada', futureDate, 5, 100);
    expect(msg).toContain('agotada');
  });

  it('returns error when numero_actual exceeds rango_final', () => {
    const msg = verificarBloqueo('activa', futureDate, 101, 100);
    expect(msg).toContain('agotada');
  });

  it('returns error when estado is vencida', () => {
    const msg = verificarBloqueo('vencida', futureDate, 5, 100);
    expect(msg).toContain('vencida');
  });

  it('returns error when fecha_vencimiento is in the past', () => {
    const msg = verificarBloqueo('activa', pastDate, 5, 100);
    expect(msg).toContain('vencida');
  });

  it('prioritizes exhaustion over expiration', () => {
    // Both exhausted and expired — exhaustion check comes first
    const msg = verificarBloqueo('agotada', pastDate, 101, 100);
    expect(msg).toContain('agotada');
  });
});
