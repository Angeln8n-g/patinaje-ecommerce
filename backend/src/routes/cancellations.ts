import { Router } from "express";
import { query } from "../db/pool.js";
import { requireAuth, requireRole } from "../lib/auth.js";
import {
  cancelOrder,
  getCancellationWindow,
} from "../lib/cancellation-service.js";

const router = Router();

// POST /api/cancellations/delivery/:orderId — delivery driver cancels order
router.post(
  "/delivery/:orderId",
  requireAuth,
  requireRole("DELIVERY"),
  async (req, res) => {
    try {
      const userId = (req as any).user.userId;
      const orderId = req.params.orderId as string;
      const { reasonCode, reasonDescription } = req.body;

      const result = await cancelOrder({
        orderId,
        cancelledBy: userId,
        cancelledByRole: "DELIVERY",
        reasonCode,
        reasonDescription,
      });

      res.json(result);
    } catch (err: any) {
      const status = err.statusCode || 500;
      res.status(status).json({ error: err.message || "Error al cancelar pedido" });
    }
  }
);

// POST /api/cancellations/seller/:orderId — seller cancels order
router.post(
  "/seller/:orderId",
  requireAuth,
  requireRole("SELLER"),
  async (req, res) => {
    try {
      const userId = (req as any).user.userId;
      const orderId = req.params.orderId as string;
      const { reasonCode, reasonDescription } = req.body;

      const result = await cancelOrder({
        orderId,
        cancelledBy: userId,
        cancelledByRole: "SELLER",
        reasonCode,
        reasonDescription,
      });

      res.json(result);
    } catch (err: any) {
      const status = err.statusCode || 500;
      res.status(status).json({ error: err.message || "Error al cancelar pedido" });
    }
  }
);

// POST /api/cancellations/admin/:orderId — admin cancels any order
router.post(
  "/admin/:orderId",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const userId = (req as any).user.userId;
      const orderId = req.params.orderId as string;
      const { reasonCode, reasonDescription } = req.body;

      const result = await cancelOrder({
        orderId,
        cancelledBy: userId,
        cancelledByRole: "ADMIN",
        reasonCode,
        reasonDescription,
      });

      res.json(result);
    } catch (err: any) {
      const status = err.statusCode || 500;
      res.status(status).json({ error: err.message || "Error al cancelar pedido" });
    }
  }
);

// GET /api/cancellations — list cancellations with filters (admin only)
router.get("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { role, date_from, date_to, limit: rawLimit, offset: rawOffset } = req.query;
    const limit = Math.min(Math.max(parseInt(rawLimit as string) || 20, 1), 100);
    const offset = Math.max(parseInt(rawOffset as string) || 0, 0);

    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (role && typeof role === "string") {
      conditions.push(`oc.cancelled_by_role = $${idx++}`);
      params.push(role.toUpperCase());
    }
    if (date_from && typeof date_from === "string") {
      conditions.push(`oc.created_at >= $${idx++}`);
      params.push(date_from);
    }
    if (date_to && typeof date_to === "string") {
      const toDate = new Date(date_to);
      toDate.setHours(23, 59, 59, 999);
      conditions.push(`oc.created_at <= $${idx++}`);
      params.push(toDate.toISOString());
    }

    const whereClause =
      conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    // Count total
    const countResult = await query(
      `SELECT COUNT(*) FROM order_cancellations oc ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Fetch page
    params.push(limit);
    params.push(offset);
    const dataResult = await query(
      `SELECT oc.*, 
              COALESCE(NULLIF(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')), ''), p.email) AS cancelled_by_name,
              o.customer_name, o.total, o.status AS order_status
       FROM order_cancellations oc
       JOIN profiles p ON p.id = oc.cancelled_by
       JOIN skating_orders o ON o.id = oc.order_id
       ${whereClause}
       ORDER BY oc.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );

    res.json({
      data: dataResult.rows,
      total,
      limit,
      offset,
    });
  } catch (err) {
    console.error("List cancellations error:", err);
    res.status(500).json({ error: "Error al obtener cancelaciones" });
  }
});

// GET /api/cancellations/config — get cancellation window config (admin only)
router.get("/config", requireAuth, requireRole("ADMIN"), async (_req, res) => {
  try {
    const windowMinutes = await getCancellationWindow();
    res.json({ cancellation_window_minutes: windowMinutes });
  } catch (err) {
    console.error("Get cancellation config error:", err);
    res.status(500).json({ error: "Error al obtener configuración" });
  }
});

// PUT /api/cancellations/config — update cancellation window (admin only)
router.put("/config", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { cancellation_window_minutes } = req.body;

    if (
      typeof cancellation_window_minutes !== "number" ||
      cancellation_window_minutes < 5 ||
      cancellation_window_minutes > 1440
    ) {
      res.status(400).json({
        error:
          "La ventana de cancelación debe estar entre 5 y 1440 minutos",
      });
      return;
    }

    // Read current site-settings
    const current = await query(
      "SELECT data FROM static_content WHERE slug = $1",
      ["site-settings"]
    );

    let data: Record<string, any> = {};
    if (current.rows.length > 0 && current.rows[0].data) {
      data =
        typeof current.rows[0].data === "string"
          ? JSON.parse(current.rows[0].data)
          : { ...current.rows[0].data };
    }

    data.cancellation_window_minutes = cancellation_window_minutes;

    if (current.rows.length > 0) {
      await query(
        "UPDATE static_content SET data = $1 WHERE slug = $2",
        [JSON.stringify(data), "site-settings"]
      );
    } else {
      await query(
        "INSERT INTO static_content (slug, data) VALUES ($1, $2)",
        ["site-settings", JSON.stringify(data)]
      );
    }

    res.json({ cancellation_window_minutes });
  } catch (err) {
    console.error("Update cancellation config error:", err);
    res.status(500).json({ error: "Error al actualizar configuración" });
  }
});

export default router;
