import { Router } from "express";
import { query } from "../db/pool.js";
import { requireAuth } from "../lib/auth.js";

const router = Router();

// GET /api/notifications — user's notifications
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const result = await query(
      "SELECT * FROM skating_notifications WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener notificaciones" });
  }
});

// PUT /api/notifications/:id/read
router.put("/:id/read", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    await query(
      "UPDATE skating_notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2",
      [req.params.id, userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Error al marcar notificación" });
  }
});

// POST /api/notifications — internal: create notification (system use)
router.post("/", requireAuth, async (req, res) => {
  try {
    const { user_id, order_id, title, message, type } = req.body;
    const result = await query(
      "INSERT INTO skating_notifications (user_id, order_id, title, message, type) VALUES ($1,$2,$3,$4,$5) RETURNING *",
      [user_id, order_id, title, message, type || "info"]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error al crear notificación" });
  }
});

export default router;
