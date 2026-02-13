"use server";

import { cookies } from "next/headers";
import { Resend } from "resend";
import { formatCurrency } from "@/lib/utils";

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

export async function generateAndSendInvoice(orderId: string, customerEmail: string, total: number) {
  try {
    const result = await apiFetch("/api/delivery/invoices", {
      method: "POST",
      body: { order_id: orderId, customer_email: customerEmail, total },
    });
    const invoiceNumber = result.invoiceNumber;

    // Send email via Resend if configured
    if (resend && customerEmail) {
      const date = new Date();
      await resend.emails.send({
        from: "RD Patina <noreply@hunykho.com>",
        to: customerEmail,
        subject: `Tu Factura ${invoiceNumber} - RD Patina`,
        html: `<div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
          <h2 style="color: #D7F000; background: #000; padding: 10px; text-align: center; text-transform: uppercase;">Factura de Compra</h2>
          <p>Hola,</p><p>Gracias por tu compra en <strong>RD Patina</strong>.</p>
          <div style="background: #f9f9f9; padding: 15px; border-radius: 8px;">
            <p><strong>Número de Factura:</strong> ${invoiceNumber}</p>
            <p><strong>ID de Pedido:</strong> ${orderId.slice(0, 8)}</p>
            <p><strong>Total Pagado:</strong> ${formatCurrency(total)}</p>
            <p><strong>Fecha:</strong> ${date.toLocaleDateString()}</p>
          </div>
          <p style="margin-top: 20px; font-size: 12px; color: #666;">Este es un correo automático.</p>
        </div>`,
      }).catch((e) => console.error("Resend error:", e));
    }

    return { success: true, invoiceNumber };
  } catch (error: any) {
    console.error("Error al generar/enviar factura:", error.message);
    return { success: false, error: error.message || "Unknown error" };
  }
}
