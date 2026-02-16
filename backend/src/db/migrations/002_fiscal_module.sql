-- ============================================================
-- Fiscal Module - Database Migration
-- Tables: fiscal_config, fiscal_config_history, fiscal_sequences,
--         fiscal_invoices, fiscal_audit_log
-- ============================================================

-- ==========================================
-- fiscal_config
-- Stores emitter fiscal configuration (RNC, certificates, DGII connection)
-- ==========================================
CREATE TABLE IF NOT EXISTS fiscal_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rnc_emisor VARCHAR(11) NOT NULL,
  razon_social VARCHAR(255) NOT NULL,
  nombre_comercial VARCHAR(255),
  direccion_fiscal TEXT NOT NULL,
  telefono VARCHAR(20),
  correo VARCHAR(255),

  -- Conexión DGII
  dgii_ws_url_pruebas TEXT,
  dgii_ws_url_produccion TEXT,
  ambiente VARCHAR(10) DEFAULT 'pruebas' CHECK (ambiente IN ('pruebas', 'produccion')),

  -- Certificado digital (cifrado)
  certificado_p12 BYTEA,
  certificado_password_encrypted TEXT,
  certificado_valido_hasta DATE,

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- fiscal_config_history
-- Tracks changes to fiscal configuration (Req 11.6)
-- ==========================================
CREATE TABLE IF NOT EXISTS fiscal_config_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_snapshot JSONB NOT NULL,
  campos_modificados TEXT[] NOT NULL,
  modificado_por UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fiscal_config_history_fecha ON fiscal_config_history(created_at);

-- ==========================================
-- fiscal_sequences
-- Manages authorized NCF sequences (Req 4.1)
-- ==========================================
CREATE TABLE IF NOT EXISTS fiscal_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_comprobante VARCHAR(2) NOT NULL,
  prefijo VARCHAR(3) NOT NULL,
  rango_inicial INTEGER NOT NULL,
  rango_final INTEGER NOT NULL,
  numero_actual INTEGER NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  estado VARCHAR(10) DEFAULT 'activa' CHECK (estado IN ('activa', 'agotada', 'vencida')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tipo_comprobante, prefijo, rango_inicial)
);

-- ==========================================
-- fiscal_invoices
-- Stores electronic fiscal documents (e-CF) (Req 8.1)
-- ==========================================
CREATE TABLE IF NOT EXISTS fiscal_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES skating_orders(id),
  ncf VARCHAR(19) UNIQUE NOT NULL,
  tipo_comprobante VARCHAR(2) NOT NULL,

  -- Datos del comprador
  comprador_rnc VARCHAR(11),
  comprador_nombre VARCHAR(255) NOT NULL,
  comprador_tipo VARCHAR(20) NOT NULL CHECK (comprador_tipo IN ('persona_juridica', 'persona_fisica', 'consumidor_final')),

  -- Montos
  subtotal DECIMAL(12,2) NOT NULL,
  total_itbis DECIMAL(12,2) NOT NULL,
  total DECIMAL(12,2) NOT NULL,

  -- XML
  xml_original TEXT NOT NULL,
  xml_firmado TEXT,

  -- Estado DGII
  track_id VARCHAR(100),
  estado_dgii VARCHAR(30) DEFAULT 'pendiente_envio'
    CHECK (estado_dgii IN ('pendiente_envio', 'enviado', 'aceptado', 'rechazado', 'aceptado_condicional', 'en_proceso', 'anulado')),
  motivo_rechazo TEXT,
  intentos_envio INTEGER DEFAULT 0,

  -- Acuse y aprobación
  acuse_recibido BOOLEAN DEFAULT FALSE,
  acuse_fecha TIMESTAMPTZ,
  aprobacion_comercial BOOLEAN DEFAULT FALSE,
  aprobacion_fecha TIMESTAMPTZ,

  -- Metadata
  emitido_por UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_order ON fiscal_invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_ncf ON fiscal_invoices(ncf);
CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_estado ON fiscal_invoices(estado_dgii);
CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_tipo ON fiscal_invoices(tipo_comprobante);
CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_fecha ON fiscal_invoices(created_at);

-- ==========================================
-- fiscal_audit_log
-- Records all fiscal operations for traceability (Req 3.5, 7.4)
-- ==========================================
CREATE TABLE IF NOT EXISTS fiscal_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento VARCHAR(50) NOT NULL,
  invoice_id UUID REFERENCES fiscal_invoices(id) ON DELETE SET NULL,
  usuario_id UUID REFERENCES profiles(id),
  datos JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fiscal_audit_evento ON fiscal_audit_log(evento);
CREATE INDEX IF NOT EXISTS idx_fiscal_audit_invoice ON fiscal_audit_log(invoice_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_audit_fecha ON fiscal_audit_log(created_at);
