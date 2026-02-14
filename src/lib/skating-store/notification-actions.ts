"use server";

import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY || process.env.NEXT_PUBLIC_RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://skating.hunykho.com';

interface NotificationData {
  orderId: string;
  customerName: string;
  customerEmail: string;
  status: string;
  deliveryName?: string;
  deliveryRating?: number;
}

export async function sendOrderNotification({ 
  orderId, 
  customerName, 
  customerEmail, 
  status, 
  deliveryName, 
  deliveryRating 
}: NotificationData) {
  // Determine content before checking Resend to allow simulation logging
  let subject = '';
  let title = '';
  let message = '';
  let color = '#D7F000'; // Lime primary

  switch (status) {
    case 'RECEIVED':
      subject = `¡Pedido Recibido! #${orderId.slice(0, 8)}`;
      title = '¡Hemos recibido tu pedido!';
      message = 'Estamos preparando todo para que tus productos lleguen lo antes posible. Te avisaremos cuando asignemos un repartidor.';
      break;
    case 'ASIGNADO':
      subject = `¡Repartidor asignado! #${orderId.slice(0, 8)}`;
      title = 'Tu pedido ya tiene repartidor';
      message = `¡Buenas noticias! <strong>${deliveryName}</strong> se encargará de llevar tu pedido.`;
      if (deliveryRating) {
        message += `<br>Puntuación del repartidor: <strong>⭐ ${deliveryRating}/5</strong>`;
      }
      break;
    case 'EN_RUTA':
      subject = `¡Tu pedido va en camino! #${orderId.slice(0, 8)}`;
      title = '¡Ya vamos para allá!';
      message = 'El repartidor ha recogido tu paquete y está en camino a tu dirección. ¡Ten tu teléfono a mano!';
      break;
    case 'CERCA':
      subject = `¡El repartidor está cerca! #${orderId.slice(0, 8)}`;
      title = '¡Estamos a la vuelta!';
      message = 'Tu repartidor está muy cerca de tu ubicación. Por favor, prepárate para recibir tu pedido.';
      color = '#FFD700'; // Gold/Yellow for urgency
      break;
    case 'ENTREGADO':
      subject = `¡Pedido entregado! #${orderId.slice(0, 8)}`;
      title = '¡Disfruta tu compra!';
      message = 'El pedido ha sido entregado exitosamente. ¡Gracias por confiar en RD Patina!';
      color = '#10B981'; // Emerald/Green for success
      break;
    default:
       console.log(`Unknown status for notification: ${status}`);
       return;
  }

  if (!resend) {
    console.log(`[Notification Simulated] Status: ${status} | To: ${customerEmail}`);
    console.log(`[Content] Subject: ${subject}`);
    return;
  }

  if (!customerEmail) {
    console.log(`[Notification Skipped] Email missing for order ${orderId}`);
    return;
  }

  const trackingLink = `${APP_URL}/skating-store/tracking/${orderId}`;

  try {
    const { error } = await resend.emails.send({
      from: 'RD Patina <noreply@hunykho.com>',
      to: customerEmail,
      subject: subject,
      html: `
        <div style="font-family: 'Archivo Black', sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 0; border-radius: 12px; overflow: hidden;">
          <div style="background: #000; padding: 30px; text-align: center;">
            <h1 style="color: #D7F000; margin: 0; text-transform: uppercase; font-style: italic; letter-spacing: -1px;">RD PATINA</h1>
          </div>
          <div style="padding: 30px; text-align: center;">
            <h2 style="color: #000; text-transform: uppercase; font-style: italic; letter-spacing: -0.5px; margin-top: 0;">${title}</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.5; font-family: sans-serif;">Hola ${customerName},</p>
            <p style="color: #333; font-size: 16px; line-height: 1.5; font-family: sans-serif;">${message}</p>
            
            <div style="margin: 40px 0;">
              <a href="${trackingLink}" style="background: ${color}; color: #000; padding: 18px 30px; border-radius: 50px; text-decoration: none; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; font-size: 14px; display: inline-block; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                Seguir mi pedido en vivo
              </a>
            </div>
            
            <p style="color: #999; font-size: 14px; font-family: sans-serif;">Pedido: #${orderId.slice(0, 8)}</p>
          </div>
          <div style="background: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #eee;">
            <p style="margin: 0; font-size: 12px; color: #999; font-family: sans-serif;">&copy; 2026 RD Patina. Todos los derechos reservados.</p>
          </div>
        </div>
      `
    });

    if (error) {
       console.error("Resend API Error:", error);
       throw new Error(error.message);
    }
    
    console.log(`Notification sent: ${status} to ${customerEmail}`);
  } catch (error: any) {
    console.error(`Error enviando notificación (${status}):`, error.message || error);
    // Don't throw, just log, so we don't break the main flow
  }
}

interface AdminNewOrderEmailData {
  orderId: string;
  customerName: string;
  customerEmail: string;
  address: string;
  city: string;
  phone: string;
  total: number;
  paymentMethod: string;
  itemCount: number;
  adminEmails: string[];
}

export async function sendAdminNewOrderEmail(data: AdminNewOrderEmailData) {
  if (!resend || data.adminEmails.length === 0) {
    console.log(`[Admin Email Simulated] New order ${data.orderId} to ${data.adminEmails.join(", ")}`);
    return;
  }

  const totalFormatted = `RD$${data.total.toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;
  const payment = data.paymentMethod === "card" ? "Tarjeta" : "Efectivo";
  const adminUrl = `${APP_URL}/admin/orders`;

  try {
    const { error } = await resend.emails.send({
      from: "RD Patina <noreply@hunykho.com>",
      to: data.adminEmails,
      subject: `🛒 Nuevo Pedido #${data.orderId.slice(0, 8)} — ${totalFormatted}`,
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
          <div style="background:#000;padding:24px 30px;text-align:center;">
            <h1 style="color:#D7F000;margin:0;font-size:20px;text-transform:uppercase;letter-spacing:2px;">RD PATINA — ADMIN</h1>
            <p style="color:#999;margin:4px 0 0;font-size:12px;">Nuevo Pedido Recibido</p>
          </div>
          <div style="padding:24px 30px;">
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;text-align:center;margin-bottom:20px;">
              <span style="color:#16a34a;font-weight:700;font-size:14px;">NUEVO PEDIDO</span>
            </div>
            <table style="width:100%;font-size:14px;border-collapse:collapse;">
              <tr><td style="padding:6px 0;color:#666;">Pedido:</td><td style="padding:6px 0;font-weight:600;">#${data.orderId.slice(0, 8).toUpperCase()}</td></tr>
              <tr><td style="padding:6px 0;color:#666;">Cliente:</td><td style="padding:6px 0;font-weight:600;">${data.customerName}</td></tr>
              <tr><td style="padding:6px 0;color:#666;">Email:</td><td style="padding:6px 0;">${data.customerEmail}</td></tr>
              <tr><td style="padding:6px 0;color:#666;">Teléfono:</td><td style="padding:6px 0;">${data.phone}</td></tr>
              <tr><td style="padding:6px 0;color:#666;">Dirección:</td><td style="padding:6px 0;">${data.address}, ${data.city}</td></tr>
              <tr><td style="padding:6px 0;color:#666;">Productos:</td><td style="padding:6px 0;">${data.itemCount} artículo${data.itemCount > 1 ? "s" : ""}</td></tr>
              <tr><td style="padding:6px 0;color:#666;">Pago:</td><td style="padding:6px 0;font-weight:600;">${payment}</td></tr>
            </table>
            <div style="margin-top:16px;padding:12px;background:#000;border-radius:8px;text-align:center;">
              <span style="color:#D7F000;font-size:24px;font-weight:900;">${totalFormatted}</span>
            </div>
            <div style="margin-top:20px;text-align:center;">
              <a href="${adminUrl}" style="background:#D7F000;color:#000;padding:14px 28px;border-radius:50px;text-decoration:none;font-weight:700;text-transform:uppercase;letter-spacing:1px;font-size:13px;display:inline-block;">
                Gestionar Pedido
              </a>
            </div>
          </div>
          <div style="background:#f9fafb;padding:14px 30px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:11px;color:#999;">&copy; ${new Date().getFullYear()} RD Patina — Notificación Administrativa</p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("Admin email error:", error);
    } else {
      console.log(`Admin notification email sent for order ${data.orderId}`);
    }
  } catch (error: any) {
    console.error("Error sending admin email:", error.message);
  }
}

interface DeliveryAlertData {
  deliveryEmail: string;
  deliveryName: string;
  subject: string;
  message: string;
  orderId?: string;
}

export async function sendDeliveryAlert({ deliveryEmail, deliveryName, subject, message, orderId }: DeliveryAlertData) {
  if (!resend || !deliveryEmail) {
    console.log(`[Delivery Alert Simulated] To: ${deliveryEmail} | Subject: ${subject}`);
    return { success: true };
  }

  try {
    const deliveryUrl = `${APP_URL}/delivery`;
    const { error } = await resend.emails.send({
      from: "RD Patina <noreply@hunykho.com>",
      to: deliveryEmail,
      subject: `🚚 ${subject}`,
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
          <div style="background:#000;padding:24px 30px;text-align:center;">
            <h1 style="color:#D7F000;margin:0;font-size:20px;text-transform:uppercase;letter-spacing:2px;">RD PATINA</h1>
            <p style="color:#999;margin:4px 0 0;font-size:12px;">Notificación para Repartidor</p>
          </div>
          <div style="padding:24px 30px;">
            <h2 style="margin:0 0 12px;font-size:18px;">${subject}</h2>
            <p style="color:#333;font-size:15px;line-height:1.6;">Hola ${deliveryName},</p>
            <p style="color:#333;font-size:15px;line-height:1.6;">${message}</p>
            ${orderId ? `<p style="color:#666;font-size:13px;margin-top:16px;">Pedido: #${orderId.slice(0, 8).toUpperCase()}</p>` : ""}
            <div style="margin:24px 0;text-align:center;">
              <a href="${deliveryUrl}" style="background:#D7F000;color:#000;padding:14px 28px;border-radius:50px;text-decoration:none;font-weight:700;text-transform:uppercase;letter-spacing:1px;font-size:13px;display:inline-block;">
                Abrir Panel de Entregas
              </a>
            </div>
          </div>
          <div style="background:#f9fafb;padding:14px 30px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:11px;color:#999;">&copy; ${new Date().getFullYear()} RD Patina</p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("Delivery alert error:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error: any) {
    console.error("Error sending delivery alert:", error.message);
    return { success: false, error: error.message };
  }
}
