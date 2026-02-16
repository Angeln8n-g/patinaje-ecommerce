import { Router } from 'express';
import multer from 'multer';
import { query } from '../db/pool.js';
import { requireAuth, requireRole } from '../lib/auth.js';
import type { JwtPayload } from '../lib/auth.js';
import type {
  TipoComprobante,
  DatosComprador,
  DatosEmisor,
  ItemFactura,
  ECFData,
  CertificadoConfig,
  FiscalConfig,
} from '../fiscal/types.js';
import { calcularITBIS } from '../fiscal/utils/tax-calculator.js';
import { cifrar, descifrar } from '../fiscal/utils/encryption.js';
import { validarRNC } from '../fiscal/utils/validators.js';
import { obtenerSiguienteNCF, registrarSecuencia, verificarDisponibilidad } from '../fiscal/services/ncf-manager.js';
import { generarXML } from '../fiscal/services/xml-generator.js';
import { firmarXML, validarCertificado, extraerCredenciales } from '../fiscal/services/xml-signer.js';
import { enviarECF, enviarAnulacion, mapearEstadoDGII } from '../fiscal/services/dgii-client.js';
import { registrar as registrarAuditoria } from '../fiscal/services/audit-logger.js';
import { generarPDF } from '../fiscal/services/pdf-generator.js';
import type { FiscalInvoice } from '../fiscal/types.js';

const router = Router();

const ENCRYPTION_KEY = process.env.FISCAL_ENCRYPTION_KEY || 'fiscal-default-key';

/** Multer configured for in-memory .p12 certificate uploads (max 5MB) */
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

/**
 * POST /api/fiscal/invoices — Generate an e-CF from an order
 *
 * Body: { order_id, tipo_comprobante, datos_comprador }
 *
 * Flow:
 *  1. Validate input
 *  2. Fetch order from DB
 *  3. Get fiscal config (emisor data + certificate)
 *  4. Calculate ITBIS
 *  5. Get next NCF
 *  6. Generate XML
 *  7. Sign XML
 *  8. Store fiscal invoice in DB
 *  9. Send to DGII
 * 10. Register audit log
 * 11. Return created e-CF
 *
 * Requirements: 1.1, 1.2, 1.3, 2.1, 3.1, 3.5, 8.1
 */
router.post(
  '/invoices',
  requireAuth,
  requireRole('ADMIN', 'SELLER'),
  async (req, res) => {
    try {
      const user = (req as any).user as JwtPayload;
      const { order_id, tipo_comprobante, datos_comprador } = req.body as {
        order_id: string;
        tipo_comprobante: TipoComprobante;
        datos_comprador: DatosComprador;
      };

      // --- 1. Validate input ---
      if (!order_id) {
        res.status(400).json({ error: 'El campo order_id es requerido' });
        return;
      }
      if (!tipo_comprobante) {
        res.status(400).json({ error: 'El campo tipo_comprobante es requerido' });
        return;
      }
      if (!datos_comprador || !datos_comprador.nombre || !datos_comprador.tipo) {
        res.status(400).json({ error: 'Los datos del comprador (nombre, tipo) son requeridos' });
        return;
      }

      // --- 2. Fetch order ---
      const orderResult = await query(
        'SELECT * FROM skating_orders WHERE id = $1',
        [order_id],
      );
      if (orderResult.rows.length === 0) {
        res.status(404).json({ error: 'Orden no encontrada' });
        return;
      }
      const order = orderResult.rows[0];

      // --- 3. Get fiscal config ---
      const configResult = await query(
        'SELECT * FROM fiscal_config ORDER BY updated_at DESC LIMIT 1',
      );
      if (configResult.rows.length === 0) {
        res.status(400).json({ error: 'No se encontró configuración fiscal. Configure el módulo fiscal primero.' });
        return;
      }
      const config = configResult.rows[0] as FiscalConfig;

      if (!config.certificado_p12 || !config.certificado_password_encrypted) {
        res.status(400).json({ error: 'No se ha configurado un certificado digital. Cargue un certificado antes de emitir comprobantes.' });
        return;
      }

      // --- 4. Calculate ITBIS ---
      const orderItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
      const itemsFactura: ItemFactura[] = orderItems.map((item: any) => {
        const precio = item.product?.price ?? item.price ?? 0;
        const cantidad = item.quantity ?? 1;
        const montoGravado = precio * cantidad;
        return {
          nombre: item.product?.name ?? item.product_name ?? 'Producto',
          cantidad,
          precioUnitario: precio,
          montoGravado,
          itbis: Math.round(montoGravado * 0.18 * 100) / 100,
        };
      });

      const { subtotal, totalITBIS, total } = calcularITBIS(itemsFactura);

      // --- 5. Get next NCF ---
      const { ncf, alerta } = await obtenerSiguienteNCF(tipo_comprobante);

      // Log alert if sequence is running low
      if (alerta) {
        await registrarAuditoria(
          'secuencia_alerta',
          { alerta },
          user.userId,
        );
      }

      // --- 6. Generate XML ---
      const emisor: DatosEmisor = {
        rnc: config.rnc_emisor,
        razonSocial: config.razon_social,
        nombreComercial: config.nombre_comercial ?? undefined,
        direccion: config.direccion_fiscal,
        telefono: config.telefono ?? undefined,
        correo: config.correo ?? undefined,
      };

      const ecfData: ECFData = {
        ncf,
        tipoComprobante: tipo_comprobante,
        emisor,
        comprador: datos_comprador,
        items: itemsFactura,
        subtotal,
        totalITBIS,
        total,
        fechaEmision: new Date(),
        ordenId: order_id,
      };

      const xmlOriginal = generarXML(ecfData);

      // --- 7. Sign XML ---
      const certPassword = descifrar(config.certificado_password_encrypted, ENCRYPTION_KEY);
      const certificado: CertificadoConfig = {
        archivoP12: config.certificado_p12,
        password: certPassword,
      };
      const xmlFirmado = firmarXML(xmlOriginal, certificado);

      // --- 8. Store fiscal invoice ---
      const insertResult = await query(
        `INSERT INTO fiscal_invoices
          (order_id, ncf, tipo_comprobante, comprador_rnc, comprador_nombre, comprador_tipo,
           subtotal, total_itbis, total, xml_original, xml_firmado, estado_dgii, emitido_por)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pendiente_envio', $12)
         RETURNING *`,
        [
          order_id,
          ncf,
          tipo_comprobante,
          datos_comprador.rnc ?? null,
          datos_comprador.nombre,
          datos_comprador.tipo,
          subtotal,
          totalITBIS,
          total,
          xmlOriginal,
          xmlFirmado,
          user.userId,
        ],
      );
      const invoice = insertResult.rows[0];

      // --- 9. Send to DGII ---
      let dgiiResponse;
      try {
        dgiiResponse = await enviarECF(xmlFirmado);
        const estadoInterno = mapearEstadoDGII(dgiiResponse.estado);

        await query(
          `UPDATE fiscal_invoices
           SET track_id = $1, estado_dgii = $2, intentos_envio = intentos_envio + 1,
               motivo_rechazo = $3, updated_at = NOW()
           WHERE id = $4`,
          [
            dgiiResponse.trackId,
            estadoInterno,
            dgiiResponse.estado === 'Rechazado' ? dgiiResponse.mensajes.join('; ') : null,
            invoice.id,
          ],
        );

        invoice.track_id = dgiiResponse.trackId;
        invoice.estado_dgii = estadoInterno;
        invoice.intentos_envio = (invoice.intentos_envio || 0) + 1;
      } catch (dgiiError) {
        // DGII unavailable — invoice stays as pendiente_envio for retry
        await query(
          `UPDATE fiscal_invoices
           SET intentos_envio = intentos_envio + 1, updated_at = NOW()
           WHERE id = $1`,
          [invoice.id],
        );
        invoice.intentos_envio = (invoice.intentos_envio || 0) + 1;

        await registrarAuditoria(
          'ecf_enviado',
          {
            invoice_id: invoice.id,
            error: dgiiError instanceof Error ? dgiiError.message : String(dgiiError),
            resultado: 'error_comunicacion',
          },
          user.userId,
          invoice.id,
        );
      }

      // --- 10. Register audit log ---
      await registrarAuditoria(
        'ecf_generado',
        { ncf, tipo_comprobante, order_id, subtotal, totalITBIS, total },
        user.userId,
        invoice.id,
      );

      if (dgiiResponse) {
        await registrarAuditoria(
          'ecf_enviado',
          {
            track_id: dgiiResponse.trackId,
            estado: dgiiResponse.estado,
            mensajes: dgiiResponse.mensajes,
          },
          user.userId,
          invoice.id,
        );
      }

      // --- 11. Return created e-CF ---
      res.status(201).json(invoice);
    } catch (err) {
      console.error('Error al emitir e-CF:', err);
      const message = err instanceof Error ? err.message : 'Error al emitir comprobante fiscal';
      res.status(500).json({ error: message });
    }
  },
);

/**
 * GET /api/fiscal/invoices — List e-CF with filters and pagination
 *
 * Query params:
 *  - fecha_desde (ISO date string) — filter created_at >= fecha_desde
 *  - fecha_hasta (ISO date string) — filter created_at <= fecha_hasta (end of day)
 *  - estado (string) — filter by estado_dgii
 *  - tipo (string) — filter by tipo_comprobante
 *  - page (number, default 1)
 *  - limit (number, default 20, max 100)
 *
 * Requirements: 10.1, 10.2
 */
router.get(
  '/invoices',
  requireAuth,
  requireRole('ADMIN'),
  async (req, res) => {
    try {
      const {
        fecha_desde,
        fecha_hasta,
        estado,
        tipo,
        page: pageParam,
        limit: limitParam,
      } = req.query as Record<string, string | undefined>;

      // Pagination defaults
      const page = Math.max(1, parseInt(pageParam || '1', 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(limitParam || '20', 10) || 20));
      const offset = (page - 1) * limit;

      // Build dynamic WHERE clauses
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (fecha_desde) {
        conditions.push('created_at >= $' + paramIndex);
        params.push(fecha_desde);
        paramIndex++;
      }

      if (fecha_hasta) {
        // Include the entire day by adding time component
        conditions.push('created_at <= ($' + paramIndex + '::date + interval \'1 day\' - interval \'1 second\')');
        params.push(fecha_hasta);
        paramIndex++;
      }

      if (estado) {
        conditions.push('estado_dgii = $' + paramIndex);
        params.push(estado);
        paramIndex++;
      }

      if (tipo) {
        conditions.push('tipo_comprobante = $' + paramIndex);
        params.push(tipo);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

      // Count total matching records
      const countResult = await query(
        'SELECT COUNT(*) AS total FROM fiscal_invoices ' + whereClause,
        params,
      );
      const total = parseInt(countResult.rows[0].total, 10);

      // Fetch paginated results (exclude large XML fields from listing)
      const dataResult = await query(
        'SELECT id, order_id, ncf, tipo_comprobante,' +
        ' comprador_rnc, comprador_nombre, comprador_tipo,' +
        ' subtotal, total_itbis, total,' +
        ' track_id, estado_dgii, motivo_rechazo, intentos_envio,' +
        ' acuse_recibido, acuse_fecha, aprobacion_comercial, aprobacion_fecha,' +
        ' emitido_por, created_at, updated_at' +
        ' FROM fiscal_invoices ' +
        whereClause +
        ' ORDER BY created_at DESC' +
        ' LIMIT $' + paramIndex + ' OFFSET $' + (paramIndex + 1),
        [...params, limit, offset],
      );

      res.json({
        data: dataResult.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      console.error('Error al listar e-CF:', err);
      const message = err instanceof Error ? err.message : 'Error al listar comprobantes fiscales';
      res.status(500).json({ error: message });
    }
  },
);

/**
 * GET /api/fiscal/invoices/:id — Get full detail of a single e-CF
 *
 * Returns all fields including XML documents.
 *
 * Requirements: 10.3
 */
router.get(
  '/invoices/:id',
  requireAuth,
  requireRole('ADMIN'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const result = await query(
        'SELECT * FROM fiscal_invoices WHERE id = $1',
        [id],
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Comprobante fiscal no encontrado' });
        return;
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error('Error al obtener detalle de e-CF:', err);
      const message = err instanceof Error ? err.message : 'Error al obtener comprobante fiscal';
      res.status(500).json({ error: message });
    }
  },
);

/**
 * POST /api/fiscal/invoices/:id/annul — Annul an e-CF
 *
 * Body: { motivo } — reason for annulment
 *
 * Flow:
 *  1. Validate the e-CF exists and is not already annulled (409 if duplicate)
 *  2. Generate annulment XML
 *  3. Send annulment to DGII
 *  4. Update status to 'anulado'
 *  5. Register audit log
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */
router.post(
  '/invoices/:id/annul',
  requireAuth,
  requireRole('ADMIN'),
  async (req, res) => {
    try {
      const user = (req as any).user as JwtPayload;
      const id = req.params.id as string;
      const { motivo } = req.body as { motivo?: string };

      if (!motivo) {
        res.status(400).json({ error: 'El campo motivo es requerido para anular un e-CF' });
        return;
      }

      // Fetch the invoice
      const result = await query('SELECT * FROM fiscal_invoices WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Comprobante fiscal no encontrado' });
        return;
      }
      const invoice = result.rows[0] as FiscalInvoice;

      // Reject if already annulled
      if (invoice.estado_dgii === 'anulado') {
        res.status(409).json({ error: 'Este comprobante fiscal ya fue anulado previamente' });
        return;
      }

      // Build annulment XML
      const xmlAnulacion =
        `<?xml version="1.0" encoding="UTF-8"?>` +
        `<AnulacionECF>` +
        `<NCF>${invoice.ncf}</NCF>` +
        `<Motivo>${motivo}</Motivo>` +
        `<FechaAnulacion>${new Date().toISOString().split('T')[0]}</FechaAnulacion>` +
        `</AnulacionECF>`;

      // Send to DGII
      const dgiiResponse = await enviarAnulacion(xmlAnulacion);
      const estadoInterno = mapearEstadoDGII(dgiiResponse.estado);

      // Update invoice status
      await query(
        `UPDATE fiscal_invoices SET estado_dgii = $1, updated_at = NOW() WHERE id = $2`,
        [estadoInterno, id],
      );

      // Register audit
      await registrarAuditoria(
        'ecf_anulado',
        { motivo, track_id: dgiiResponse.trackId, estado: dgiiResponse.estado },
        user.userId,
        id,
      );

      res.json({ message: 'Comprobante anulado exitosamente', estado: estadoInterno, track_id: dgiiResponse.trackId });
    } catch (err) {
      console.error('Error al anular e-CF:', err);
      const message = err instanceof Error ? err.message : 'Error al anular comprobante fiscal';
      res.status(500).json({ error: message });
    }
  },
);

/**
 * POST /api/fiscal/invoices/:id/ack — Register acknowledgment of receipt
 *
 * Sets acuse_recibido=true and acuse_fecha=NOW().
 *
 * Requirements: 6.1
 */
router.post(
  '/invoices/:id/ack',
  requireAuth,
  requireRole('ADMIN'),
  async (req, res) => {
    try {
      const user = (req as any).user as JwtPayload;
      const id = req.params.id as string;

      const result = await query('SELECT id FROM fiscal_invoices WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Comprobante fiscal no encontrado' });
        return;
      }

      await query(
        `UPDATE fiscal_invoices SET acuse_recibido = true, acuse_fecha = NOW(), updated_at = NOW() WHERE id = $1`,
        [id],
      );

      await registrarAuditoria('acuse_recibido', { invoice_id: id }, user.userId, id);

      res.json({ message: 'Acuse de recibo registrado exitosamente' });
    } catch (err) {
      console.error('Error al registrar acuse de recibo:', err);
      const message = err instanceof Error ? err.message : 'Error al registrar acuse de recibo';
      res.status(500).json({ error: message });
    }
  },
);

/**
 * POST /api/fiscal/invoices/:id/approval — Register commercial approval
 *
 * Sets aprobacion_comercial=true and aprobacion_fecha=NOW().
 *
 * Requirements: 6.2
 */
router.post(
  '/invoices/:id/approval',
  requireAuth,
  requireRole('ADMIN'),
  async (req, res) => {
    try {
      const user = (req as any).user as JwtPayload;
      const id = req.params.id as string;

      const result = await query('SELECT id FROM fiscal_invoices WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Comprobante fiscal no encontrado' });
        return;
      }

      await query(
        `UPDATE fiscal_invoices SET aprobacion_comercial = true, aprobacion_fecha = NOW(), updated_at = NOW() WHERE id = $1`,
        [id],
      );

      await registrarAuditoria('aprobacion_comercial', { invoice_id: id }, user.userId, id);

      res.json({ message: 'Aprobación comercial registrada exitosamente' });
    } catch (err) {
      console.error('Error al registrar aprobación comercial:', err);
      const message = err instanceof Error ? err.message : 'Error al registrar aprobación comercial';
      res.status(500).json({ error: message });
    }
  },
);

/**
 * POST /api/fiscal/invoices/:id/resend — Resend a rejected e-CF to DGII
 *
 * Re-sends the signed XML of a rejected invoice to the DGII web service.
 *
 * Requirements: 3.4
 */
router.post(
  '/invoices/:id/resend',
  requireAuth,
  requireRole('ADMIN', 'SELLER'),
  async (req, res) => {
    try {
      const user = (req as any).user as JwtPayload;
      const id = req.params.id as string;

      const result = await query('SELECT * FROM fiscal_invoices WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Comprobante fiscal no encontrado' });
        return;
      }
      const invoice = result.rows[0] as FiscalInvoice;

      if (!invoice.xml_firmado) {
        res.status(400).json({ error: 'El comprobante no tiene XML firmado para reenviar' });
        return;
      }

      const dgiiResponse = await enviarECF(invoice.xml_firmado);
      const estadoInterno = mapearEstadoDGII(dgiiResponse.estado);

      await query(
        `UPDATE fiscal_invoices
         SET track_id = $1, estado_dgii = $2, intentos_envio = intentos_envio + 1,
             motivo_rechazo = $3, updated_at = NOW()
         WHERE id = $4`,
        [
          dgiiResponse.trackId,
          estadoInterno,
          dgiiResponse.estado === 'Rechazado' ? dgiiResponse.mensajes.join('; ') : null,
          id,
        ],
      );

      await registrarAuditoria(
        'ecf_enviado',
        { track_id: dgiiResponse.trackId, estado: dgiiResponse.estado, reenvio: true },
        user.userId,
        id,
      );

      res.json({ message: 'Comprobante reenviado', estado: estadoInterno, track_id: dgiiResponse.trackId });
    } catch (err) {
      console.error('Error al reenviar e-CF:', err);
      const message = err instanceof Error ? err.message : 'Error al reenviar comprobante fiscal';
      res.status(500).json({ error: message });
    }
  },
);

/**
 * GET /api/fiscal/invoices/:id/pdf — Download PDF representation of an e-CF
 *
 * Generates and returns the PDF with QR code for DGII validation.
 *
 * Requirements: 5.1
 */
router.get(
  '/invoices/:id/pdf',
  requireAuth,
  requireRole('ADMIN', 'SELLER'),
  async (req, res) => {
    try {
      const id = req.params.id as string;

      const invoiceResult = await query('SELECT * FROM fiscal_invoices WHERE id = $1', [id]);
      if (invoiceResult.rows.length === 0) {
        res.status(404).json({ error: 'Comprobante fiscal no encontrado' });
        return;
      }
      const invoice = invoiceResult.rows[0] as FiscalInvoice;

      const configResult = await query('SELECT * FROM fiscal_config ORDER BY updated_at DESC LIMIT 1');
      if (configResult.rows.length === 0) {
        res.status(400).json({ error: 'No se encontró configuración fiscal' });
        return;
      }
      const config = configResult.rows[0] as FiscalConfig;

      const pdfBuffer = await generarPDF(invoice, config);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="ecf-${invoice.ncf}.pdf"`);
      res.send(pdfBuffer);
    } catch (err) {
      console.error('Error al generar PDF:', err);
      const message = err instanceof Error ? err.message : 'Error al generar PDF del comprobante';
      res.status(500).json({ error: message });
    }
  },
);

/**
 * GET /api/fiscal/dashboard — Fiscal dashboard summary
 *
 * Returns counts by estado_dgii and sequence usage stats.
 *
 * Requirements: 10.4
 */
router.get(
  '/dashboard',
  requireAuth,
  requireRole('ADMIN'),
  async (_req, res) => {
    try {
      // Counts by estado_dgii
      const estadoResult = await query(
        `SELECT estado_dgii, COUNT(*)::int AS count FROM fiscal_invoices GROUP BY estado_dgii`,
      );
      const conteosPorEstado: Record<string, number> = {};
      for (const row of estadoResult.rows) {
        conteosPorEstado[row.estado_dgii] = row.count;
      }

      // Sequence usage stats
      const seqResult = await query(
        `SELECT tipo_comprobante, prefijo, rango_inicial, rango_final, numero_actual, estado,
                ROUND(((numero_actual - rango_inicial)::numeric / NULLIF(rango_final - rango_inicial, 0)) * 100, 1) AS porcentaje_uso
         FROM fiscal_sequences ORDER BY tipo_comprobante`,
      );

      res.json({
        conteos_por_estado: conteosPorEstado,
        secuencias: seqResult.rows,
      });
    } catch (err) {
      console.error('Error al obtener dashboard fiscal:', err);
      const message = err instanceof Error ? err.message : 'Error al obtener resumen fiscal';
      res.status(500).json({ error: message });
    }
  },
);

// ============================================================
// Configuration endpoints (Task 11.1)
// Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6
// ============================================================

/**
 * GET /api/fiscal/config — Return current fiscal configuration
 *
 * Excludes sensitive certificate data (p12 binary, encrypted password).
 */
router.get(
  '/config',
  requireAuth,
  requireRole('ADMIN'),
  async (_req, res) => {
    try {
      const result = await query(
        `SELECT id, rnc_emisor, razon_social, nombre_comercial, direccion_fiscal,
                telefono, correo, dgii_ws_url_pruebas, dgii_ws_url_produccion, ambiente,
                certificado_valido_hasta, updated_at
         FROM fiscal_config ORDER BY updated_at DESC LIMIT 1`,
      );

      if (result.rows.length === 0) {
        res.json(null);
        return;
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error('Error al obtener configuración fiscal:', err);
      const message = err instanceof Error ? err.message : 'Error al obtener configuración fiscal';
      res.status(500).json({ error: message });
    }
  },
);

/**
 * PUT /api/fiscal/config — Update fiscal configuration
 *
 * Validates RNC format. Saves a snapshot of the previous config in fiscal_config_history.
 */
router.put(
  '/config',
  requireAuth,
  requireRole('ADMIN'),
  async (req, res) => {
    try {
      const user = (req as any).user as JwtPayload;
      const {
        rnc_emisor,
        razon_social,
        nombre_comercial,
        direccion_fiscal,
        telefono,
        correo,
        dgii_ws_url_pruebas,
        dgii_ws_url_produccion,
        ambiente,
      } = req.body;

      // Validate required fields
      if (!rnc_emisor || !razon_social || !direccion_fiscal) {
        res.status(400).json({ error: 'Los campos rnc_emisor, razon_social y direccion_fiscal son requeridos' });
        return;
      }

      // Validate RNC format
      if (!validarRNC(rnc_emisor)) {
        res.status(400).json({ error: 'El RNC debe tener exactamente 9 u 11 dígitos numéricos' });
        return;
      }

      // Fetch current config for snapshot
      const currentResult = await query(
        'SELECT * FROM fiscal_config ORDER BY updated_at DESC LIMIT 1',
      );

      // Determine modified fields
      const camposModificados: string[] = [];
      if (currentResult.rows.length > 0) {
        const current = currentResult.rows[0];
        const fieldMap: Record<string, string> = {
          rnc_emisor, razon_social, nombre_comercial, direccion_fiscal,
          telefono, correo, dgii_ws_url_pruebas, dgii_ws_url_produccion, ambiente,
        };
        for (const [key, value] of Object.entries(fieldMap)) {
          if (value !== undefined && String(value ?? '') !== String(current[key] ?? '')) {
            camposModificados.push(key);
          }
        }

        // Save snapshot of previous config
        const { certificado_p12, certificado_password_encrypted, ...snapshotData } = current;
        await query(
          `INSERT INTO fiscal_config_history (config_snapshot, campos_modificados, modificado_por)
           VALUES ($1, $2, $3)`,
          [JSON.stringify(snapshotData), camposModificados, user.userId],
        );
      }

      let result;
      if (currentResult.rows.length > 0) {
        // Update existing config
        result = await query(
          `UPDATE fiscal_config SET
             rnc_emisor = $1, razon_social = $2, nombre_comercial = $3,
             direccion_fiscal = $4, telefono = $5, correo = $6,
             dgii_ws_url_pruebas = $7, dgii_ws_url_produccion = $8, ambiente = $9,
             updated_at = NOW()
           WHERE id = $10
           RETURNING id, rnc_emisor, razon_social, nombre_comercial, direccion_fiscal,
                     telefono, correo, dgii_ws_url_pruebas, dgii_ws_url_produccion, ambiente,
                     certificado_valido_hasta, updated_at`,
          [
            rnc_emisor, razon_social, nombre_comercial ?? null,
            direccion_fiscal, telefono ?? null, correo ?? null,
            dgii_ws_url_pruebas ?? null, dgii_ws_url_produccion ?? null, ambiente ?? 'pruebas',
            currentResult.rows[0].id,
          ],
        );
      } else {
        // Insert new config
        result = await query(
          `INSERT INTO fiscal_config
             (rnc_emisor, razon_social, nombre_comercial, direccion_fiscal, telefono, correo,
              dgii_ws_url_pruebas, dgii_ws_url_produccion, ambiente)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id, rnc_emisor, razon_social, nombre_comercial, direccion_fiscal,
                     telefono, correo, dgii_ws_url_pruebas, dgii_ws_url_produccion, ambiente,
                     certificado_valido_hasta, updated_at`,
          [
            rnc_emisor, razon_social, nombre_comercial ?? null,
            direccion_fiscal, telefono ?? null, correo ?? null,
            dgii_ws_url_pruebas ?? null, dgii_ws_url_produccion ?? null, ambiente ?? 'pruebas',
          ],
        );
      }

      await registrarAuditoria(
        'config_actualizada',
        { campos_modificados: camposModificados },
        user.userId,
      );

      res.json(result.rows[0]);
    } catch (err) {
      console.error('Error al actualizar configuración fiscal:', err);
      const message = err instanceof Error ? err.message : 'Error al actualizar configuración fiscal';
      res.status(500).json({ error: message });
    }
  },
);

/**
 * POST /api/fiscal/config/certificate — Upload a .p12 digital certificate
 *
 * Validates the certificate is not expired, encrypts the password with AES-256, and stores both.
 */
router.post(
  '/config/certificate',
  requireAuth,
  requireRole('ADMIN'),
  upload.single('certificado'),
  async (req, res) => {
    try {
      const user = (req as any).user as JwtPayload;
      const file = req.file;
      const { password } = req.body as { password?: string };

      if (!file) {
        res.status(400).json({ error: 'Debe cargar un archivo de certificado (.p12)' });
        return;
      }

      if (!file.originalname.endsWith('.p12') && !file.originalname.endsWith('.pfx')) {
        res.status(400).json({ error: 'El archivo debe ser un certificado en formato .p12 o .pfx' });
        return;
      }

      if (!password) {
        res.status(400).json({ error: 'La contraseña del certificado es requerida' });
        return;
      }

      // Validate certificate by extracting credentials and checking expiration
      let certPem: string;
      try {
        const creds = extraerCredenciales({ archivoP12: file.buffer, password });
        certPem = creds.certificate;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al procesar el certificado';
        res.status(400).json({ error: msg });
        return;
      }

      const validacion = validarCertificado(certPem);
      if (!validacion.valido) {
        res.status(400).json({ error: validacion.mensaje || 'El certificado no es válido' });
        return;
      }

      // Encrypt password
      const passwordEncrypted = cifrar(password, ENCRYPTION_KEY);

      // Ensure config row exists
      const configResult = await query(
        'SELECT id FROM fiscal_config ORDER BY updated_at DESC LIMIT 1',
      );

      if (configResult.rows.length === 0) {
        res.status(400).json({ error: 'Debe configurar los datos fiscales antes de cargar un certificado' });
        return;
      }

      await query(
        `UPDATE fiscal_config SET
           certificado_p12 = $1, certificado_password_encrypted = $2,
           certificado_valido_hasta = $3, updated_at = NOW()
         WHERE id = $4`,
        [file.buffer, passwordEncrypted, validacion.expiraEn, configResult.rows[0].id],
      );

      await registrarAuditoria(
        'certificado_cargado',
        { valido_hasta: validacion.expiraEn.toISOString() },
        user.userId,
      );

      res.json({
        message: 'Certificado cargado exitosamente',
        valido_hasta: validacion.expiraEn,
      });
    } catch (err) {
      console.error('Error al cargar certificado:', err);
      const message = err instanceof Error ? err.message : 'Error al cargar certificado digital';
      res.status(500).json({ error: message });
    }
  },
);

// ============================================================
// Configuration history endpoint (Task 11.2a)
// Requirements: 11.7
// ============================================================

/**
 * GET /api/fiscal/config/history — Return config change history
 */
router.get(
  '/config/history',
  requireAuth,
  requireRole('ADMIN'),
  async (_req, res) => {
    try {
      const result = await query(
        `SELECT h.id, h.config_snapshot, h.campos_modificados, h.modificado_por,
                h.created_at, p.email AS modificado_por_email
         FROM fiscal_config_history h
         LEFT JOIN profiles p ON p.id = h.modificado_por
         ORDER BY h.created_at DESC`,
      );

      res.json(result.rows);
    } catch (err) {
      console.error('Error al obtener historial de configuración:', err);
      const message = err instanceof Error ? err.message : 'Error al obtener historial de configuración';
      res.status(500).json({ error: message });
    }
  },
);

// ============================================================
// Sequence endpoints (Task 11.3)
// Requirements: 4.1, 4.3
// ============================================================

/**
 * GET /api/fiscal/sequences — List all fiscal sequences
 */
router.get(
  '/sequences',
  requireAuth,
  requireRole('ADMIN'),
  async (_req, res) => {
    try {
      const result = await query(
        `SELECT * FROM fiscal_sequences ORDER BY tipo_comprobante, created_at DESC`,
      );
      res.json(result.rows);
    } catch (err) {
      console.error('Error al listar secuencias fiscales:', err);
      const message = err instanceof Error ? err.message : 'Error al listar secuencias fiscales';
      res.status(500).json({ error: message });
    }
  },
);

/**
 * POST /api/fiscal/sequences — Create a new fiscal sequence
 *
 * Body: { tipoComprobante, prefijo, rangoInicial, rangoFinal, fechaVencimiento }
 */
router.post(
  '/sequences',
  requireAuth,
  requireRole('ADMIN'),
  async (req, res) => {
    try {
      const user = (req as any).user as JwtPayload;
      const { tipoComprobante, prefijo, rangoInicial, rangoFinal, fechaVencimiento } = req.body;

      if (!tipoComprobante || !prefijo || rangoInicial == null || rangoFinal == null || !fechaVencimiento) {
        res.status(400).json({ error: 'Todos los campos son requeridos: tipoComprobante, prefijo, rangoInicial, rangoFinal, fechaVencimiento' });
        return;
      }

      const secuencia = await registrarSecuencia({
        tipoComprobante,
        prefijo,
        rangoInicial: Number(rangoInicial),
        rangoFinal: Number(rangoFinal),
        numeroActual: Number(rangoInicial),
        fechaVencimiento: new Date(fechaVencimiento),
      });

      await registrarAuditoria(
        'secuencia_creada',
        { tipoComprobante, prefijo, rangoInicial, rangoFinal, fechaVencimiento },
        user.userId,
      );

      res.status(201).json(secuencia);
    } catch (err) {
      console.error('Error al crear secuencia fiscal:', err);
      const message = err instanceof Error ? err.message : 'Error al crear secuencia fiscal';
      res.status(500).json({ error: message });
    }
  },
);

/**
 * GET /api/fiscal/sequences/status — Usage stats for all active sequences
 */
router.get(
  '/sequences/status',
  requireAuth,
  requireRole('ADMIN'),
  async (_req, res) => {
    try {
      const result = await query(
        `SELECT tipo_comprobante, prefijo, rango_inicial, rango_final, numero_actual,
                fecha_vencimiento, estado,
                ROUND(((numero_actual - rango_inicial)::numeric / NULLIF(rango_final - rango_inicial, 0)) * 100, 1) AS porcentaje_uso,
                (rango_final - numero_actual + 1) AS disponibles
         FROM fiscal_sequences
         WHERE estado = 'activa'
         ORDER BY tipo_comprobante`,
      );
      res.json(result.rows);
    } catch (err) {
      console.error('Error al obtener estado de secuencias:', err);
      const message = err instanceof Error ? err.message : 'Error al obtener estado de secuencias';
      res.status(500).json({ error: message });
    }
  },
);

// ============================================================
// Audit log endpoint (Task 11.4)
// Requirements: 3.5
// ============================================================

/**
 * GET /api/fiscal/audit-log — Return audit log entries with optional filters
 *
 * Query params:
 *  - evento (string) — filter by event type
 *  - invoice_id (UUID) — filter by invoice
 *  - fecha_desde (ISO date) — filter created_at >= fecha_desde
 *  - fecha_hasta (ISO date) — filter created_at <= fecha_hasta (end of day)
 *  - page (number, default 1)
 *  - limit (number, default 50, max 200)
 */
router.get(
  '/audit-log',
  requireAuth,
  requireRole('ADMIN'),
  async (req, res) => {
    try {
      const {
        evento,
        invoice_id,
        fecha_desde,
        fecha_hasta,
        page: pageParam,
        limit: limitParam,
      } = req.query as Record<string, string | undefined>;

      const page = Math.max(1, parseInt(pageParam || '1', 10) || 1);
      const limit = Math.min(200, Math.max(1, parseInt(limitParam || '50', 10) || 50));
      const offset = (page - 1) * limit;

      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (evento) {
        conditions.push('a.evento = $' + paramIndex);
        params.push(evento);
        paramIndex++;
      }

      if (invoice_id) {
        conditions.push('a.invoice_id = $' + paramIndex);
        params.push(invoice_id);
        paramIndex++;
      }

      if (fecha_desde) {
        conditions.push('a.created_at >= $' + paramIndex);
        params.push(fecha_desde);
        paramIndex++;
      }

      if (fecha_hasta) {
        conditions.push('a.created_at <= ($' + paramIndex + '::date + interval \'1 day\' - interval \'1 second\')');
        params.push(fecha_hasta);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

      const countResult = await query(
        'SELECT COUNT(*) AS total FROM fiscal_audit_log a ' + whereClause,
        params,
      );
      const total = parseInt(countResult.rows[0].total, 10);

      const dataResult = await query(
        `SELECT a.id, a.evento, a.invoice_id, a.usuario_id, a.datos, a.created_at,
                p.email AS usuario_email
         FROM fiscal_audit_log a
         LEFT JOIN profiles p ON p.id = a.usuario_id
         ${whereClause}
         ORDER BY a.created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset],
      );

      res.json({
        data: dataResult.rows,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (err) {
      console.error('Error al obtener log de auditoría:', err);
      const message = err instanceof Error ? err.message : 'Error al obtener log de auditoría';
      res.status(500).json({ error: message });
    }
  },
);

export default router;
