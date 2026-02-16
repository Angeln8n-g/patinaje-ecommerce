import { describe, it, expect } from 'vitest';
import { calcularITBIS } from './tax-calculator.js';
import type { ItemFactura } from '../types.js';

function makeItem(montoGravado: number): ItemFactura {
  return {
    nombre: 'Item',
    cantidad: 1,
    precioUnitario: montoGravado,
    montoGravado,
    itbis: 0,
  };
}

describe('calcularITBIS', () => {
  it('calculates 18% ITBIS on a single item', () => {
    const result = calcularITBIS([makeItem(100)]);
    expect(result.subtotal).toBe(100);
    expect(result.totalITBIS).toBe(18);
    expect(result.total).toBe(118);
  });

  it('sums multiple items correctly', () => {
    const result = calcularITBIS([makeItem(200), makeItem(300)]);
    expect(result.subtotal).toBe(500);
    expect(result.totalITBIS).toBe(90);
    expect(result.total).toBe(590);
  });

  it('rounds to 2 decimal places', () => {
    // 33.33 * 0.18 = 5.9994 → should round to 6.00
    const result = calcularITBIS([makeItem(33.33)]);
    expect(result.subtotal).toBe(33.33);
    expect(result.totalITBIS).toBe(6);
    expect(result.total).toBe(39.33);
  });

  it('handles empty items array', () => {
    const result = calcularITBIS([]);
    expect(result.subtotal).toBe(0);
    expect(result.totalITBIS).toBe(0);
    expect(result.total).toBe(0);
  });

  it('total equals subtotal + totalITBIS', () => {
    const result = calcularITBIS([makeItem(99.99), makeItem(0.01)]);
    expect(result.total).toBe(result.subtotal + result.totalITBIS);
  });

  it('handles fractional amounts that need rounding', () => {
    // 10.11 + 20.22 = 30.33; 30.33 * 0.18 = 5.4594 → 5.46
    const result = calcularITBIS([makeItem(10.11), makeItem(20.22)]);
    expect(result.subtotal).toBe(30.33);
    expect(result.totalITBIS).toBe(5.46);
    expect(result.total).toBe(35.79);
  });
});
