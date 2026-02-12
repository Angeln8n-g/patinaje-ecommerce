import { Router } from "express";
import { query } from "../db/pool.js";
import { requireAuth, requireRole } from "../lib/auth.js";

const router = Router();

// ==========================================
// Shipments
// ==========================================
router.get("/shipments", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    let result;
    if (user.role === "ADMIN") {
      result = await query("SELECT * FROM shipments ORDER BY created_at DESC");
    } else if (user.role === "DELIVERY") {
      result = await query("SELECT * FROM shipments WHERE delivery_man_id = $1 ORDER BY created_at DESC", [user.userId]);
    } else {
      result = await query(
        `SELECT s.* FROM shipments s
         JOIN skating_orders o ON o.id = s.order_id
         WHERE o.user_id = $1 ORDER BY s.created_at DESC`,
        [user.userId]
      );
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener envíos" });
  }
});

router.post("/shipments", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { order_id, delivery_man_id } = req.body;
    const result = await query(
      "INSERT INTO shipments (order_id, delivery_man_id) VALUES ($1, $2) RETURNING *",
      [order_id, delivery_man_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error al crear envío" });
  }
});

router.put("/shipments/:id", requireAuth, requireRole("ADMIN", "DELIVERY"), async (req, res) => {
  try {
    const { status, current_lat, current_lng } = req.body;
    const result = await query(
      `UPDATE shipments SET status=COALESCE($2,status), current_lat=COALESCE($3,current_lat),
       current_lng=COALESCE($4,current_lng), updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [req.params.id, status, current_lat, current_lng]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error al actualizar envío" });
  }
});

// ==========================================
// Delivery Zones
// ==========================================
router.get("/zones", async (_req, res) => {
  try {
    const result = await query("SELECT * FROM delivery_zones ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener zonas" });
  }
});

router.post("/zones", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { name, polygon, is_active } = req.body;
    const result = await query(
      "INSERT INTO delivery_zones (name, polygon, is_active) VALUES ($1, $2, $3) RETURNING *",
      [name, JSON.stringify(polygon), is_active ?? true]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error al crear zona" });
  }
});

router.put("/zones/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { name, polygon, is_active } = req.body;
    const result = await query(
      `UPDATE delivery_zones SET name=COALESCE($2,name), polygon=COALESCE($3,polygon),
       is_active=COALESCE($4,is_active), updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [req.params.id, name, polygon ? JSON.stringify(polygon) : null, is_active]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error al actualizar zona" });
  }
});

router.delete("/zones/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    await query("DELETE FROM delivery_zones WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Error al eliminar zona" });
  }
});

// ==========================================
// Delivery Locations
// ==========================================
router.put("/location", requireAuth, requireRole("DELIVERY"), async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { lat, lng } = req.body;
    const result = await query(
      `INSERT INTO delivery_locations (delivery_man_id, lat, lng)
       VALUES ($1, $2, $3)
       ON CONFLICT (delivery_man_id) DO UPDATE SET lat=$2, lng=$3, updated_at=NOW()
       RETURNING *`,
      [userId, lat, lng]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error al actualizar ubicación" });
  }
});

router.get("/locations", requireAuth, requireRole("ADMIN", "DELIVERY"), async (_req, res) => {
  try {
    const result = await query(
      `SELECT dl.*, p.first_name, p.last_name, p.email
       FROM delivery_locations dl
       JOIN profiles p ON p.id = dl.delivery_man_id`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener ubicaciones" });
  }
});

// ==========================================
// Delivery Ratings
// ==========================================
router.post("/ratings", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { order_id, delivery_man_id, rating, comment } = req.body;
    const result = await query(
      "INSERT INTO delivery_ratings (order_id, delivery_man_id, user_id, rating, comment) VALUES ($1,$2,$3,$4,$5) RETURNING *",
      [order_id, delivery_man_id, userId, rating, comment]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error al crear calificación" });
  }
});

export default router;
