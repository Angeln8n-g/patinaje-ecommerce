// ============================================================
// Fiscal Module - TypeScript Types & Interfaces
// Matches DB schema from 002_fiscal_module.sql and design.md
// ============================================================

// --- Enums & Union Types ---

/** Tipos de comprobante fiscal según la DGII */
export type TipoComprobante =
  | '31'  // Factura de Crédito Fiscal
  | '32'  // Factura de Consumo
  | '33'  // Nota de Débito
  | '34'  // Nota de Crédito
  | '41'  // Compras
  | '43'  // Gastos Menores
  | '44'  // Regímenes Especiales
  | '45'  // Gubernamental
  | '46'  // Exportaciones
  | '47'; // Pagos al Exterior

/** Estados posibles de un e-CF en la DGII */
export type EstadoDGII =
  | 'Aceptado'
  | 'Rechazado'
  | 'AceptadoCondicional'
  | 'EnProceso'
  | 'Anulado';

/** Estados internos del e-CF en la base de datos */
export type EstadoInterno =
  | 'pendiente_envio'
  | 'enviado'
  | 'aceptado'
  | 'rechazado'
  | 'aceptado_condicional'
  | 'en_proceso'
  | 'anulado';

/** Tipo de comprador para el e-CF */
export type TipoComprador =
  | 'persona_juridica'
  | 'persona_fisica'
  | 'consumidor_final';

/** Tipos de evento registrados en el log de auditoría */
export type TipoEventoAuditoria =
  | 'ecf_generado'
  | 'ecf_firmado'
  | 'ecf_enviado'
  | 'ecf_estado_actualizado'
  | 'ecf_anulado'
  | 'acuse_recibido'
  | 'aprobacion_comercial'
  | 'secuencia_creada'
  | 'secuencia_alerta'
  | 'certificado_cargado'
  | 'config_actualizada'
  | 'config_historial_creado';

/** Estado de una secuencia fiscal */
export type EstadoSecuencia = 'activa' | 'agotada' | 'vencida';

/** Ambiente de conexión con la DGII */
export type AmbienteDGII = 'pruebas' | 'produccion';

// --- Data Interfaces ---

/** Datos del emisor (empresa) para el e-CF */
export interface DatosEmisor {
  rnc: string;
  razonSocial: string;
  nombreComercial?: string;
  direccion: string;
  telefono?: string;
  correo?: string;
}

/** Datos del comprador en el e-CF */
export interface DatosComprador {
  rnc?: string;
  nombre: string;
  tipo: TipoComprador;
}

/** Ítem individual dentro de una factura fiscal */
export interface ItemFactura {
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  montoGravado: number;
  itbis: number;
}

/** Datos completos de un Comprobante Fiscal Electrónico */
export interface ECFData {
  ncf: string;
  tipoComprobante: TipoComprobante;
  emisor: DatosEmisor;
  comprador: DatosComprador;
  items: ItemFactura[];
  subtotal: number;
  totalITBIS: number;
  total: number;
  fechaEmision: Date;
  ordenId: string;
}

/** Respuesta del Web Service de la DGII */
export interface DGIIResponse {
  trackId: string;
  estado: EstadoDGII;
  mensajes: string[];
}

/** Secuencia fiscal autorizada por la DGII */
export interface SecuenciaFiscal {
  id: string;
  tipoComprobante: TipoComprobante;
  prefijo: string;
  rangoInicial: number;
  rangoFinal: number;
  numeroActual: number;
  fechaVencimiento: Date;
  estado: EstadoSecuencia;
}

/** Configuración del certificado digital para firma */
export interface CertificadoConfig {
  archivoP12: Buffer;
  password: string;
}

/** Resultado de una validación (XSD, RNC, etc.) */
export interface ValidationResult {
  valido: boolean;
  errores: string[];
}

// --- DB Model Interfaces ---

/** Modelo de base de datos: fiscal_invoices */
export interface FiscalInvoice {
  id: string;
  order_id: string;
  ncf: string;
  tipo_comprobante: TipoComprobante;

  // Datos del comprador
  comprador_rnc: string | null;
  comprador_nombre: string;
  comprador_tipo: TipoComprador;

  // Montos
  subtotal: number;
  total_itbis: number;
  total: number;

  // XML
  xml_original: string;
  xml_firmado: string | null;

  // Estado DGII
  track_id: string | null;
  estado_dgii: EstadoInterno;
  motivo_rechazo: string | null;
  intentos_envio: number;

  // Acuse y aprobación
  acuse_recibido: boolean;
  acuse_fecha: Date | null;
  aprobacion_comercial: boolean;
  aprobacion_fecha: Date | null;

  // Metadata
  emitido_por: string;
  created_at: Date;
  updated_at: Date;
}

/** Modelo de base de datos: fiscal_config */
export interface FiscalConfig {
  id: string;
  rnc_emisor: string;
  razon_social: string;
  nombre_comercial: string | null;
  direccion_fiscal: string;
  telefono: string | null;
  correo: string | null;

  // Conexión DGII
  dgii_ws_url_pruebas: string | null;
  dgii_ws_url_produccion: string | null;
  ambiente: AmbienteDGII;

  // Certificado digital (cifrado)
  certificado_p12: Buffer | null;
  certificado_password_encrypted: string | null;
  certificado_valido_hasta: Date | null;

  updated_at: Date;
}

/** Modelo de base de datos: fiscal_config_history */
export interface FiscalConfigHistory {
  id: string;
  config_snapshot: Record<string, unknown>;
  campos_modificados: string[];
  modificado_por: string;
  created_at: Date;
}

/** Modelo de base de datos: fiscal_audit_log */
export interface FiscalAuditLog {
  id: string;
  evento: TipoEventoAuditoria;
  invoice_id: string | null;
  usuario_id: string;
  datos: Record<string, unknown>;
  created_at: Date;
}
