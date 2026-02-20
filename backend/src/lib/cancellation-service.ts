import pg from "pg";
import { query, withTransaction } from "../db/pool.js";

// ==========================================
// Types
// ==========================================

export interface CancelOrderParams {
  orderId: string;
  cancelledBy: string;
  cancelledByRole: "USER" | "DELIVERY" | "SELLER" | "ADMIN";
  reasonCode: string;
  reasonDescription?: string;
}

export interface CancelOrderResult {
  success: boolean;
  order: any;
  cancellation: any;
  inventoryRestored: boolean;
  notificationsSent: number;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
  statusCode?: number;
  order?: any;
  shipment?: any;
}

// ==========================================
// Reason code validation
// ==========================================

function requiresDescription(reasonCode: string): boolean {
  return reasonCode.endsWith("_other") || reasonCode === "admin_custom";
}

export function validateReasonCode(
  reasonCode: string | undefined,
  reasonDescription: string | undefined
): { valid: boolean; error?: string } {
  if (!reasonCode || reasonCode.trim() === "") {
    return { valid: false, error: "Debe seleccionar un motivo de cancelación" };
  }
  if (requiresDescription(reasonCode)) {
    if (!reasonDescription || reasonDescription.trim().length < 10) {
      return {
        valid: false,
        error: "La descripción debe tener al menos 10 caracteres",
      };
    }
  }
  return { valid: true };
}

// ==========================================
// Cancellation window
// ==========================================

export async function getCancellationWindow(): Promise<number> {
  try {
    const result = await query(
      "SELECT data FROM static_content WHERE slug = $1",
      ["site-settings"]
    );
    if (result.rows.length > 0 && result.rows[0].data) {
      const data =
        typeof result.rows[0].data === "string"
          ? JSON.parse(result.rows[0].data)
          : result.rows[0].data;
      if (
        typeof data.cancellation_window_minutes === "number" &&
        data.cancellation_window_minutes >= 5 &&
        data.cancellation_window_minutes <= 1440
      ) {
        return data.cancellation_window_minutes;
      }
    }
  } catch (err) {
    console.error("Error reading cancellation window:", err);
  }
  return 30; // default
}

// ==========================================
// Validation by role
// ==========================================

export async function validateCancellation(
  orderId: string,
  userId: string,
  role: "USER" | "DELIVERY" | "SELLER" | "ADMIN"
): Promise<ValidationResult> {
  // Fetch order — support both full UUID and partial ID (prefix match)
  let orderResult;
  const cleanId = orderId.replace(/^#/, "").trim();
  
  // Try exact match first
  orderResult = await query(
    "SELECT * FROM skating_orders WHERE id = $1",
    [cleanId]
  );
  
  // If not found, try prefix match (e.g. first 8 chars of UUID)
  if (orderResult.rows.length === 0) {
    orderResult = await query(
      "SELECT * FROM skating_orders WHERE id::text LIKE $1",
      [cleanId.toLowerCase() + "%"]
    );
  }
  
  if (orderResult.rows.length === 0) {
    return { valid: false, error: "Pedido no encontrado", statusCode: 404 };
  }
  if (orderResult.rows.length > 1) {
    return { valid: false, error: "ID ambiguo, use el ID completo del pedido", statusCode: 400 };
  }
  const order = orderResult.rows[0];

  // Fetch shipment if exists
  const shipmentResult = await query(
    "SELECT * FROM shipments WHERE order_id = $1 LIMIT 1",
    [order.id]
  );
  const shipment = shipmentResult.rows[0] || null;

  switch (role) {
    case "USER": {
      if (order.user_id !== userId) {
        return {
          valid: false,
          error: "No puedes cancelar este pedido",
          statusCode: 403,
        };
      }
      if (order.status !== "pending") {
        return {
          valid: false,
          error: `El pedido se encuentra en estado ${order.status} y no puede ser cancelado`,
          statusCode: 400,
        };
      }
      const windowMinutes = await getCancellationWindow();
      const createdAt = new Date(order.created_at);
      const now = new Date();
      const minutesDiff =
        (now.getTime() - createdAt.getTime()) / (1000 * 60);
      if (minutesDiff > windowMinutes) {
        return {
          valid: false,
          error: "El período de cancelación ha expirado",
          statusCode: 400,
        };
      }
      break;
    }

    case "DELIVERY": {
      if (!shipment || shipment.delivery_man_id !== userId) {
        return {
          valid: false,
          error: "Este pedido no está asignado a tu cuenta",
          statusCode: 403,
        };
      }
      if (
        shipment.status !== "ASIGNADO" &&
        shipment.status !== "EN_RUTA"
      ) {
        return {
          valid: false,
          error: `El pedido se encuentra en estado ${order.status} y no puede ser cancelado`,
          statusCode: 400,
        };
      }
      break;
    }

    case "SELLER": {
      if (order.seller_id !== userId) {
        return {
          valid: false,
          error: "No tiene permiso para cancelar este pedido",
          statusCode: 403,
        };
      }
      if (order.status === "delivered" || order.status === "cancelled") {
        return {
          valid: false,
          error: `El pedido se encuentra en estado ${order.status} y no puede ser cancelado`,
          statusCode: 400,
        };
      }
      break;
    }

    case "ADMIN": {
      if (order.status === "delivered" || order.status === "cancelled") {
        return {
          valid: false,
          error: `El pedido se encuentra en estado ${order.status} y no puede ser cancelado`,
          statusCode: 400,
        };
      }
      break;
    }
  }

  return { valid: true, order, shipment };
}

// ==========================================
// Inventory restoration
// ==========================================

export async function restoreInventory(
  client: pg.PoolClient,
  order: any
): Promise<boolean> {
  const items =
    typeof order.items === "string"
      ? JSON.parse(order.items)
      : order.items;

  if (!Array.isArray(items) || items.length === 0) {
    return false;
  }

  const orderShortId = order.id.substring(0, 8);
  let restored = false;

  for (const item of items) {
    const productId = item.product?.id || item.product_id;
    const quantity = item.quantity || 0;

    if (!productId || quantity <= 0) continue;

    // Check if product still exists
    const productResult = await client.query(
      "SELECT id FROM skating_products WHERE id = $1",
      [productId]
    );

    if (productResult.rows.length === 0) {
      console.warn(
        `Product ${productId} not found during cancellation inventory restore for order ${order.id}. Skipping.`
      );
      continue;
    }

    // Restore stock
    await client.query(
      "UPDATE skating_products SET stock = stock + $2, updated_at = NOW() WHERE id = $1",
      [productId, quantity]
    );

    // Create inventory movement
    await client.query(
      `INSERT INTO inventory_movements (product_id, user_id, quantity_change, movement_type, reason)
       VALUES ($1, $2, $3, 'in', $4)`,
      [
        productId,
        order.user_id,
        quantity,
        `Cancelación - Pedido #${orderShortId}`,
      ]
    );

    restored = true;
  }

  return restored;
}

// ==========================================
// Notifications
// ==========================================

const ROLE_LABELS: Record<string, string> = {
  USER: "usuario",
  DELIVERY: "repartidor",
  SELLER: "vendedor",
  ADMIN: "administrador",
};

export async function sendCancellationNotifications(
  order: any,
  cancellation: any
): Promise<number> {
  let sent = 0;
  const orderShortId = order.id.substring(0, 8);
  const roleLabel = ROLE_LABELS[cancellation.cancelled_by_role] || cancellation.cancelled_by_role;
  const reason = cancellation.reason_description || cancellation.reason_code;

  const title = `Pedido #${orderShortId} cancelado`;
  const message = `El pedido #${orderShortId} fue cancelado por ${roleLabel}. Motivo: ${reason}`;

  try {
    // 1. Notify the order owner (always)
    if (order.user_id) {
      await query(
        `INSERT INTO skating_notifications (user_id, order_id, title, message, type)
         VALUES ($1, $2, $3, $4, 'warning')`,
        [order.user_id, order.id, title, message]
      );
      sent++;
    }

    // 2. Notify the delivery person (if shipment assigned and they didn't cancel)
    if (cancellation.cancelled_by_role !== "DELIVERY") {
      const shipmentResult = await query(
        "SELECT delivery_man_id FROM shipments WHERE order_id = $1 LIMIT 1",
        [order.id]
      );
      if (
        shipmentResult.rows.length > 0 &&
        shipmentResult.rows[0].delivery_man_id
      ) {
        await query(
          `INSERT INTO skating_notifications (user_id, order_id, title, message, type)
           VALUES ($1, $2, $3, $4, 'warning')`,
          [shipmentResult.rows[0].delivery_man_id, order.id, title, message]
        );
        sent++;
      }
    }

    // 3. Notify the seller (if order has seller_id and they didn't cancel)
    if (cancellation.cancelled_by_role !== "SELLER" && order.seller_id) {
      await query(
        `INSERT INTO skating_notifications (user_id, order_id, title, message, type)
         VALUES ($1, $2, $3, $4, 'warning')`,
        [order.seller_id, order.id, title, message]
      );
      sent++;
    }
  } catch (err) {
    console.error("Error sending cancellation notifications:", err);
  }

  return sent;
}

// ==========================================
// Main cancellation function
// ==========================================

export async function cancelOrder(
  params: CancelOrderParams
): Promise<CancelOrderResult> {
  const { orderId, cancelledBy, cancelledByRole, reasonCode, reasonDescription } = params;

  // Validate reason code
  const reasonValidation = validateReasonCode(reasonCode, reasonDescription);
  if (!reasonValidation.valid) {
    throw Object.assign(new Error(reasonValidation.error!), { statusCode: 400 });
  }

  // Validate cancellation permissions and conditions
  const validation = await validateCancellation(orderId, cancelledBy, cancelledByRole);
  if (!validation.valid) {
    throw Object.assign(new Error(validation.error!), {
      statusCode: validation.statusCode || 400,
    });
  }

  // Use the resolved order ID (handles partial ID lookups)
  const resolvedOrderId = validation.order?.id || orderId;

  let updatedOrder: any;
  let cancellation: any;
  let inventoryRestored = false;

  await withTransaction(async (client) => {
    // 1. Lock the order row with SELECT ... FOR UPDATE
    const lockResult = await client.query(
      "SELECT * FROM skating_orders WHERE id = $1 FOR UPDATE",
      [resolvedOrderId]
    );
    if (lockResult.rows.length === 0) {
      throw Object.assign(new Error("Pedido no encontrado"), { statusCode: 404 });
    }
    const order = lockResult.rows[0];

    // Re-check status under lock (could have changed between validation and lock)
    if (order.status === "cancelled") {
      throw Object.assign(
        new Error("El pedido ya está cancelado"),
        { statusCode: 400 }
      );
    }

    // 2. Update order status to 'cancelled'
    const updateResult = await client.query(
      "UPDATE skating_orders SET status = 'cancelled' WHERE id = $1 RETURNING *",
      [resolvedOrderId]
    );
    updatedOrder = updateResult.rows[0];

    // 3. If shipment exists, update to 'CANCELADO'
    await client.query(
      "UPDATE shipments SET status = 'CANCELADO', updated_at = NOW() WHERE order_id = $1",
      [resolvedOrderId]
    );

    // 4. Restore inventory
    inventoryRestored = await restoreInventory(client, order);

    // 5. Insert cancellation record
    const cancellationResult = await client.query(
      `INSERT INTO order_cancellations (order_id, cancelled_by, cancelled_by_role, reason_code, reason_description)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [resolvedOrderId, cancelledBy, cancelledByRole, reasonCode, reasonDescription || null]
    );
    cancellation = cancellationResult.rows[0];
  });

  // 6. Send notifications OUTSIDE the transaction
  const notificationsSent = await sendCancellationNotifications(
    updatedOrder,
    cancellation
  );

  return {
    success: true,
    order: updatedOrder,
    cancellation,
    inventoryRestored,
    notificationsSent,
  };
}
