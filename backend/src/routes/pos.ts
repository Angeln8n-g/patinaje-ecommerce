import { Router } from "express";
import { query } from "../db/pool.js";
import { requireAuth, requireRole } from "../lib/auth.js";

const router = Router();

// GET /api/pos/sessions/active — get active session for current seller
router.get("/sessions/active", requireAuth, requireRole("SELLER"), async (req, res) => {
  try {
    const sellerId = (req as any).user.userId;
    const result = await query(
      "SELECT * FROM pos_sessions WHERE seller_id = $1 AND status = 'open' ORDER BY opened_at DESC LIMIT 1",
      [sellerId]
    );
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener sesión" });
  }
});

// POST /api/pos/sessions — open session
router.post("/sessions", requireAuth, requireRole("SELLER"), async (req, res) => {
  try {
    const sellerId = (req as any).user.userId;
    const { initial_amount } = req.body;
    const result = await query(
      "INSERT INTO pos_sessions (seller_id, initial_amount) VALUES ($1, $2) RETURNING *",
      [sellerId, initial_amount || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error al abrir sesión" });
  }
});

// PUT /api/pos/sessions/:id/close — close session
router.put("/sessions/:id/close", requireAuth, requireRole("SELLER"), async (req, res) => {
  try {
    const { reported_amount } = req.body;
    const result = await query(
      `UPDATE pos_sessions SET status = 'closed', reported_amount = $2,
       expected_amount = initial_amount + total_cash_sales, closed_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id, reported_amount]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error al cerrar sesión" });
  }
});

// PUT /api/pos/sessions/:id/sale — record a sale
router.put("/sessions/:id/sale", requireAuth, requireRole("SELLER"), async (req, res) => {
  try {
    const { amount, payment_method } = req.body;
    const cardField = payment_method === 'card' ? amount : 0;
    const cashField = payment_method === 'cash' ? amount : 0;

    const result = await query(
      `UPDATE pos_sessions SET
        total_sales = total_sales + $2,
        total_card_sales = total_card_sales + $3,
        total_cash_sales = total_cash_sales + $4,
        transaction_count = transaction_count + 1
       WHERE id = $1 RETURNING *`,
      [req.params.id, amount, cardField, cashField]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error al registrar venta" });
  }
});

// GET /api/pos/sessions — admin: all sessions
router.get("/sessions", requireAuth, requireRole("ADMIN"), async (_req, res) => {
  try {
    const result = await query("SELECT * FROM pos_sessions ORDER BY opened_at DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener sesiones" });
  }
});

export default router;
