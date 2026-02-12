import { Router } from "express";
import { query, withTransaction } from "../db/pool.js";
import { requireAuth, requireRole } from "../lib/auth.js";

const router = Router();

// POST /api/orders — create order (authenticated)
router.post("/", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { customer_name, customer_address, customer_city, customer_postal_code, customer_phone, customer_email, items, total, payment_method, shipping_lat, shipping_lng } = req.body;
    const result = await query(
      `INSERT INTO skating_orders (user_id, customer_name, customer_address, customer_city, customer_postal_code, customer_phone, customer_email, items, total, payment_method, shipping_lat, shipping_lng)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [userId, customer_name, customer_address, customer_city, customer_postal_code, customer_phone, customer_email, JSON.stringify(items), total, payment_method || 'card', shipping_lat, shipping_lng]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create order error:", err);
    res.status(500).json({ error: "Error al crear pedido" });
  }
});

// POST /api/orders/pos — create POS in-store order (seller)
router.post("/pos", requireAuth, requireRole("SELLER"), async (req, res) => {
  try {
    const sellerId = (req as any).user.userId;
    const { items, payment, customer_name, customer_phone } = req.body;

    if (!items || items.length === 0) { res.status(400).json({ error: "El pedido debe contener al menos un producto" }); return; }
    if (!customer_name) { res.status(400).json({ error: "El nombre del cliente es requerido" }); return; }

    // Verify open session
    const sessionResult = await query(
      "SELECT id FROM pos_sessions WHERE seller_id = $1 AND status = 'open' LIMIT 1", [sellerId]
    );
    if (sessionResult.rows.length === 0) { res.status(400).json({ error: "Debe abrir una sesión de caja antes de crear pedidos" }); return; }
    const activeSessionId = sessionResult.rows[0].id;

    const order = await withTransaction(async (client) => {
      // Validate stock
      const productIds = items.map((i: any) => i.product_id);
      const productsResult = await client.query(
        "SELECT id, stock, status, name, price FROM skating_products WHERE id = ANY($1)", [productIds]
      );
      const productMap = new Map(productsResult.rows.map((p: any) => [p.id, p]));

      for (const item of items) {
        const product = productMap.get(item.product_id);
        if (!product) throw new Error("Producto no encontrado: " + item.product_name);
        if (product.status !== "active") throw new Error("Producto no disponible: " + product.name);
        if (product.stock < item.quantity) throw new Error("Stock insuficiente para " + product.name);
      }

      const total = items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);
      const orderItems = items.map((item: any) => ({
        product: { id: item.product_id, name: item.product_name, price: item.price },
        quantity: item.quantity,
        selectedVariant: item.selectedVariant || undefined,
      }));

      // Create order
      const orderResult = await client.query(
        `INSERT INTO skating_orders (customer_name, customer_phone, customer_address, customer_city, customer_postal_code, items, total, status, payment_method, payment_status, seller_id, order_type, dispatched_at)
         VALUES ($1, $2, 'Retiro en tienda', '', '', $3, $4, 'delivered', $5, 'paid', $6, 'in_store', NOW()) RETURNING *`,
        [customer_name.trim(), customer_phone || null, JSON.stringify(orderItems), total, payment.method, sellerId]
      );
      const newOrder = orderResult.rows[0];

      // Deduct stock and create inventory movements
      for (const item of items) {
        await client.query("UPDATE skating_products SET stock = stock - $2, updated_at = NOW() WHERE id = $1", [item.product_id, item.quantity]);
        await client.query(
          "INSERT INTO inventory_movements (product_id, user_id, quantity_change, movement_type, reason) VALUES ($1, $2, $3, 'out', $4)",
          [item.product_id, sellerId, -item.quantity, "Venta POS - Pedido #" + newOrder.id.substring(0, 8)]
        );
      }

      // Update session totals
      const isCard = payment.method === "card";
      await client.query(
        `UPDATE pos_sessions SET total_sales = total_sales + $2, total_card_sales = total_card_sales + $3,
         total_cash_sales = total_cash_sales + $4, transaction_count = transaction_count + 1 WHERE id = $1`,
        [activeSessionId, total, isCard ? total : 0, isCard ? 0 : total]
      );

      return newOrder;
    });

    res.status(201).json(order);
  } catch (err: any) {
    console.error("Create POS order error:", err);
    res.status(400).json({ error: err.message || "Error al crear pedido POS" });
  }
});

// POST /api/orders/:id/exchange — product exchange (seller)
router.post("/:id/exchange", requireAuth, requireRole("SELLER"), async (req, res) => {
  try {
    const sellerId = (req as any).user.userId;
    const orderId = req.params.id;
    const { original_product_id, original_quantity, new_product_id, new_quantity, justification } = req.body;

    if (!justification || justification.trim().length < 5) {
      res.status(400).json({ error: "Debe proporcionar una justificación de al menos 5 caracteres" }); return;
    }

    await withTransaction(async (client) => {
      // Verify order belongs to seller
      const orderResult = await client.query("SELECT id, seller_id, items, total FROM skating_orders WHERE id = $1", [orderId]);
      if (orderResult.rows.length === 0) throw new Error("Pedido no encontrado");
      if (orderResult.rows[0].seller_id !== sellerId) throw new Error("No tiene permiso para modificar este pedido");

      // Verify new product stock
      const npResult = await client.query("SELECT id, name, stock, price FROM skating_products WHERE id = $1", [new_product_id]);
      if (npResult.rows.length === 0) throw new Error("Producto nuevo no encontrado");
      const newProduct = npResult.rows[0];
      if (newProduct.stock < new_quantity) throw new Error("Stock insuficiente para " + newProduct.name);

      // Return original to stock
      await client.query("UPDATE skating_products SET stock = stock + $2 WHERE id = $1", [original_product_id, original_quantity]);
      await client.query(
        "INSERT INTO inventory_movements (product_id, user_id, quantity_change, movement_type, reason) VALUES ($1,$2,$3,'in',$4)",
        [original_product_id, sellerId, original_quantity, "Cambio - Pedido #" + orderId.substring(0, 8) + " - " + justification]
      );

      // Deduct new product
      await client.query("UPDATE skating_products SET stock = stock - $2 WHERE id = $1", [new_product_id, new_quantity]);
      await client.query(
        "INSERT INTO inventory_movements (product_id, user_id, quantity_change, movement_type, reason) VALUES ($1,$2,$3,'out',$4)",
        [new_product_id, sellerId, -new_quantity, "Cambio - Pedido #" + orderId.substring(0, 8) + " - " + justification]
      );

      // Update order items
      const order = orderResult.rows[0];
      const items = typeof order.items === "string" ? JSON.parse(order.items) : order.items;
      const updatedItems = items.map((item: any) => {
        if (item.product?.id === original_product_id || item.product_id === original_product_id) {
          return { ...item, product: { id: new_product_id, name: newProduct.name, price: newProduct.price }, product_id: new_product_id, quantity: new_quantity };
        }
        return item;
      });
      const newTotal = updatedItems.reduce((sum: number, item: any) => sum + ((item.product?.price || item.price || 0) * (item.quantity || 0)), 0);
      await client.query("UPDATE skating_orders SET items = $2, total = $3 WHERE id = $1", [orderId, JSON.stringify(updatedItems), newTotal]);
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Error al procesar cambio" });
  }
});

// GET /api/orders/my — user's own orders
router.get("/my", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const result = await query("SELECT * FROM skating_orders WHERE user_id = $1 ORDER BY created_at DESC", [userId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener pedidos" });
  }
});

// GET /api/orders/seller — seller's assigned orders with optional filters
router.get("/seller", requireAuth, requireRole("SELLER"), async (req, res) => {
  try {
    const sellerId = (req as any).user.userId;
    let sql = "SELECT * FROM skating_orders WHERE seller_id = $1";
    const params: any[] = [sellerId];
    let idx = 2;

    if (req.query.date_from) { sql += " AND created_at >= $" + (idx++); params.push(req.query.date_from); }
    if (req.query.date_to) {
      const toDate = new Date(req.query.date_to as string);
      toDate.setHours(23, 59, 59, 999);
      sql += " AND created_at <= $" + (idx++); params.push(toDate.toISOString());
    }
    if (req.query.status) { sql += " AND status = $" + (idx++); params.push(req.query.status); }

    sql += " ORDER BY created_at ASC";
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener pedidos" });
  }
});

// GET /api/orders/with-shipments — admin: all orders with shipment info
router.get("/with-shipments", requireAuth, requireRole("ADMIN"), async (_req, res) => {
  try {
    const result = await query(
      `SELECT o.*, row_to_json(s) as shipment FROM skating_orders o
       LEFT JOIN shipments s ON s.order_id = o.id
       ORDER BY o.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener pedidos con envíos" });
  }
});

// GET /api/orders — admin: all orders
router.get("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const result = await query("SELECT * FROM skating_orders ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener pedidos" });
  }
});

// GET /api/orders/:id — single order
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const result = await query("SELECT * FROM skating_orders WHERE id = $1", [req.params.id]);
    if (result.rows.length === 0) { res.status(404).json({ error: "Pedido no encontrado" }); return; }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener pedido" });
  }
});

// PUT /api/orders/:id — update order (admin/seller)
router.put("/:id", requireAuth, requireRole("ADMIN", "SELLER"), async (req, res) => {
  try {
    const fields = req.body;
    const sets: string[] = [];
    const params: any[] = [];
    let idx = 1;
    const allowed = ["status", "payment_status", "seller_id", "dispatched_at", "qr_token", "items", "total"];
    for (const key of allowed) {
      if (fields[key] !== undefined) {
        const val = key === "items" ? JSON.stringify(fields[key]) : fields[key];
        sets.push(key + " = $" + (idx++));
        params.push(val);
      }
    }
    if (sets.length === 0) { res.status(400).json({ error: "No hay campos para actualizar" }); return; }
    params.push(req.params.id);
    const result = await query(
      "UPDATE skating_orders SET " + sets.join(", ") + " WHERE id = $" + idx + " RETURNING *", params
    );
    if (result.rows.length === 0) { res.status(404).json({ error: "Pedido no encontrado" }); return; }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update order error:", err);
    res.status(500).json({ error: "Error al actualizar pedido" });
  }
});

// DELETE /api/orders/:id — admin only
router.delete("/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    await query("DELETE FROM skating_orders WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Error al eliminar pedido" });
  }
});

export default router;
