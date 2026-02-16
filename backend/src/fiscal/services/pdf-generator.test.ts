import { describe, it, expect } from 'vitest';
import { generarUrlQR, generarPDF } from './pdf-generator.js';
import type { FiscalInvoice, FiscalConfig } from '../types.js';

// ============================================================
// Unit tests for PDFGeneratorService
// Requirements: 5.1, 5.2, 5.3
// ============================================================

// --- generarUrlQR (pure function) ---

describe('generarUrlQR', () => {
  it('returns a URL with the correct base and parameters', () => {
    const url = generarUrlQR('E310000000001', '123456789');
    expect(url).toBe(
      'https://dgii.gov.do/ecf/consulta?ncf=E310000000001&rnc=123456789',
    );
  });

  it('encodes special characters in NCF and RNC', () => {
    const url = generarUrlQR('E31 0001', '123&456');
    expect(url).toContain('ncf=E31%200001');
    expect(url).toContain('rnc=123%26456');
  });

  it('includes both ncf and rnc query params', () => {
    const url = generarUrlQR('NCF123', 'RNC456');
    const parsed = new URL(url);
    expect(parsed.searchParams.get('ncf')).toBe('NCF123');
    expect(parsed.searchParams.get('rnc')).toBe('RNC456');
  });

  it('uses the DGII domain', () => {
    const url = generarUrlQR('X', 'Y');
    expect(url).toMatch(/^https:\/\/dgii\.gov\.do\//);
  });
});

// --- generarPDF ---

/** Minimal FiscalInvoice fixture */
function makeInvoice(overrides: Partial<FiscalInvoice> = {}): FiscalInvoice {
  return {
    id: 'inv-001',
    order_id: 'order-001',
    ncf: 'E310000000001',
    tipo_comprobante: '31',
    comprador_rnc: '123456789',
    comprador_nombre: 'Acme Corp',
    comprador_tipo: 'persona_juridica',
    subtotal: 1000,
    total_itbis: 180,
    total: 1180,
    xml_original: `<?xml version="1.0" encoding="UTF-8"?>
<ECF>
  <DetallesItems>
    <Item>
      <Nombre>Skateboard Pro</Nombre>
      <Cantidad>2</Cantidad>
      <PrecioUnitario>500.00</PrecioUnitario>
      <MontoGravado>1000.00</MontoGravado>
      <ITBIS>180.00</ITBIS>
    </Item>
  </DetallesItems>
</ECF>`,
    xml_firmado: null,
    track_id: null,
    estado_dgii: 'pendiente_envio',
    motivo_rechazo: null,
    intentos_envio: 0,
    acuse_recibido: false,
    acuse_fecha: null,
    aprobacion_comercial: false,
    aprobacion_fecha: null,
    emitido_por: 'user-001',
    created_at: new Date('2025-01-15'),
    updated_at: new Date('2025-01-15'),
    ...overrides,
  };
}

/** Minimal FiscalConfig fixture */
function makeConfig(overrides: Partial<FiscalConfig> = {}): FiscalConfig {
  return {
    id: 'cfg-001',
    rnc_emisor: '101234567',
    razon_social: 'Skate Shop SRL',
    nombre_comercial: 'Skate Shop',
    direccion_fiscal: 'Calle Principal #1, Santo Domingo',
    telefono: '809-555-0000',
    correo: 'fiscal@skateshop.do',
    dgii_ws_url_pruebas: null,
    dgii_ws_url_produccion: null,
    ambiente: 'pruebas',
    certificado_p12: null,
    certificado_password_encrypted: null,
    certificado_valido_hasta: null,
    updated_at: new Date(),
    ...overrides,
  };
}

describe('generarPDF', () => {
  it('returns a non-empty Buffer', async () => {
    const pdf = await generarPDF(makeInvoice(), makeConfig());
    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.length).toBeGreaterThan(0);
  });

  it('starts with the PDF magic bytes (%PDF)', async () => {
    const pdf = await generarPDF(makeInvoice(), makeConfig());
    const header = pdf.subarray(0, 5).toString('ascii');
    expect(header).toBe('%PDF-');
  });

  it('works for consumidor final (no RNC)', async () => {
    const invoice = makeInvoice({
      comprador_rnc: null,
      comprador_tipo: 'consumidor_final',
      tipo_comprobante: '32',
    });
    const pdf = await generarPDF(invoice, makeConfig());
    expect(pdf.length).toBeGreaterThan(0);
  });
});
