import { query } from "../../db/pool.js";
import { registrar } from "./audit-logger.js";

/**
 * Identifica e-CF con más de 10 días calendario desde su emisión
 * sin acuse de recibo, y registra alerta en auditoría.
 * Returns the list of overdue invoice IDs.
 */
export async function detectarAcusesVencidos(): Promise<string[]> {
  const result = await query(
    `SELECT id, ncf, created_at
     FROM fiscal_invoices
     WHERE acuse_recibido = FALSE
       AND estado_dgii NOT IN ('anulado', 'rechazado')
       AND created_at < NOW() - INTERVAL '10 days'`
  );

  const overdueIds: string[] = [];

  for (const row of result.rows) {
    overdueIds.push(row.id);
    await registrar(
      "acuse_recibido",
      {
        alerta: "acuse_vencido",
        ncf: row.ncf,
        dias_sin_acuse: Math.floor(
          (Date.now() - new Date(row.created_at).getTime()) / (1000 * 60 * 60 * 24)
        ),
      },
      "system"
    );
  }

  return overdueIds;
}
