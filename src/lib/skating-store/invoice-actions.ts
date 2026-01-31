import { createClient } from "@/lib/supabase/client";
import { Resend } from 'resend';

// Inicializar Resend (La API KEY debe estar en .env.local)
const resend = process.env.NEXT_PUBLIC_RESEND_API_KEY 
  ? new Resend(process.env.NEXT_PUBLIC_RESEND_API_KEY) 
  : null;

export async function generateAndSendInvoice(orderId: string, customerEmail: string, total: number) {
  const supabase = createClient();
  
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

    if (dbError) throw dbError;

    // 3. Envío de email real con Resend (si hay API Key)
    if (resend) {
      await resend.emails.send({
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
              <p><strong>Total Pagado:</strong> $${total.toFixed(2)}</p>
              <p><strong>Fecha:</strong> ${date.toLocaleDateString()}</p>
            </div>
            <p style="margin-top: 20px; font-size: 12px; color: #666;">
              Este es un correo automático, por favor no respondas a este mensaje.
            </p>
          </div>
        `
      });
      console.log(`Factura real enviada vía Resend a ${customerEmail}`);
    } else {
      console.log(`[MODO SIMULACIÓN] Factura ${invoiceNumber} para ${customerEmail}`);
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    return { success: true, invoiceNumber };
  } catch (error) {
    console.error("Error al generar/enviar factura:", error);
    throw error;
  }
}
