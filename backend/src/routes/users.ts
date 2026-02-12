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

// PUT /api/users/:id/role — admin: change user role
router.put("/:id/role", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { role } = req.body;
    if (!["USER", "ADMIN", "DELIVERY", "SELLER"].includes(role)) {
      res.status(400).json({ error: "Rol inválido" });
      return;
    }
    const result = await query(
      "UPDATE profiles SET role = $2, updated_at = NOW() WHERE id = $1 RETURNING id, email, role",
      [req.params.id, role]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error al actualizar rol" });
  }
});

export default router;
