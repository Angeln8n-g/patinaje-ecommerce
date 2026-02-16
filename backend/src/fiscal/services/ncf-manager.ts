import { query, withTransaction } from '../../db/pool.js';
import type { TipoComprobante, SecuenciaFiscal } from '../types.js';

// ============================================================
// NCFManagerService
// Manages fiscal sequence numbers (NCF) with concurrency-safe
// assignment, availability checks, and alert logic.
// ============================================================

/** Threshold (fraction) at which an alert is generated */
const ALERT_THRESHOLD = 0.8;

/** Alert info returned when a sequence crosses the 80% usage mark */
export interface AlertaSecuencia {
  tipo: 'alerta_80_porciento';
  tipoComprobante: TipoComprobante;
  porcentajeUso: number;
  disponibles: number;
}

/**
 * Formats a sequence number into the NCF string.
 * Format: E{tipo}{prefijo}{numero_padded}  e.g. E310000000001
 */
export function formatNCF(
  tipo: TipoComprobante,
  prefijo: string,
  numero: number,
): string {
  const padded = String(numero).padStart(10 - prefijo.length, '0');
  return `E${tipo}${prefijo}${padded}`;
}

/**
 * Computes usage stats for a sequence.
 * Pure function — easy to unit-test without a database.
 */
export function calcularUso(
  rangoInicial: number,
  rangoFinal: number,
  numeroActual: number,
): { disponibles: number; porcentajeUso: number } {
  const total = rangoFinal - rangoInicial + 1;
  const usados = numeroActual - rangoInicial;
  const disponibles = rangoFinal - numeroActual + 1;
  const porcentajeUso = total > 0 ? (usados / total) * 100 : 100;
  return {
    disponibles,
    porcentajeUso: Math.round(porcentajeUso * 100) / 100,
  };
}

/**
 * Determines whether a sequence should trigger an alert.
 * Returns alert info when usage >= 80%, null otherwise.
 */
export function evaluarAlerta(
  tipo: TipoComprobante,
  rangoInicial: number,
  rangoFinal: number,
  numeroActual: number,
): AlertaSecuencia | null {
  const { disponibles, porcentajeUso } = calcularUso(rangoInicial, rangoFinal, numeroActual);
  if (porcentajeUso >= ALERT_THRESHOLD * 100) {
    return {
      tipo: 'alerta_80_porciento',
      tipoComprobante: tipo,
      porcentajeUso,
      disponibles,
    };
  }
  return null;
}

/**
 * Checks whether a sequence is blocked (exhausted or expired).
 * Returns an error message if blocked, null if usable.
 */
export function verificarBloqueo(
  estado: string,
  fechaVencimiento: Date,
  numeroActual: number,
  rangoFinal: number,
): string | null {
  if (estado === 'agotada' || numeroActual > rangoFinal) {
    return 'La secuencia fiscal está agotada. No se pueden emitir más comprobantes de este tipo.';
  }
  if (estado === 'vencida' || fechaVencimiento < new Date()) {
    return 'La secuencia fiscal está vencida. No se pueden emitir más comprobantes de este tipo.';
  }
  return null;
}

// ============================================================
// Database-backed methods
// ============================================================

/**
 * Gets the next available NCF for the given document type.
 * Uses SELECT … FOR UPDATE inside a transaction to guarantee
 * uniqueness under concurrent access.
 *
 * Throws if the sequence is exhausted or expired.
 * Returns { ncf, alerta? } — the formatted NCF and an optional alert.
 */
export async function obtenerSiguienteNCF(
  tipo: TipoComprobante,
): Promise<{ ncf: string; alerta: AlertaSecuencia | null }> {
  return withTransaction(async (client) => {
    // Lock the active sequence row for this document type
    const res = await client.query(
      `SELECT id, tipo_comprobante, prefijo, rango_inicial, rango_final,
              numero_actual, fecha_vencimiento, estado
       FROM fiscal_sequences
       WHERE tipo_comprobante = $1 AND estado = 'activa'
       ORDER BY created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [tipo],
    );

    if (res.rows.length === 0) {
      throw new Error(
        `No existe una secuencia fiscal activa para el tipo de comprobante ${tipo}.`,
      );
    }

    const seq = res.rows[0];
    const fechaVenc = new Date(seq.fecha_vencimiento);
    const numeroActual: number = Number(seq.numero_actual);
    const rangoFinal: number = Number(seq.rango_final);
    const rangoInicial: number = Number(seq.rango_inicial);

    // Check blocking conditions
    const bloqueo = verificarBloqueo(seq.estado, fechaVenc, numeroActual, rangoFinal);
    if (bloqueo) {
      // Mark the sequence with the appropriate state
      const nuevoEstado = numeroActual > rangoFinal ? 'agotada' : 'vencida';
      await client.query(
        `UPDATE fiscal_sequences SET estado = $1, updated_at = NOW() WHERE id = $2`,
        [nuevoEstado, seq.id],
      );
      throw new Error(bloqueo);
    }

    // Build the NCF from the current number
    const ncf = formatNCF(tipo, seq.prefijo, numeroActual);

    // Advance the counter
    const siguienteNumero = numeroActual + 1;
    const nuevoEstado = siguienteNumero > rangoFinal ? 'agotada' : 'activa';

    await client.query(
      `UPDATE fiscal_sequences
       SET numero_actual = $1, estado = $2, updated_at = NOW()
       WHERE id = $3`,
      [siguienteNumero, nuevoEstado, seq.id],
    );

    // Evaluate alert (using the *next* state after assignment)
    const alerta = evaluarAlerta(tipo, rangoInicial, rangoFinal, siguienteNumero);

    return { ncf, alerta };
  });
}

/**
 * Checks availability for a given document type.
 * Returns the number of remaining NCFs and the usage percentage.
 */
export async function verificarDisponibilidad(
  tipo: TipoComprobante,
): Promise<{ disponibles: number; porcentajeUso: number }> {
  const res = await query(
    `SELECT rango_inicial, rango_final, numero_actual, fecha_vencimiento, estado
     FROM fiscal_sequences
     WHERE tipo_comprobante = $1 AND estado = 'activa'
     ORDER BY created_at DESC
     LIMIT 1`,
    [tipo],
  );

  if (res.rows.length === 0) {
    return { disponibles: 0, porcentajeUso: 100 };
  }

  const seq = res.rows[0];
  return calcularUso(
    Number(seq.rango_inicial),
    Number(seq.rango_final),
    Number(seq.numero_actual),
  );
}

/**
 * Registers a new fiscal sequence.
 * Validates that rangoInicial <= rangoFinal and sets numeroActual = rangoInicial.
 */
export async function registrarSecuencia(
  secuencia: Omit<SecuenciaFiscal, 'id' | 'estado'>,
): Promise<SecuenciaFiscal> {
  if (secuencia.rangoInicial > secuencia.rangoFinal) {
    throw new Error('El rango inicial no puede ser mayor que el rango final.');
  }

  const res = await query(
    `INSERT INTO fiscal_sequences
       (tipo_comprobante, prefijo, rango_inicial, rango_final, numero_actual, fecha_vencimiento, estado)
     VALUES ($1, $2, $3, $4, $5, $6, 'activa')
     RETURNING *`,
    [
      secuencia.tipoComprobante,
      secuencia.prefijo,
      secuencia.rangoInicial,
      secuencia.rangoFinal,
      secuencia.rangoInicial, // starts at the beginning of the range
      secuencia.fechaVencimiento,
    ],
  );

  const row = res.rows[0];
  return mapRowToSecuencia(row);
}

/** Maps a database row to a SecuenciaFiscal object */
function mapRowToSecuencia(row: Record<string, unknown>): SecuenciaFiscal {
  return {
    id: row.id as string,
    tipoComprobante: row.tipo_comprobante as TipoComprobante,
    prefijo: row.prefijo as string,
    rangoInicial: Number(row.rango_inicial),
    rangoFinal: Number(row.rango_final),
    numeroActual: Number(row.numero_actual),
    fechaVencimiento: new Date(row.fecha_vencimiento as string),
    estado: row.estado as SecuenciaFiscal['estado'],
  };
}
