import { Router } from "express";
import { query, withTransaction } from "../db/pool.js";
import { requireAuth, requireRole } from "../lib/auth.js";

const router = Router();

// GET /api/inventory — admin: all movements
router.get("/", requireAuth, requireRole("ADMIN"), async (_req, res) => {
  try {
    const result = await query(
      `SELECT im.*, p.name as product_name
       FROM inventory_movements im
       LEFT JOIN skating_products p ON p.id = im.product_id
       ORDER BY im.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener movimientos" });
  }
});

// POST /api/inventory — add movement + update stock
router.post("/", requireAuth, requireRole("ADMIN", "SELLER"), async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { product_id, quantity_change, movement_type, reason } = req.body;

    const result = await withTransaction(async (client) => {
      // Update stock
      await client.query(
        "UPDATE skating_products SET stock = stock + $2, updated_at = NOW() WHERE id = $1",
        [product_id, quantity_change]
      );

      // Record movement
      const mov = await client.query(
        "INSERT INTO inventory_movements (product_id, user_id, quantity_change, movement_type, reason) VALUES ($1,$2,$3,$4,$5) RETURNING *",
        [product_id, userId, quantity_change, movement_type, reason]
      );

      return mov.rows[0];
    });

    res.status(201).json(result);
  } catch (err) {
    console.error("Inventory movement error:", err);
    res.status(500).json({ error: "Error al registrar movimiento" });
  }
});

export default router;
