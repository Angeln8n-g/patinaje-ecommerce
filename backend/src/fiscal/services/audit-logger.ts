import { query } from '../../db/pool.js';
import type { TipoEventoAuditoria } from '../types.js';

/**
 * Registra un evento en el log de auditoría fiscal (fiscal_audit_log).
 */
export async function registrar(
  evento: TipoEventoAuditoria,
  datos: Record<string, unknown>,
  usuarioId: string,
  invoiceId?: string,
): Promise<void> {
  await query(
    `INSERT INTO fiscal_audit_log (evento, invoice_id, usuario_id, datos)
     VALUES ($1, $2, $3, $4)`,
    [evento, invoiceId ?? null, usuarioId, JSON.stringify(datos)],
  );
}
