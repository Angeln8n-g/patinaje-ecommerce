"use server";

import { createClient } from "@/lib/supabase/server";
import { Resend } from 'resend';
import { formatCurrency } from "@/lib/utils";

// Inicializar Resend
const resendApiKey = process.env.RESEND_API_KEY || process.env.NEXT_PUBLIC_RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

export async function generateAndSendInvoice(orderId: string, customerEmail: string, total: number) {
  const supabase = await createClient();
  
  try {
    // 1. Generar número de factura
    const date = new Date();
    const year = date.getFullYear();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const invoiceNumber = `FAC-${year}-${orderId.slice(0, 4).toUpperCase()}-${random}`;

    // 2. Guardar en la base de datos
    const { error: dbError } = await supabase
      .from('skating_invoices')
      .insert([{
        order_id: orderId,
        invoice_number: invoiceNumber,
        customer_email: customerEmail,
        total_amount: total,
        status: 'sent'
      }]);

    if (dbError) {
       console.error("Database error creating invoice:", dbError);
       throw new Error(`Database error: ${dbError.message}`);
    }

    // 3. Envío de email real con Resend (si hay API Key)
    if (resend) {
      const { error: emailError } = await resend.emails.send({
        from: 'RD Patina <onboarding@resend.dev>', // Cambiar por tu dominio verificado después
        to: customerEmail,
        subject: `Tu Factura ${invoiceNumber} - RD Patina`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
            <h2 style="color: #D7F000; background: #000; padding: 10px; text-align: center; text-transform: uppercase;">Factura de Compra</h2>
            <p>Hola,</p>
            <p>Gracias por tu compra en <strong>RD Patina</strong>. Adjuntamos los detalles de tu factura:</p>
            <div style="background: #f9f9f9; padding: 15px; border-radius: 8px;">
              <p><strong>Número de Factura:</strong> ${invoiceNumber}</p>
              <p><strong>ID de Pedido:</strong> ${orderId.slice(0, 8)}</p>
              <p><strong>Total Pagado:</strong> ${formatCurrency(total)}</p>
              <p><strong>Fecha:</strong> ${date.toLocaleDateString()}</p>
            </div>
            <p style="margin-top: 20px; font-size: 12px; color: #666;">
              Este es un correo automático, por favor no respondas a este mensaje.
            </p>
          </div>
        `
      });
      
      if (emailError) {
        console.error("Error sending email via Resend:", emailError);
        // No lanzamos error aquí para no revertir la creación de la factura en DB, pero logueamos
      } else {
        console.log(`Factura real enviada vía Resend a ${customerEmail}`);
      }
    } else {
      console.log(`[MODO SIMULACIÓN] Factura ${invoiceNumber} para ${customerEmail}`);
      // await new Promise(resolve => setTimeout(resolve, 800)); // No blocking delay needed in server action really
    }

    return { success: true, invoiceNumber };
  } catch (error: any) {
    // Mejorar el logging del error
    console.error("Error al generar/enviar factura:", error.message || error);
    // Return error object instead of throwing to avoid crashing client if not handled properly
    return { success: false, error: error.message || "Unknown error" };
  }
}
