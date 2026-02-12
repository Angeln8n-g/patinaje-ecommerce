import { Router } from "express";
import { query } from "../db/pool.js";
import { requireAuth, requireRole } from "../lib/auth.js";

const router = Router();

// POST /api/contact — public
router.post("/", async (req, res) => {
  try {
    const { name, email, message } = req.body;
    const result = await query(
      "INSERT INTO skating_contact_messages (name, email, message) VALUES ($1,$2,$3) RETURNING *",
      [name, email, message]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error al enviar mensaje" });
  }
});

// GET /api/contact — admin
router.get("/", requireAuth, requireRole("ADMIN"), async (_req, res) => {
  try {
    const result = await query("SELECT * FROM skating_contact_messages ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener mensajes" });
  }
});

export default router;
