import { Router } from "express";
import { query } from "../db/pool.js";
import { requireAuth, requireRole } from "../lib/auth.js";

const router = Router();

// GET /api/users — admin: all users
router.get("/", requireAuth, requireRole("ADMIN"), async (_req, res) => {
  try {
    const result = await query(
      "SELECT id, email, role, first_name, last_name, phone, created_at FROM profiles ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
});

// GET /api/users/sellers — admin: all sellers
router.get("/sellers", requireAuth, requireRole("ADMIN"), async (_req, res) => {
  try {
    const result = await query(
      "SELECT id, email, first_name, last_name, role, created_at FROM profiles WHERE role = 'SELLER' ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener vendedores" });
  }
});

// GET /api/users/non-sellers — admin: users not sellers/admins
router.get("/non-sellers", requireAuth, requireRole("ADMIN"), async (_req, res) => {
  try {
    const result = await query(
      "SELECT id, email, first_name, last_name, role, created_at FROM profiles WHERE role IN ('USER', 'DELIVERY') ORDER BY email ASC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
});

// PUT /api/users/:id/role — admin: change user role
router.put("/:id/role", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { role } = req.body;
    if (!["USER", "ADMIN", "DELIVERY", "SELLER"].includes(role)) {
      res.status(400).json({ error: "Rol inválido" }); return;
    }
    const result = await query(
      "UPDATE profiles SET role = $2, updated_at = NOW() WHERE id = $1 RETURNING id, email, role",
      [req.params.id, role]
    );
    if (result.rows.length === 0) { res.status(404).json({ error: "Usuario no encontrado" }); return; }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error al actualizar rol" });
  }
});

// GET /api/users/admin/dashboard — admin dashboard stats
router.get("/admin/dashboard", requireAuth, requireRole("ADMIN"), async (_req, res) => {
  try {
    const [products, orders, users] = await Promise.all([
      query("SELECT COUNT(*) as count FROM skating_products WHERE status = 'active'"),
      query("SELECT total, status, created_at, customer_name FROM skating_orders ORDER BY created_at DESC"),
      query("SELECT COUNT(*) as count FROM profiles"),
    ]);
    const allOrders = orders.rows;
    const totalSales = allOrders.reduce((sum: number, o: any) => sum + parseFloat(o.total || 0), 0);
    const activeOrdersCount = allOrders.filter((o: any) => o.status !== "delivered").length;
    const recentSales = allOrders.slice(0, 5).map((o: any) => ({ name: o.customer_name, amount: parseFloat(o.total), date: o.created_at }));
    res.json({ totalSales, activeOrdersCount, productsCount: parseInt(products.rows[0].count), usersCount: parseInt(users.rows[0].count), recentSales });
  } catch (err) {
    res.status(500).json({ error: "Error al obtener estadísticas" });
  }
});

// GET /api/users/admin/seller-stats
router.get("/admin/seller-stats", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    let sql = "SELECT seller_id, SUM(total) as total_amount, COUNT(*) as total_sales FROM skating_orders WHERE seller_id IS NOT NULL";
    const params: any[] = [];
    let idx = 1;
    if (req.query.from) { sql += " AND created_at >= $" + (idx++); params.push(req.query.from); }
    if (req.query.to) { sql += " AND created_at <= $" + (idx++); params.push(req.query.to); }
    sql += " GROUP BY seller_id";
    const ordersResult = await query(sql, params);
    if (ordersResult.rows.length === 0) { res.json([]); return; }
    const sellerIds = ordersResult.rows.map((r: any) => r.seller_id);
    const profiles = await query("SELECT id, first_name, last_name, email FROM profiles WHERE id = ANY($1)", [sellerIds]);
    const profileMap = new Map(profiles.rows.map((p: any) => [p.id, [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email]));
    const stats = ordersResult.rows.map((r: any) => ({ seller_id: r.seller_id, seller_name: profileMap.get(r.seller_id) || "Vendedor desconocido", total_sales: parseInt(r.total_sales), total_amount: parseFloat(r.total_amount) }));
    res.json(stats.sort((a: any, b: any) => b.total_amount - a.total_amount));
  } catch (err) {
    res.status(500).json({ error: "Error al obtener estadísticas de vendedores" });
  }
});

// GET /api/users/admin/delivery-stats
router.get("/admin/delivery-stats", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    let sql = "SELECT delivery_man_id, COUNT(*) as completed FROM shipments WHERE status = 'ENTREGADO' AND delivery_man_id IS NOT NULL";
    const params: any[] = [];
    let idx = 1;
    if (req.query.from) { sql += " AND created_at >= $" + (idx++); params.push(req.query.from); }
    if (req.query.to) { sql += " AND created_at <= $" + (idx++); params.push(req.query.to); }
    sql += " GROUP BY delivery_man_id";
    const shipmentsResult = await query(sql, params);
    if (shipmentsResult.rows.length === 0) { res.json([]); return; }
    const dpIds = shipmentsResult.rows.map((r: any) => r.delivery_man_id);
    const profiles = await query("SELECT id, first_name, last_name, email FROM profiles WHERE id = ANY($1)", [dpIds]);
    const profileMap = new Map(profiles.rows.map((p: any) => [p.id, [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email]));
    const ratings = await query("SELECT delivery_man_id, AVG(rating) as avg FROM delivery_ratings WHERE delivery_man_id = ANY($1) GROUP BY delivery_man_id", [dpIds]);
    const ratingsMap = new Map(ratings.rows.map((r: any) => [r.delivery_man_id, parseFloat(r.avg)]));
    const stats = shipmentsResult.rows.map((r: any) => ({ delivery_person_id: r.delivery_man_id, delivery_person_name: profileMap.get(r.delivery_man_id) || "Repartidor desconocido", completed_deliveries: parseInt(r.completed), average_rating: ratingsMap.get(r.delivery_man_id) || null }));
    res.json(stats.sort((a: any, b: any) => b.completed_deliveries - a.completed_deliveries));
  } catch (err) {
    res.status(500).json({ error: "Error al obtener estadísticas" });
  }
});

// GET /api/users/admin/sales-comparison
router.get("/admin/sales-comparison", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    let sql = "SELECT order_type, total FROM skating_orders WHERE 1=1";
    const params: any[] = [];
    let idx = 1;
    if (req.query.from) { sql += " AND created_at >= $" + (idx++); params.push(req.query.from); }
    if (req.query.to) { sql += " AND created_at <= $" + (idx++); params.push(req.query.to); }
    const result = await query(sql, params);
    let inS = 0, inA = 0, onS = 0, onA = 0;
    for (const o of result.rows) { const a = parseFloat(o.total || 0); if (o.order_type === "in_store") { inS++; inA += a; } else { onS++; onA += a; } }
    res.json({ in_store_sales: inS, in_store_amount: inA, online_sales: onS, online_amount: onA, total_sales: inS + onS, total_amount: inA + onA });
  } catch (err) {
    res.status(500).json({ error: "Error" });
  }
});

// GET /api/users/admin/store-stats — admin: sales stats per store
router.get("/admin/store-stats", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    let whereClauses = ["s.is_active = true"];
    const params: any[] = [];
    let idx = 1;
    if (req.query.from) { whereClauses.push(`o.created_at >= $${idx++}`); params.push(req.query.from); }
    if (req.query.to) { whereClauses.push(`o.created_at <= $${idx++}`); params.push(req.query.to); }
    const sql = `SELECT s.id as store_id, s.name as store_name, s.color,
       COUNT(o.id) as total_orders, COALESCE(SUM(o.total), 0) as total_amount,
       COUNT(CASE WHEN o.status = 'pending' THEN 1 END) as pending_orders
       FROM stores s
       LEFT JOIN skating_orders o ON o.store_id = s.id
       WHERE ${whereClauses.join(" AND ")}
       GROUP BY s.id, s.name, s.color ORDER BY total_amount DESC`;
    const result = await query(sql, params);
    const sellerCounts = await query(
      "SELECT store_id, COUNT(*) as seller_count FROM store_sellers GROUP BY store_id"
    );
    const sellerMap = new Map(sellerCounts.rows.map((r: any) => [r.store_id, parseInt(r.seller_count)]));
    const stats = result.rows.map((r: any) => ({
      store_id: r.store_id,
      store_name: r.store_name,
      color: r.color,
      total_orders: parseInt(r.total_orders),
      total_amount: parseFloat(r.total_amount),
      pending_orders: parseInt(r.pending_orders),
      seller_count: sellerMap.get(r.store_id) || 0,
    }));
    res.json(stats);
  } catch (err) {
    console.error("Store stats error:", err);
    res.status(500).json({ error: "Error al obtener estadísticas de tiendas" });
  }
});

// GET /api/users/seller/dashboard — seller dashboard stats
router.get("/seller/dashboard", requireAuth, requireRole("SELLER"), async (req, res) => {
  try {
    const sellerId = (req as any).user.userId;
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const result = await query("SELECT id, total, status, dispatched_at, created_at FROM skating_orders WHERE seller_id = $1", [sellerId]);
    const orders = result.rows;
    const todayCompleted = orders.filter((o: any) => o.status === "delivered" && (o.dispatched_at || o.created_at) >= todayStart.toISOString());
    res.json({ today_sales: todayCompleted.reduce((s: number, o: any) => s + parseFloat(o.total || 0), 0), today_orders_completed: todayCompleted.length, pending_orders: orders.filter((o: any) => o.status !== "delivered").length });
  } catch (err) {
    res.status(500).json({ error: "Error" });
  }
});

export default router;
