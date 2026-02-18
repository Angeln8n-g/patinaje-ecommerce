"use server";

import { cookies } from "next/headers";
import { Resend } from "resend";
import { formatCurrency } from "@/lib/utils";
import { CartItem } from "@/types/skating-store";
import { jsPDF } from "jspdf";

const resendApiKey = process.env.RESEND_API_KEY || process.env.NEXT_PUBLIC_RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.hunykho.com";

async function apiFetch(endpoint: string, options: { method?: string; body?: any } = {}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("skating_token")?.value || null;
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `API Error: ${res.status}`);
  }
  return res.json();
}

const ITBIS_RATE = 0.18;

interface StoreConfig {
  rnc_emisor?: string;
  razon_social?: string;
  nombre_comercial?: string;
  direccion_fiscal?: string;
  telefono?: string;
  correo?: string;
}

/** Fetch store fiscal config (emisor data) — cached per request */
async function getStoreConfig(): Promise<StoreConfig | null> {
  try {
    const config = await apiFetch("/api/fiscal/config");
    return config || null;
  } catch {
    return null;
  }
}

interface FiscalData {
  rnc: string;
  nombre: string;
  tipoComprador: "persona_juridica" | "persona_fisica" | "consumidor_final";
  tipoComprobante: "31" | "32";
}

export interface InvoiceData {
  orderId: string;
  customerEmail: string;
  customerName: string;
  address: string;
  city: string;
  phone: string;
  items: CartItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  paymentMethod: "card" | "cash";
  fiscalData?: FiscalData | null;
}

/** Get the effective price for a cart item considering variant prices */
function getItemPrice(item: CartItem): number {
  if (item.selectedVariant && item.product?.variant_prices && item.product.variant_prices[item.selectedVariant] != null) {
    return item.product.variant_prices[item.selectedVariant];
  }
  return item.product?.price || 0;
}

/** Round to 2 decimal places */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Calculate ITBIS breakdown from the total (prices include tax) */
function calculateItbis(totalWithTax: number): { subtotalSinItbis: number; itbis: number } {
  const subtotalSinItbis = round2(totalWithTax / (1 + ITBIS_RATE));
  const itbis = round2(totalWithTax - subtotalSinItbis);
  return { subtotalSinItbis, itbis };
}

function buildItemsTable(items: CartItem[]): string {
  const rows = items.map((item) => {
    const name = item.product?.name || "Producto";
    const variant = item.selectedVariant ? ` (${item.selectedVariant})` : "";
    const price = getItemPrice(item);
    const lineTotal = price * item.quantity;
    const { subtotalSinItbis: unitSinItbis } = calculateItbis(price);
    const itbisLine = round2(lineTotal - round2(lineTotal / (1 + ITBIS_RATE)));
    return `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">${name}${variant}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${formatCurrency(price)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${formatCurrency(itbisLine)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${formatCurrency(lineTotal)}</td>
    </tr>`;
  }).join("");
  return rows;
}

function buildFiscalSection(fiscalData: FiscalData): string {
  const tipoCompradorLabel = fiscalData.tipoComprador === "persona_juridica"
    ? "Persona Jurídica"
    : fiscalData.tipoComprador === "persona_fisica"
      ? "Persona Física"
      : "Consumidor Final";
  const tipoComprobanteLabel = fiscalData.tipoComprobante === "31"
    ? "Factura de Crédito Fiscal (31)"
    : "Factura de Consumo (32)";

  return `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin-bottom:20px;">
      <p style="margin:0 0 8px;font-weight:700;font-size:14px;color:#1e40af;">📋 Datos Fiscales</p>
      <table style="font-size:13px;color:#333;">
        ${fiscalData.rnc ? `<tr><td style="padding:2px 8px 2px 0;color:#666;white-space:nowrap;">RNC / Cédula:</td><td style="padding:2px 0;font-weight:600;">${fiscalData.rnc}</td></tr>` : ""}
        <tr><td style="padding:2px 8px 2px 0;color:#666;white-space:nowrap;">Nombre / Razón Social:</td><td style="padding:2px 0;font-weight:600;">${fiscalData.nombre}</td></tr>
        <tr><td style="padding:2px 8px 2px 0;color:#666;white-space:nowrap;">Tipo de Comprador:</td><td style="padding:2px 0;">${tipoCompradorLabel}</td></tr>
        <tr><td style="padding:2px 8px 2px 0;color:#666;white-space:nowrap;">Tipo de Comprobante:</td><td style="padding:2px 0;">${tipoComprobanteLabel}</td></tr>
      </table>
    </div>`;
}

function buildInvoiceHtml(data: InvoiceData, invoiceNumber: string, type: "proforma" | "final", storeConfig?: StoreConfig | null): string {
  const isProforma = type === "proforma";
  const title = isProforma ? "Pre-Factura" : "Factura";
  const statusLabel = isProforma ? "PENDIENTE DE PAGO" : "PAGADO";
  const statusColor = isProforma ? "#f59e0b" : "#10b981";
  const date = new Date().toLocaleDateString("es-DO", { year: "numeric", month: "long", day: "numeric" });
  const paymentLabel = data.paymentMethod === "card" ? "Tarjeta" : "Efectivo";

  // Calculate ITBIS from the product subtotal (prices include tax)
  const productTotal = data.items.reduce((sum, item) => sum + getItemPrice(item) * item.quantity, 0);
  const { subtotalSinItbis, itbis: totalItbis } = calculateItbis(productTotal);

  const fiscalSection = data.fiscalData ? buildFiscalSection(data.fiscalData) : "";

  // Store/emisor info for header
  const storeRnc = storeConfig?.rnc_emisor || "";
  const storeRazonSocial = storeConfig?.razon_social || "";
  const storeDireccion = storeConfig?.direccion_fiscal || "";
  const storeTelefono = storeConfig?.telefono || "";

  const storeInfoHtml = storeRnc ? `
    <p style="color:#aaa;margin:6px 0 0;font-size:11px;">${storeRazonSocial}${storeRnc ? ` • RNC: ${storeRnc}` : ""}</p>
    ${storeDireccion ? `<p style="color:#888;margin:2px 0 0;font-size:10px;">${storeDireccion}${storeTelefono ? ` • Tel: ${storeTelefono}` : ""}</p>` : ""}
  ` : "";

  return `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:640px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
  <div style="background:#000;padding:24px 30px;text-align:center;">
    <h1 style="color:#D7F000;margin:0;font-size:22px;text-transform:uppercase;letter-spacing:2px;">RD PATINA</h1>
    <p style="color:#999;margin:4px 0 0;font-size:12px;">${title}</p>
    ${storeInfoHtml}
  </div>
  <div style="padding:24px 30px;">
    <div style="display:flex;justify-content:space-between;margin-bottom:20px;">
      <div>
        <p style="margin:0;font-size:13px;color:#666;">Número:</p>
        <p style="margin:2px 0 0;font-weight:700;font-size:15px;">${invoiceNumber}</p>
      </div>
      <div style="text-align:right;">
        <p style="margin:0;font-size:13px;color:#666;">Fecha:</p>
        <p style="margin:2px 0 0;font-size:14px;">${date}</p>
      </div>
    </div>
    <div style="background:${statusColor}22;border:1px solid ${statusColor}44;border-radius:8px;padding:8px 16px;text-align:center;margin-bottom:20px;">
      <span style="color:${statusColor};font-weight:700;font-size:13px;text-transform:uppercase;">${statusLabel}</span>
    </div>
    ${fiscalSection}
    <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:20px;">
      <p style="margin:0 0 4px;font-size:13px;color:#666;">Cliente:</p>
      <p style="margin:0;font-weight:600;">${data.customerName}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#555;">${data.address}, ${data.city}</p>
      <p style="margin:2px 0 0;font-size:13px;color:#555;">${data.phone}</p>
      <p style="margin:2px 0 0;font-size:13px;color:#555;">${data.customerEmail}</p>
      <p style="margin:8px 0 0;font-size:13px;color:#666;">Método de pago: <strong>${paymentLabel}</strong></p>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px;">
      <thead>
        <tr style="background:#f3f4f6;">
          <th style="padding:8px 12px;text-align:left;font-weight:600;">Producto</th>
          <th style="padding:8px 12px;text-align:center;font-weight:600;">Cant.</th>
          <th style="padding:8px 12px;text-align:right;font-weight:600;">Precio</th>
          <th style="padding:8px 12px;text-align:right;font-weight:600;">ITBIS</th>
          <th style="padding:8px 12px;text-align:right;font-weight:600;">Total</th>
        </tr>
      </thead>
      <tbody>${buildItemsTable(data.items)}</tbody>
    </table>
    <div style="border-top:2px solid #e5e7eb;padding-top:12px;">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">
        <span style="color:#666;">Subtotal (sin ITBIS):</span>
        <span>${formatCurrency(subtotalSinItbis)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">
        <span style="color:#666;">ITBIS (18%):</span>
        <span>${formatCurrency(totalItbis)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">
        <span style="color:#666;">Envío:</span>
        <span>${data.shippingCost > 0 ? formatCurrency(data.shippingCost) : "Gratis"}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:700;margin-top:8px;padding-top:8px;border-top:2px solid #000;">
        <span>TOTAL:</span>
        <span>${formatCurrency(data.total)}</span>
      </div>
    </div>
  </div>
  <div style="background:#f9fafb;padding:16px 30px;text-align:center;border-top:1px solid #e5e7eb;">
    <p style="margin:0;font-size:11px;color:#999;">Pedido #${data.orderId.slice(0, 8).toUpperCase()} • ${isProforma ? "Esta pre-factura no es un comprobante de pago." : "Gracias por tu compra."}</p>
    ${data.fiscalData ? '<p style="margin:4px 0 0;font-size:11px;color:#999;">Este documento incluye datos para comprobante fiscal. El e-CF será procesado por separado.</p>' : ""}
    <p style="margin:4px 0 0;font-size:11px;color:#bbb;">&copy; ${new Date().getFullYear()} RD Patina. Todos los derechos reservados.</p>
  </div>
</div>`;
}

/** Generate a PDF invoice using jsPDF */
function buildInvoicePdf(data: InvoiceData, invoiceNumber: string, type: "proforma" | "final", storeConfig?: StoreConfig | null): Buffer {
  const isProforma = type === "proforma";
  const title = isProforma ? "Pre-Factura" : "Factura";
  const statusLabel = isProforma ? "PENDIENTE DE PAGO" : "PAGADO";
  const date = new Date().toLocaleDateString("es-DO", { year: "numeric", month: "long", day: "numeric" });
  const paymentLabel = data.paymentMethod === "card" ? "Tarjeta" : "Efectivo";

  const productTotal = data.items.reduce((sum, item) => sum + getItemPrice(item) * item.quantity, 0);
  const { subtotalSinItbis, itbis: totalItbis } = calculateItbis(productTotal);

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = 0;

  // --- Header (black bar) ---
  const headerH = storeConfig?.rnc_emisor ? 40 : 32;
  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, pageW, headerH, "F");
  doc.setTextColor(215, 240, 0); // #D7F000
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("RD PATINA", pageW / 2, 16, { align: "center" });
  doc.setTextColor(153, 153, 153);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(title, pageW / 2, 25, { align: "center" });

  // Store fiscal info in header
  if (storeConfig?.rnc_emisor) {
    doc.setTextColor(170, 170, 170);
    doc.setFontSize(7);
    const storeInfo = `${storeConfig.razon_social || ""} • RNC: ${storeConfig.rnc_emisor}`;
    doc.text(storeInfo, pageW / 2, 31, { align: "center" });
    if (storeConfig.direccion_fiscal) {
      doc.setFontSize(6);
      doc.setTextColor(136, 136, 136);
      const addr = `${storeConfig.direccion_fiscal}${storeConfig.telefono ? ` • Tel: ${storeConfig.telefono}` : ""}`;
      doc.text(addr, pageW / 2, 36, { align: "center" });
    }
  }
  y = headerH + 8;

  // --- Invoice number & date ---
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.text("Numero:", margin, y);
  doc.text("Fecha:", pageW - margin, y, { align: "right" });
  y += 5;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(invoiceNumber, margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(date, pageW - margin, y, { align: "right" });
  y += 8;

  // --- Status badge ---
  const badgeW = 60;
  const badgeX = (pageW - badgeW) / 2;
  if (isProforma) {
    doc.setFillColor(254, 243, 199); // amber-100
    doc.setDrawColor(245, 158, 11);
  } else {
    doc.setFillColor(209, 250, 229); // emerald-100
    doc.setDrawColor(16, 185, 129);
  }
  doc.roundedRect(badgeX, y, badgeW, 8, 2, 2, "FD");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(isProforma ? 180 : 5, isProforma ? 120 : 150, isProforma ? 0 : 80);
  doc.text(statusLabel, pageW / 2, y + 5.5, { align: "center" });
  y += 14;

  // --- Fiscal data section ---
  if (data.fiscalData) {
    const fd = data.fiscalData;
    doc.setFillColor(239, 246, 255); // blue-50
    doc.setDrawColor(191, 219, 254);
    doc.roundedRect(margin, y, contentW, fd.rnc ? 30 : 25, 2, 2, "FD");
    doc.setTextColor(30, 64, 175);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Datos Fiscales", margin + 5, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(8);
    let fy = y + 12;
    if (fd.rnc) {
      doc.text(`RNC / Cedula: ${fd.rnc}`, margin + 5, fy);
      fy += 5;
    }
    doc.text(`Nombre: ${fd.nombre}`, margin + 5, fy);
    fy += 5;
    const tipoLabel = fd.tipoComprador === "persona_juridica" ? "Persona Juridica" : fd.tipoComprador === "persona_fisica" ? "Persona Fisica" : "Consumidor Final";
    doc.text(`Tipo: ${tipoLabel} | Comprobante: ${fd.tipoComprobante === "31" ? "Credito Fiscal (31)" : "Consumo (32)"}`, margin + 5, fy);
    y += fd.rnc ? 34 : 29;
  }

  // --- Customer info ---
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(margin, y, contentW, 32, 2, 2, "FD");
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.text("Cliente:", margin + 5, y + 6);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(data.customerName, margin + 5, y + 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(`${data.address}, ${data.city}`, margin + 5, y + 18);
  doc.text(`Tel: ${data.phone} | Email: ${data.customerEmail}`, margin + 5, y + 23);
  doc.text(`Metodo de pago: ${paymentLabel}`, margin + 5, y + 28);
  y += 38;

  // --- Items table ---
  const colWidths = [contentW * 0.36, contentW * 0.12, contentW * 0.18, contentW * 0.16, contentW * 0.18];
  const colX = [margin];
  for (let i = 1; i < colWidths.length; i++) colX.push(colX[i - 1] + colWidths[i - 1]);

  // Table header
  doc.setFillColor(243, 244, 246);
  doc.rect(margin, y, contentW, 8, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(50, 50, 50);
  const headers = ["Producto", "Cant.", "Precio", "ITBIS", "Total"];
  const aligns: Array<"left" | "center" | "right"> = ["left", "center", "right", "right", "right"];
  headers.forEach((h, i) => {
    const x = aligns[i] === "right" ? colX[i] + colWidths[i] - 3 : aligns[i] === "center" ? colX[i] + colWidths[i] / 2 : colX[i] + 3;
    doc.text(h, x, y + 5.5, { align: aligns[i] });
  });
  y += 8;

  // Table rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  for (const item of data.items) {
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
    const name = item.product?.name || "Producto";
    const variant = item.selectedVariant ? ` (${item.selectedVariant})` : "";
    const price = getItemPrice(item);
    const lineTotal = price * item.quantity;
    const itbisLine = round2(lineTotal - round2(lineTotal / (1 + ITBIS_RATE)));

    // Truncate long names
    const displayName = (name + variant).length > 30 ? (name + variant).substring(0, 28) + "..." : name + variant;

    doc.setTextColor(0, 0, 0);
    doc.text(displayName, colX[0] + 3, y + 5);
    doc.text(String(item.quantity), colX[1] + colWidths[1] / 2, y + 5, { align: "center" });
    doc.text(formatCurrency(price), colX[2] + colWidths[2] - 3, y + 5, { align: "right" });
    doc.setTextColor(100, 100, 100);
    doc.text(formatCurrency(itbisLine), colX[3] + colWidths[3] - 3, y + 5, { align: "right" });
    doc.setTextColor(0, 0, 0);
    doc.text(formatCurrency(lineTotal), colX[4] + colWidths[4] - 3, y + 5, { align: "right" });

    // Row separator
    doc.setDrawColor(238, 238, 238);
    doc.line(margin, y + 8, margin + contentW, y + 8);
    y += 9;
  }
  y += 4;

  // --- Totals ---
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, margin + contentW, y);
  y += 6;
  const totalsX = pageW - margin - 5;
  const labelsX = pageW - margin - 70;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Subtotal (sin ITBIS):", labelsX, y, { align: "right" });
  doc.setTextColor(0, 0, 0);
  doc.text(formatCurrency(subtotalSinItbis), totalsX, y, { align: "right" });
  y += 6;

  doc.setTextColor(100, 100, 100);
  doc.text("ITBIS (18%):", labelsX, y, { align: "right" });
  doc.setTextColor(0, 0, 0);
  doc.text(formatCurrency(totalItbis), totalsX, y, { align: "right" });
  y += 6;

  doc.setTextColor(100, 100, 100);
  doc.text("Envio:", labelsX, y, { align: "right" });
  doc.setTextColor(0, 0, 0);
  doc.text(data.shippingCost > 0 ? formatCurrency(data.shippingCost) : "Gratis", totalsX, y, { align: "right" });
  y += 4;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(labelsX - 10, y, totalsX, y);
  y += 6;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL:", labelsX, y, { align: "right" });
  doc.text(formatCurrency(data.total), totalsX, y, { align: "right" });
  y += 12;

  // --- Footer ---
  doc.setFillColor(249, 250, 251);
  doc.rect(0, y, pageW, 20, "F");
  doc.setDrawColor(229, 231, 235);
  doc.line(0, y, pageW, y);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(153, 153, 153);
  doc.text(
    `Pedido #${data.orderId.slice(0, 8).toUpperCase()} • ${isProforma ? "Esta pre-factura no es un comprobante de pago." : "Gracias por tu compra."}`,
    pageW / 2, y + 7, { align: "center" }
  );
  if (data.fiscalData) {
    doc.text("Este documento incluye datos para comprobante fiscal. El e-CF sera procesado por separado.", pageW / 2, y + 11, { align: "center" });
  }
  doc.text(`© ${new Date().getFullYear()} RD Patina. Todos los derechos reservados.`, pageW / 2, y + 15, { align: "center" });

  // Return as Buffer
  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}

/** Send a proforma (pre-invoice) when the order is created. */
export async function sendProformaInvoice(data: InvoiceData) {
  try {
    const invoiceNumber = "PRE-" + new Date().getFullYear() + "-" + data.orderId.substring(0, 6).toUpperCase();

    if (!resend || !data.customerEmail) {
      console.log(`[Proforma Simulated] To: ${data.customerEmail} | Order: ${data.orderId}`);
      return { success: true, invoiceNumber };
    }

    const storeConfig = await getStoreConfig();
    const html = buildInvoiceHtml(data, invoiceNumber, "proforma", storeConfig);
    const { error } = await resend.emails.send({
      from: "RD Patina <noreply@hunykho.com>",
      to: data.customerEmail,
      subject: `Pre-Factura ${invoiceNumber} - RD Patina`,
      html,
    });

    if (error) {
      console.error("Resend proforma error:", error);
      return { success: false, error: error.message };
    }

    console.log(`Proforma sent to ${data.customerEmail}`);
    return { success: true, invoiceNumber };
  } catch (error: any) {
    console.error("Error sending proforma:", error.message);
    return { success: false, error: error.message };
  }
}

/** Generate and send the final invoice when payment is confirmed. */
export async function generateAndSendInvoice(data: InvoiceData, { force = false }: { force?: boolean } = {}) {
  try {
    const result = await apiFetch("/api/delivery/invoices", {
      method: "POST",
      body: { order_id: data.orderId, customer_email: data.customerEmail, total: data.total },
    });
    const invoiceNumber = result.invoiceNumber;

    if (result.alreadyExists && !force) {
      console.log(`Invoice ${invoiceNumber} already sent for order ${data.orderId}, skipping duplicate email.`);
      return { success: true, invoiceNumber, alreadySent: true };
    }

    if (!resend || !data.customerEmail) {
      console.log(`[Invoice Simulated] To: ${data.customerEmail} | Invoice: ${invoiceNumber}`);
      return { success: true, invoiceNumber };
    }

    const storeConfig = await getStoreConfig();
    const html = buildInvoiceHtml(data, invoiceNumber, "final", storeConfig);
    const pdfBuffer = buildInvoicePdf(data, invoiceNumber, "final", storeConfig);
    const { error } = await resend.emails.send({
      from: "RD Patina <noreply@hunykho.com>",
      to: data.customerEmail,
      subject: `Factura ${invoiceNumber} - RD Patina`,
      html,
      attachments: [
        {
          filename: `Factura-${invoiceNumber}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    if (error) {
      console.error("Resend invoice error:", error);
      return { success: false, error: error.message, invoiceNumber };
    }

    console.log(`Invoice ${invoiceNumber} sent to ${data.customerEmail}`);
    return { success: true, invoiceNumber };
  } catch (error: any) {
    console.error("Error generating/sending invoice:", error.message);
    return { success: false, error: error.message };
  }
}
