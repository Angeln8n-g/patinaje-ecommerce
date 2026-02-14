import { Router } from "express";
import { query } from "../db/pool.js";
import { requireAuth } from "../lib/auth.js";

const router = Router();

// GET /api/notifications — user's notifications
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const limit = parseInt(req.query.limit as string) || 50;
    const result = await query(
      "SELECT * FROM skating_notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2",
      [userId, limit]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener notificaciones" });
  }
});

// PUT /api/notifications/read-all
router.put("/read-all", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    await query("UPDATE skating_notifications SET is_read = TRUE WHERE user_id = $1", [userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Error al marcar notificaciones" });
  }
});

// PUT /api/notifications/:id/read
router.put("/:id/read", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    await query("UPDATE skating_notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2", [req.params.id, userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Error al marcar notificación" });
  }
});

// POST /api/notifications — create notification (system use)
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

// POST /api/notifications/notify-admins — notify all admins about a new order
router.post("/notify-admins", requireAuth, async (req, res) => {
  try {
    const { order_id, title, message, type } = req.body;
    const admins = await query("SELECT id, email FROM profiles WHERE role = 'ADMIN'");
    
    if (admins.rows.length === 0) {
      return res.json({ notified: 0 });
    }

    const values: any[] = [];
    const placeholders: string[] = [];
    let idx = 1;
    for (const admin of admins.rows) {
      placeholders.push(`($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4})`);
      values.push(admin.id, order_id || null, title, message, type || "info");
      idx += 5;
    }

    await query(
      `INSERT INTO skating_notifications (user_id, order_id, title, message, type) VALUES ${placeholders.join(", ")}`,
      values
    );

    const emails = admins.rows.map((a: any) => a.email).filter(Boolean);
    res.json({ notified: admins.rows.length, emails });
  } catch (err) {
    console.error("Error notifying admins:", err);
    res.status(500).json({ error: "Error al notificar administradores" });
  }
});

export default router;
