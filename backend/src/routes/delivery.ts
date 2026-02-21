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
      result = await query(
        `SELECT s.*, row_to_json(o) as order FROM shipments s
         LEFT JOIN skating_orders o ON o.id = s.order_id ORDER BY s.created_at DESC`
      );
    } else if (user.role === "DELIVERY") {
      result = await query(
        `SELECT s.*, row_to_json(o) as order FROM shipments s
         LEFT JOIN skating_orders o ON o.id = s.order_id
         WHERE s.delivery_man_id = $1 ORDER BY s.created_at DESC`, [user.userId]
      );
    } else {
      result = await query(
        `SELECT s.*, row_to_json(o) as order FROM shipments s
         JOIN skating_orders o ON o.id = s.order_id
         WHERE o.user_id = $1 ORDER BY s.created_at DESC`, [user.userId]
      );
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener envíos" });
  }
});

// GET /api/delivery/shipments/active — delivery: active shipments only
router.get("/shipments/active", requireAuth, requireRole("DELIVERY"), async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const result = await query(
      `SELECT s.*, row_to_json(o) as order FROM shipments s
       LEFT JOIN skating_orders o ON o.id = s.order_id
       WHERE s.delivery_man_id = $1 AND s.status NOT IN ('ENTREGADO', 'CANCELADO')
       ORDER BY s.created_at DESC`, [userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener envíos activos" });
  }
});

// GET /api/delivery/shipments/history — delivery: completed shipments
router.get("/shipments/history", requireAuth, requireRole("DELIVERY"), async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const result = await query(
      `SELECT s.*, row_to_json(o) as order FROM shipments s
       LEFT JOIN skating_orders o ON o.id = s.order_id
       WHERE s.delivery_man_id = $1 AND s.status IN ('ENTREGADO', 'CANCELADO')
       ORDER BY s.updated_at DESC`, [userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener historial" });
  }
});

// GET /api/delivery/shipments/by-order/:orderId — shipment for a specific order
router.get("/shipments/by-order/:orderId", requireAuth, async (req, res) => {
  try {
    const result = await query("SELECT * FROM shipments WHERE order_id = $1 LIMIT 1", [req.params.orderId]);
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener envío" });
  }
});

router.post("/shipments", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { order_id, delivery_man_id } = req.body;
    // Check if shipment exists for this order
    const existing = await query("SELECT id FROM shipments WHERE order_id = $1", [order_id]);
    if (existing.rows.length > 0) {
      // Update existing
      const result = await query(
        "UPDATE shipments SET delivery_man_id = $2, status = 'ASIGNADO', updated_at = NOW() WHERE order_id = $1 RETURNING *",
        [order_id, delivery_man_id]
      );
      // Sync order status
      await query("UPDATE skating_orders SET status = 'confirmed' WHERE id = $1", [order_id]);
      res.json(result.rows[0]);
    } else {
      const result = await query(
        "INSERT INTO shipments (order_id, delivery_man_id, status) VALUES ($1, $2, 'ASIGNADO') RETURNING *",
        [order_id, delivery_man_id]
      );
      await query("UPDATE skating_orders SET status = 'confirmed' WHERE id = $1", [order_id]);
      res.status(201).json(result.rows[0]);
    }
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
    // Sync order status
    if (status && result.rows.length > 0) {
      const orderStatusMap: Record<string, string> = { ASIGNADO: "confirmed", EN_RUTA: "shipped", CERCA: "shipped", ENTREGADO: "delivered" };
      const newOrderStatus = orderStatusMap[status];
      if (newOrderStatus) {
        await query("UPDATE skating_orders SET status = $2 WHERE id = $1", [result.rows[0].order_id, newOrderStatus]);
      }
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error al actualizar envío" });
  }
});

// ==========================================
// Delivery Men
// ==========================================
router.get("/men", requireAuth, requireRole("ADMIN"), async (_req, res) => {
  try {
    const result = await query(
      `SELECT p.id, p.email, p.first_name, p.last_name, p.created_at,
       COALESCE(AVG(dr.rating), 0) as avg_rating, COUNT(dr.id) as rating_count
       FROM profiles p
       LEFT JOIN delivery_ratings dr ON dr.delivery_man_id = p.id
       WHERE p.role = 'DELIVERY'
       GROUP BY p.id ORDER BY avg_rating DESC`
    );
    res.json(result.rows.map((r: any) => ({ ...r, avg_rating: parseFloat(r.avg_rating), rating_count: parseInt(r.rating_count) })));
  } catch (err) {
    res.status(500).json({ error: "Error al obtener repartidores" });
  }
});

// GET /api/delivery/men/stats — admin: delivery men with full stats
router.get("/men/stats", requireAuth, requireRole("ADMIN"), async (_req, res) => {
  try {
    const profiles = await query("SELECT id, email, first_name, last_name, phone, address_street, address_city, created_at FROM profiles WHERE role = 'DELIVERY'");
    const delivered = await query("SELECT delivery_man_id, COUNT(*) as cnt FROM shipments WHERE status = 'ENTREGADO' GROUP BY delivery_man_id");
    const active = await query("SELECT delivery_man_id, COUNT(*) as cnt FROM shipments WHERE status != 'ENTREGADO' GROUP BY delivery_man_id");
    const ratings = await query("SELECT delivery_man_id, AVG(rating) as avg, COUNT(*) as cnt FROM delivery_ratings GROUP BY delivery_man_id");
    const locations = await query("SELECT delivery_man_id, lat, lng, updated_at FROM delivery_locations");
    // Total sales per delivery man (sum of order totals for delivered shipments)
    const sales = await query(
      `SELECT s.delivery_man_id, COALESCE(SUM(o.total), 0) as total_sales
       FROM shipments s JOIN skating_orders o ON o.id = s.order_id
       WHERE s.status = 'ENTREGADO' GROUP BY s.delivery_man_id`
    );

    const deliveredMap = new Map(delivered.rows.map((r: any) => [r.delivery_man_id, parseInt(r.cnt)]));
    const activeMap = new Map(active.rows.map((r: any) => [r.delivery_man_id, parseInt(r.cnt)]));
    const ratingsMap = new Map(ratings.rows.map((r: any) => [r.delivery_man_id, { avg: parseFloat(r.avg), cnt: parseInt(r.cnt) }]));
    const locationsMap = new Map(locations.rows.map((r: any) => [r.delivery_man_id, { lat: parseFloat(r.lat), lng: parseFloat(r.lng), updated_at: r.updated_at }]));
    const salesMap = new Map(sales.rows.map((r: any) => [r.delivery_man_id, parseFloat(r.total_sales)]));

    const stats = profiles.rows.map((p: any) => ({
      ...p,
      activeShipments: activeMap.get(p.id) || 0,
      deliveredCount: deliveredMap.get(p.id) || 0,
      ratingCount: ratingsMap.get(p.id)?.cnt || 0,
      avgRating: ratingsMap.get(p.id)?.avg || 0,
      totalSales: salesMap.get(p.id) || 0,
      lastLocation: locationsMap.get(p.id) || null,
    }));

    res.json(stats.sort((a: any, b: any) => b.avgRating - a.avgRating));
  } catch (err) {
    res.status(500).json({ error: "Error al obtener estadísticas" });
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

router.get("/locations", requireAuth, requireRole("ADMIN"), async (_req, res) => {
  try {
    const result = await query(
      `SELECT dl.*, p.first_name, p.last_name, p.email
       FROM delivery_locations dl
       JOIN profiles p ON p.id = dl.delivery_man_id
       ORDER BY dl.updated_at DESC`
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
    const { order_id, rating, comment } = req.body;
    // Get delivery_man_id from shipment
    const shipment = await query("SELECT delivery_man_id FROM shipments WHERE order_id = $1 LIMIT 1", [order_id]);
    if (shipment.rows.length === 0 || !shipment.rows[0].delivery_man_id) {
      res.status(400).json({ error: "Información de entrega no encontrada" }); return;
    }
    const result = await query(
      "INSERT INTO delivery_ratings (order_id, delivery_man_id, user_id, rating, comment) VALUES ($1,$2,$3,$4,$5) RETURNING *",
      [order_id, shipment.rows[0].delivery_man_id, userId, rating, comment]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === "23505") { res.status(409).json({ error: "Ya calificaste este pedido" }); return; }
    res.status(500).json({ error: "Error al crear calificación" });
  }
});

router.get("/ratings/:orderId", requireAuth, async (req, res) => {
  try {
    const result = await query("SELECT * FROM delivery_ratings WHERE order_id = $1 LIMIT 1", [req.params.orderId]);
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener calificación" });
  }
});

// GET /api/delivery/ratings/stats/:deliveryManId — rating stats for a delivery man
router.get("/ratings/stats/:deliveryManId", async (req, res) => {
  try {
    const result = await query("SELECT * FROM delivery_ratings WHERE delivery_man_id = $1 ORDER BY created_at DESC", [req.params.deliveryManId]);
    const ratings = result.rows;
    if (ratings.length === 0) {
      res.json({ averageRating: 0, totalRatings: 0, ratingDistribution: {}, recentComments: [] }); return;
    }
    const sum = ratings.reduce((acc: number, r: any) => acc + r.rating, 0);
    const dist: Record<number, number> = {};
    ratings.forEach((r: any) => { dist[r.rating] = (dist[r.rating] || 0) + 1; });
    const comments = ratings.filter((r: any) => r.comment).slice(0, 5).map((r: any) => ({ id: r.id, rating: r.rating, comment: r.comment, created_at: r.created_at }));
    res.json({ averageRating: sum / ratings.length, totalRatings: ratings.length, ratingDistribution: dist, recentComments: comments });
  } catch (err) {
    res.status(500).json({ error: "Error al obtener estadísticas" });
  }
});

// ==========================================
// Invoices
// ==========================================
router.post("/invoices", requireAuth, async (req, res) => {
  try {
    const { order_id, customer_email, total } = req.body;

    // Check if a final invoice already exists for this order
    const existing = await query(
      "SELECT invoice_number FROM skating_invoices WHERE order_id = $1 AND invoice_number LIKE 'FAC-%' LIMIT 1",
      [order_id]
    );
    if (existing.rows.length > 0) {
      return res.status(200).json({ success: true, invoiceNumber: existing.rows[0].invoice_number, alreadyExists: true });
    }

    const date = new Date();
    const invoiceNumber = "FAC-" + date.getFullYear() + "-" + order_id.substring(0, 6).toUpperCase();
    const result = await query(
      "INSERT INTO skating_invoices (order_id, invoice_number, customer_email, total_amount, status) VALUES ($1,$2,$3,$4,'sent') RETURNING *",
      [order_id, invoiceNumber, customer_email, total]
    );
    res.status(201).json({ success: true, invoiceNumber });
  } catch (err) {
    res.status(500).json({ error: "Error al crear factura" });
  }
});

export default router;
