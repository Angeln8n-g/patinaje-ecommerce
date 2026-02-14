"use server";

import { cookies } from "next/headers";
import { Resend } from "resend";
import { formatCurrency } from "@/lib/utils";
import { CartItem } from "@/types/skating-store";

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

interface InvoiceData {
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
}

function buildItemsTable(items: CartItem[]): string {
  const rows = items.map((item) => {
    const name = item.product?.name || "Producto";
    const variant = item.selectedVariant ? ` (${item.selectedVariant})` : "";
    const price = item.product?.price || 0;
    const lineTotal = price * item.quantity;
    return `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">${name}${variant}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${formatCurrency(price)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${formatCurrency(lineTotal)}</td>
    </tr>`;
  }).join("");
  return rows;
}

function buildInvoiceHtml(data: InvoiceData, invoiceNumber: string, type: "proforma" | "final"): string {
  const isProforma = type === "proforma";
  const title = isProforma ? "Pre-Factura" : "Factura";
  const statusLabel = isProforma ? "PENDIENTE DE PAGO" : "PAGADO";
  const statusColor = isProforma ? "#f59e0b" : "#10b981";
  const date = new Date().toLocaleDateString("es-DO", { year: "numeric", month: "long", day: "numeric" });
  const paymentLabel = data.paymentMethod === "card" ? "Tarjeta" : "Efectivo";

  return `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
  <div style="background:#000;padding:24px 30px;text-align:center;">
    <h1 style="color:#D7F000;margin:0;font-size:22px;text-transform:uppercase;letter-spacing:2px;">RD PATINA</h1>
    <p style="color:#999;margin:4px 0 0;font-size:12px;">${title}</p>
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
          <th style="padding:8px 12px;text-align:right;font-weight:600;">Total</th>
        </tr>
      </thead>
      <tbody>${buildItemsTable(data.items)}</tbody>
    </table>
    <div style="border-top:2px solid #e5e7eb;padding-top:12px;">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">
        <span style="color:#666;">Subtotal:</span>
        <span>${formatCurrency(data.subtotal)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">
        <span style="color:#666;">Envío:</span>
        <span>${data.shippingCost > 0 ? formatCurrency(data.shippingCost) : "Incluido"}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:700;margin-top:8px;padding-top:8px;border-top:2px solid #000;">
        <span>TOTAL:</span>
        <span>${formatCurrency(data.total)}</span>
      </div>
    </div>
  </div>
  <div style="background:#f9fafb;padding:16px 30px;text-align:center;border-top:1px solid #e5e7eb;">
    <p style="margin:0;font-size:11px;color:#999;">Pedido #${data.orderId.slice(0, 8).toUpperCase()} • ${isProforma ? "Esta pre-factura no es un comprobante de pago." : "Gracias por tu compra."}</p>
    <p style="margin:4px 0 0;font-size:11px;color:#bbb;">&copy; ${new Date().getFullYear()} RD Patina. Todos los derechos reservados.</p>
  </div>
</div>`;
}

/** Send a proforma (pre-invoice) when the order is created. */
export async function sendProformaInvoice(data: InvoiceData) {
  try {
    const invoiceNumber = "PRE-" + new Date().getFullYear() + "-" + data.orderId.substring(0, 6).toUpperCase();

    if (!resend || !data.customerEmail) {
      console.log(`[Proforma Simulated] To: ${data.customerEmail} | Order: ${data.orderId}`);
      return { success: true, invoiceNumber };
    }

    const html = buildInvoiceHtml(data, invoiceNumber, "proforma");
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
export async function generateAndSendInvoice(data: InvoiceData) {
  try {
    // Create invoice record in DB
    const result = await apiFetch("/api/delivery/invoices", {
      method: "POST",
      body: { order_id: data.orderId, customer_email: data.customerEmail, total: data.total },
    });
    const invoiceNumber = result.invoiceNumber;

    if (!resend || !data.customerEmail) {
      console.log(`[Invoice Simulated] To: ${data.customerEmail} | Invoice: ${invoiceNumber}`);
      return { success: true, invoiceNumber };
    }

    const html = buildInvoiceHtml(data, invoiceNumber, "final");
    const { error } = await resend.emails.send({
      from: "RD Patina <noreply@hunykho.com>",
      to: data.customerEmail,
      subject: `Factura ${invoiceNumber} - RD Patina`,
      html,
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
