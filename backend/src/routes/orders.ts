import { Router } from "express";
import { query } from "../db/pool.js";
import { requireAuth, requireRole } from "../lib/auth.js";

const router = Router();

// POST /api/orders — create order (authenticated)
router.post("/", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { customer_name, customer_address, customer_city, customer_postal_code, customer_phone, customer_email, items, total, payment_method, shipping_lat, shipping_lng } = req.body;

    const result = await query(
      `INSERT INTO skating_orders (user_id, customer_name, customer_address, customer_city, customer_postal_code, customer_phone, customer_email, items, total, payment_method, shipping_lat, shipping_lng)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [userId, customer_name, customer_address, customer_city, customer_postal_code, customer_phone, customer_email, JSON.stringify(items), total, payment_method || 'card', shipping_lat, shipping_lng]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create order error:", err);
    res.status(500).json({ error: "Error al crear pedido" });
  }
});

// GET /api/orders/my — user's own orders
router.get("/my", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const result = await query(
      "SELECT * FROM skating_orders WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener pedidos" });
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

// GET /api/orders/seller — seller's assigned orders
router.get("/seller", requireAuth, requireRole("SELLER"), async (req, res) => {
  try {
    const sellerId = (req as any).user.userId;
    const result = await query(
      "SELECT * FROM skating_orders WHERE seller_id = $1 ORDER BY created_at DESC",
      [sellerId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener pedidos" });
  }
});

// PUT /api/orders/:id — update order (admin/seller)
router.put("/:id", requireAuth, requireRole("ADMIN", "SELLER"), async (req, res) => {
  try {
    const fields = req.body;
    const sets: string[] = [];
    const params: any[] = [];
    let idx = 1;

    const allowed = ["status", "payment_status", "seller_id", "dispatched_at", "qr_token"];
    for (const key of allowed) {
      if (fields[key] !== undefined) {
        sets.push(`${key} = $${idx++}`);
        params.push(fields[key]);
      }
    }

    if (sets.length === 0) {
      res.status(400).json({ error: "No hay campos para actualizar" });
      return;
    }

    params.push(req.params.id);
    const result = await query(
      `UPDATE skating_orders SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Pedido no encontrado" });
      return;
    }
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
