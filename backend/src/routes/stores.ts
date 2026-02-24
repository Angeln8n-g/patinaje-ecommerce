import { Router } from "express";
import { query } from "../db/pool.js";
import { requireAuth, requireRole } from "../lib/auth.js";

const router = Router();

// GET /api/stores — all stores (public)
router.get("/", async (_req, res) => {
  try {
    const result = await query("SELECT * FROM stores ORDER BY name ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener tiendas" });
  }
});

// GET /api/stores/my/store — seller: get my assigned store
router.get("/my/store", requireAuth, requireRole("SELLER"), async (req, res) => {
  try {
    const sellerId = (req as any).user.userId;
    const result = await query(
      `SELECT s.* FROM stores s
       JOIN store_sellers ss ON ss.store_id = s.id
       WHERE ss.seller_id = $1 AND s.is_active = true
       LIMIT 1`, [sellerId]
    );
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener tienda" });
  }
});

// GET /api/stores/:id — single store with sellers and zones
router.get("/:id", async (req, res) => {
  try {
    const store = await query("SELECT * FROM stores WHERE id = $1", [req.params.id]);
    if (store.rows.length === 0) { res.status(404).json({ error: "Tienda no encontrada" }); return; }

    const sellers = await query(
      `SELECT p.id, p.email, p.first_name, p.last_name
       FROM store_sellers ss JOIN profiles p ON p.id = ss.seller_id
       WHERE ss.store_id = $1 ORDER BY p.first_name`, [req.params.id]
    );
    const zones = await query(
      `SELECT dz.* FROM store_delivery_zones sdz
       JOIN delivery_zones dz ON dz.id = sdz.zone_id
       WHERE sdz.store_id = $1`, [req.params.id]
    );

    res.json({ ...store.rows[0], sellers: sellers.rows, zones: zones.rows });
  } catch (err) {
    res.status(500).json({ error: "Error al obtener tienda" });
  }
});

// POST /api/stores — create store (admin)
router.post("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { name, address, lat, lng, color } = req.body;
    if (!name?.trim()) { res.status(400).json({ error: "El nombre es requerido" }); return; }
    const result = await query(
      `INSERT INTO stores (name, address, lat, lng, color) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name.trim(), address || null, lat || null, lng || null, color || '#3b82f6']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error al crear tienda" });
  }
});

// PUT /api/stores/:id — update store (admin)
router.put("/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { name, address, lat, lng, color, is_active } = req.body;
    const result = await query(
      `UPDATE stores SET name=COALESCE($2,name), address=COALESCE($3,address),
       lat=COALESCE($4,lat), lng=COALESCE($5,lng), color=COALESCE($6,color),
       is_active=COALESCE($7,is_active), updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [req.params.id, name, address, lat, lng, color, is_active]
    );
    if (result.rows.length === 0) { res.status(404).json({ error: "Tienda no encontrada" }); return; }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error al actualizar tienda" });
  }
});

// DELETE /api/stores/:id — delete store (admin)
router.delete("/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    await query("DELETE FROM stores WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Error al eliminar tienda" });
  }
});

// POST /api/stores/:id/sellers — assign seller to store (admin)
router.post("/:id/sellers", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { seller_id } = req.body;
    if (!seller_id) { res.status(400).json({ error: "seller_id es requerido" }); return; }
    await query(
      "INSERT INTO store_sellers (store_id, seller_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [req.params.id, seller_id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Error al asignar vendedor" });
  }
});

// DELETE /api/stores/:id/sellers/:sellerId — remove seller from store (admin)
router.delete("/:id/sellers/:sellerId", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    await query(
      "DELETE FROM store_sellers WHERE store_id = $1 AND seller_id = $2",
      [req.params.id, req.params.sellerId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Error al remover vendedor" });
  }
});

// POST /api/stores/:id/zones — assign zone to store (admin)
router.post("/:id/zones", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { zone_id } = req.body;
    if (!zone_id) { res.status(400).json({ error: "zone_id es requerido" }); return; }
    await query(
      "INSERT INTO store_delivery_zones (store_id, zone_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [req.params.id, zone_id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Error al asignar zona" });
  }
});

// DELETE /api/stores/:id/zones/:zoneId — remove zone from store (admin)
router.delete("/:id/zones/:zoneId", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    await query(
      "DELETE FROM store_delivery_zones WHERE store_id = $1 AND zone_id = $2",
      [req.params.id, req.params.zoneId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Error al remover zona" });
  }
});

// PUT /api/stores/:id/shipping-config — save shipping config for store (admin)
router.put("/:id/shipping-config", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { shipping_config } = req.body;
    const result = await query(
      "UPDATE stores SET shipping_config = $2, updated_at = NOW() WHERE id = $1 RETURNING *",
      [req.params.id, JSON.stringify(shipping_config)]
    );
    if (result.rows.length === 0) { res.status(404).json({ error: "Tienda no encontrada" }); return; }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error al guardar configuración de envío" });
  }
});

// PUT /api/stores/:id/location — save location for store (admin)
router.put("/:id/location", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { lat, lng, address } = req.body;
    const result = await query(
      "UPDATE stores SET lat = $2, lng = $3, address = COALESCE($4, address), updated_at = NOW() WHERE id = $1 RETURNING *",
      [req.params.id, lat, lng, address]
    );
    if (result.rows.length === 0) { res.status(404).json({ error: "Tienda no encontrada" }); return; }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error al guardar ubicación" });
  }
});

export default router;
