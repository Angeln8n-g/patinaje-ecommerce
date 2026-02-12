import { Router } from "express";
import { query } from "../db/pool.js";
import { requireAuth } from "../lib/auth.js";

const router = Router();

// GET /api/favorites
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const result = await query(
      `SELECT p.* FROM favorites f
       JOIN skating_products p ON p.id = f.product_id
       WHERE f.user_id = $1`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener favoritos" });
  }
});

// POST /api/favorites
router.post("/", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { product_id } = req.body;
    await query(
      "INSERT INTO favorites (user_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [userId, product_id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Error al agregar favorito" });
  }
});

// DELETE /api/favorites/:productId
router.delete("/:productId", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    await query("DELETE FROM favorites WHERE user_id = $1 AND product_id = $2", [userId, req.params.productId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Error al eliminar favorito" });
  }
});

export default router;
