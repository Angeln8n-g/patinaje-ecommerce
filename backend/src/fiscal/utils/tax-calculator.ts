import type { ItemFactura } from '../types.js';

const ITBIS_RATE = 0.18;

/** Round a number to 2 decimal places */
function redondear2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Calcula ITBIS (18%) sobre los montos gravados de los ítems.
 * Todos los montos se redondean a 2 decimales.
 */
export function calcularITBIS(items: ItemFactura[]): {
  subtotal: number;
  totalITBIS: number;
  total: number;
} {
  const subtotal = redondear2(
    items.reduce((sum, item) => sum + item.montoGravado, 0),
  );
  const totalITBIS = redondear2(subtotal * ITBIS_RATE);
  const total = redondear2(subtotal + totalITBIS);

  return { subtotal, totalITBIS, total };
}
