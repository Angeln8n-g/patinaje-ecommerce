import { Router } from "express";
import { query } from "../db/pool.js";
import { hashPassword, comparePassword, signToken, requireAuth } from "../lib/auth.js";

const router = Router();

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email y contraseña requeridos" });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
      return;
    }

    // Check if user exists
    const existing = await query("SELECT id FROM profiles WHERE email = $1", [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: "El email ya está registrado" });
      return;
    }

    const hash = await hashPassword(password);
    const result = await query(
      `INSERT INTO profiles (email, password_hash, email_confirmed)
       VALUES ($1, $2, TRUE)
       RETURNING id, email, role`,
      [email.toLowerCase(), hash]
    );

    const user = result.rows[0];
    const token = signToken({ userId: user.id, email: user.email, role: user.role });

    res.status(201).json({ user: { id: user.id, email: user.email, role: user.role }, token });
  } catch (err: any) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Error al registrar" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email y contraseña requeridos" });
      return;
    }

    const result = await query(
      "SELECT id, email, password_hash, role FROM profiles WHERE email = $1",
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: "Credenciales inválidas" });
      return;
    }

    const user = result.rows[0];
    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: "Credenciales inválidas" });
      return;
    }

    const token = signToken({ userId: user.id, email: user.email, role: user.role });

    res.json({
      user: { id: user.id, email: user.email, role: user.role },
      token,
    });
  } catch (err: any) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
});

// GET /api/auth/me — get current user profile
router.get("/me", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const result = await query(
      `SELECT id, email, role, first_name, last_name, phone,
              address_street, address_city, address_state,
              address_postal_code, address_country, created_at
       FROM profiles WHERE id = $1`,
      [userId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Get me error:", err);
    res.status(500).json({ error: "Error al obtener perfil" });
  }
});

// PUT /api/auth/profile — update own profile
router.put("/profile", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { first_name, last_name, phone, address_street, address_city, address_state, address_postal_code, address_country } = req.body;

    const result = await query(
      `UPDATE profiles SET
        first_name = COALESCE($2, first_name),
        last_name = COALESCE($3, last_name),
        phone = COALESCE($4, phone),
        address_street = COALESCE($5, address_street),
        address_city = COALESCE($6, address_city),
        address_state = COALESCE($7, address_state),
        address_postal_code = COALESCE($8, address_postal_code),
        address_country = COALESCE($9, address_country),
        updated_at = NOW()
       WHERE id = $1
       RETURNING id, email, role, first_name, last_name, phone, address_street, address_city, address_state, address_postal_code, address_country`,
      [userId, first_name, last_name, phone, address_street, address_city, address_state, address_postal_code, address_country]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: "Error al actualizar perfil" });
  }
});

// PUT /api/auth/password — change password
router.put("/password", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { password } = req.body;
    if (!password || password.length < 6) {
      res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
      return;
    }
    const hash = await hashPassword(password);
    await query("UPDATE profiles SET password_hash = $2, updated_at = NOW() WHERE id = $1", [userId, hash]);
    res.json({ success: true });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ error: "Error al cambiar contraseña" });
  }
});

export default router;
