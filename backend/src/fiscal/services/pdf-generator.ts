import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import type { FiscalInvoice, FiscalConfig } from '../types.js';

/**
 * Generates the DGII validation QR URL for a given NCF and RNC emisor.
 * Pure function — easy to test independently.
 */
export function generarUrlQR(ncf: string, rncEmisor: string): string {
  return `https://dgii.gov.do/ecf/consulta?ncf=${encodeURIComponent(ncf)}&rnc=${encodeURIComponent(rncEmisor)}`;
}

/**
 * Generates a PDF representation of a fiscal invoice (e-CF) including a QR code
 * for DGII validation.
 *
 * Requirements: 5.1, 5.2, 5.3
 */
export async function generarPDF(
  invoice: FiscalInvoice,
  config: FiscalConfig,
): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
  const chunks: Buffer[] = [];

  doc.on('data', (chunk: Buffer) => chunks.push(chunk));

  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  // --- QR Code ---
  const qrUrl = generarUrlQR(invoice.ncf, config.rnc_emisor);
  const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 120 });
  const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');
  const qrBuffer = Buffer.from(qrBase64, 'base64');

  // --- Header ---
  doc.fontSize(16).text(config.razon_social, { align: 'center' });
  if (config.nombre_comercial) {
    doc.fontSize(10).text(config.nombre_comercial, { align: 'center' });
  }
  doc.fontSize(9).text(`RNC: ${config.rnc_emisor}`, { align: 'center' });
  doc.text(config.direccion_fiscal, { align: 'center' });
  doc.moveDown();

  // --- NCF & Date ---
  doc.fontSize(11).text(`NCF: ${invoice.ncf}`);
  doc.text(`Tipo: ${invoice.tipo_comprobante}`);
  doc.text(`Fecha: ${new Date(invoice.created_at).toLocaleDateString('es-DO')}`);
  doc.moveDown();

  // --- Buyer ---
  doc.fontSize(10).text('Datos del Comprador:', { underline: true });
  doc.text(`Nombre: ${invoice.comprador_nombre}`);
  if (invoice.comprador_rnc) {
    doc.text(`RNC/Cédula: ${invoice.comprador_rnc}`);
  }
  doc.text(`Tipo: ${invoice.comprador_tipo}`);
  doc.moveDown();

  // --- Items table header ---
  doc.fontSize(10).text('Detalle de Ítems:', { underline: true });
  doc.moveDown(0.5);

  // Simple table via text columns
  const colX = { nombre: 50, cant: 280, precio: 340, gravado: 410, itbis: 480 };
  const y = doc.y;
  doc.fontSize(8);
  doc.text('Descripción', colX.nombre, y);
  doc.text('Cant.', colX.cant, y);
  doc.text('P. Unit.', colX.precio, y);
  doc.text('Gravado', colX.gravado, y);
  doc.text('ITBIS', colX.itbis, y);
  doc.moveDown();

  // Parse items from xml_original (simplified: use invoice fields if available)
  // Items are embedded in the XML; for the PDF we parse them out.
  const items = parseItemsFromXML(invoice.xml_original);
  for (const item of items) {
    const iy = doc.y;
    doc.text(item.nombre, colX.nombre, iy, { width: 220 });
    doc.text(String(item.cantidad), colX.cant, iy);
    doc.text(item.precioUnitario.toFixed(2), colX.precio, iy);
    doc.text(item.montoGravado.toFixed(2), colX.gravado, iy);
    doc.text(item.itbis.toFixed(2), colX.itbis, iy);
    doc.moveDown();
  }

  doc.moveDown();

  // --- Totals ---
  doc.fontSize(10);
  doc.text(`Subtotal: RD$ ${Number(invoice.subtotal).toFixed(2)}`, { align: 'right' });
  doc.text(`ITBIS: RD$ ${Number(invoice.total_itbis).toFixed(2)}`, { align: 'right' });
  doc.fontSize(12).text(`Total: RD$ ${Number(invoice.total).toFixed(2)}`, { align: 'right' });
  doc.moveDown();

  // --- QR image ---
  doc.image(qrBuffer, doc.page.width / 2 - 60, doc.y, { width: 120 });

  doc.end();

  return finished;
}

// ---------------------------------------------------------------------------
// Internal helper: extract items from the XML stored in the invoice
// ---------------------------------------------------------------------------

interface PDFItem {
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  montoGravado: number;
  itbis: number;
}

/**
 * Minimal XML item parser — avoids pulling in fast-xml-parser as a runtime dep
 * for the PDF service. Works with the XML structure produced by XMLGeneratorService.
 */
function parseItemsFromXML(xml: string): PDFItem[] {
  const items: PDFItem[] = [];
  const itemRegex = /<Item>([\s\S]*?)<\/Item>/g;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    items.push({
      nombre: extractTag(block, 'Nombre') ?? '',
      cantidad: Number(extractTag(block, 'Cantidad') ?? '0'),
      precioUnitario: Number(extractTag(block, 'PrecioUnitario') ?? '0'),
      montoGravado: Number(extractTag(block, 'MontoGravado') ?? '0'),
      itbis: Number(extractTag(block, 'ITBIS') ?? '0'),
    });
  }

  return items;
}

function extractTag(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}>(.*?)</${tag}>`);
  const m = re.exec(xml);
  return m ? m[1] : null;
}
