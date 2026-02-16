import type { ValidationResult } from '../types.js';

/**
 * Valida que un RNC (Registro Nacional del Contribuyente) tenga formato válido.
 * Acepta únicamente strings de exactamente 9 o 11 dígitos numéricos.
 */
export function validarRNC(rnc: string): boolean {
  return /^\d{9}$/.test(rnc) || /^\d{11}$/.test(rnc);
}

/**
 * Valida un RNC y retorna un resultado detallado con errores.
 */
export function validarRNCDetallado(rnc: string): ValidationResult {
  const errores: string[] = [];

  if (typeof rnc !== 'string') {
    return { valido: false, errores: ['El RNC debe ser un string'] };
  }

  if (rnc.length === 0) {
    errores.push('El RNC no puede estar vacío');
  } else if (!/^\d+$/.test(rnc)) {
    errores.push('El RNC debe contener solo dígitos numéricos');
  } else if (rnc.length !== 9 && rnc.length !== 11) {
    errores.push('El RNC debe tener exactamente 9 u 11 dígitos');
  }

  return { valido: errores.length === 0, errores };
}
