import { Router } from "express";
import { query } from "../db/pool.js";
import { hashPassword, comparePassword, signToken, requireAuth } from "../lib/auth.js";
import { OAuth2Client } from "google-auth-library";
import crypto from "crypto";
import {
  validate,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
} from "../lib/validators.js";
import { sanitize } from "../lib/sanitize.js";
import { logger } from "../lib/logger.js";
import { enqueueEmail } from "../lib/email-queue.js";

const router = Router();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const FRONTEND_URL = process.env.FRONTEND_URL || "https://hunykho.com";
const IS_PRODUCTION = process.env.NODE_ENV === "production";

/** Set httpOnly cookie with the JWT token */
function setTokenCookie(res: any, token: string) {
  res.cookie("skating_token", token, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "lax" as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/",
  });
}

/** Clear the auth cookie */
function clearTokenCookie(res: any) {
  res.clearCookie("skating_token", { path: "/" });
}

// POST /api/auth/register
router.post("/register", validate(registerSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    const existing = await query("SELECT id FROM profiles WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: "El email ya está registrado" });
      return;
    }

    const hash = await hashPassword(password);
    const result = await query(
      `INSERT INTO profiles (email, password_hash, email_confirmed, auth_provider)
       VALUES ($1, $2, TRUE, 'email')
       RETURNING id, email, role`,
      [email, hash]
    );

    const user = result.rows[0];
    const token = signToken({ userId: user.id, email: user.email, role: user.role });

    setTokenCookie(res, token);
    res.status(201).json({ user: { id: user.id, email: user.email, role: user.role }, token });
  } catch (err: any) {
    logger.error({ err, email: req.body.email }, "Register error");
    res.status(500).json({ error: "Error al registrar" });
  }
});

// POST /api/auth/login
router.post("/login", validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await query(
      "SELECT id, email, password_hash, role, auth_provider FROM profiles WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: "Credenciales inválidas" });
      return;
    }

    const user = result.rows[0];

    if (user.auth_provider === "google" && !user.password_hash) {
      res.status(401).json({ error: "Esta cuenta usa Google para iniciar sesión. Usa el botón de Google." });
      return;
    }

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      logger.security("login_failed", { email, ip: req.ip });
      res.status(401).json({ error: "Credenciales inválidas" });
      return;
    }

    const token = signToken({ userId: user.id, email: user.email, role: user.role });

    logger.security("login_success", { userId: user.id, email, ip: req.ip });
    setTokenCookie(res, token);
    res.json({
      user: { id: user.id, email: user.email, role: user.role },
      token,
    });
  } catch (err: any) {
    logger.error({ err }, "Login error");
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
});


// POST /api/auth/google — Google OAuth sign-in/sign-up
router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      res.status(400).json({ error: "Token de Google requerido" });
      return;
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      res.status(400).json({ error: "Token de Google inválido" });
      return;
    }

    const { email, sub: googleId, given_name, family_name } = payload;

    const existing = await query("SELECT id, email, role, auth_provider FROM profiles WHERE email = $1", [email.toLowerCase()]);

    let user;
    if (existing.rows.length > 0) {
      user = existing.rows[0];
      if (user.auth_provider !== "google") {
        await query(
          "UPDATE profiles SET auth_provider = 'google', auth_provider_id = $2, updated_at = NOW() WHERE id = $1",
          [user.id, googleId]
        );
      }
    } else {
      const result = await query(
        `INSERT INTO profiles (email, auth_provider, auth_provider_id, first_name, last_name, email_confirmed)
         VALUES ($1, 'google', $2, $3, $4, TRUE)
         RETURNING id, email, role`,
        [email.toLowerCase(), googleId, given_name || null, family_name || null]
      );
      user = result.rows[0];
    }

    const token = signToken({ userId: user.id, email: user.email, role: user.role });

    setTokenCookie(res, token);
    res.json({
      user: { id: user.id, email: user.email, role: user.role },
      token,
    });
  } catch (err: any) {
    logger.error({ err }, "Google auth error");
    res.status(500).json({ error: "Error al autenticar con Google" });
  }
});

// POST /api/auth/logout — clear httpOnly cookie
router.post("/logout", (_req, res) => {
  clearTokenCookie(res);
  res.json({ success: true });
});

// POST /api/auth/forgot-password — send reset email
router.post("/forgot-password", validate(forgotPasswordSchema), async (req, res) => {
  try {
    const { email } = req.body;

    const userResult = await query("SELECT id, email, auth_provider FROM profiles WHERE email = $1", [email]);

    // Always return success to prevent email enumeration
    if (userResult.rows.length === 0) {
      res.json({ success: true, message: "Si el email existe, recibirás un enlace de recuperación" });
      return;
    }

    const user = userResult.rows[0];

    // Invalidate previous tokens
    await query("UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE", [user.id]);

    // Generate token — store a hash, send the raw token to the user
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await query(
      "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
      [user.id, tokenHash, expiresAt]
    );

    const resetUrl = `${FRONTEND_URL}/reset-password?token=${rawToken}`;

    enqueueEmail({
      from: "Skating Store <noreply@hunykho.com>",
      to: user.email,
      subject: "Recupera tu contraseña - Skating Store",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <h2 style="text-align: center; color: #333;">🛹 Skating Store</h2>
          <p>Hola,</p>
          <p>Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón de abajo:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #000; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 50px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; font-size: 14px;">
              Restablecer Contraseña
            </a>
          </div>
          <p style="color: #666; font-size: 13px;">Este enlace expira en 1 hora. Si no solicitaste esto, ignora este correo.</p>
        </div>
      `,
    });

    logger.security("password_reset_requested", { userId: user.id, email: user.email });
    res.json({ success: true, message: "Si el email existe, recibirás un enlace de recuperación" });
  } catch (err: any) {
    logger.error({ err }, "Forgot password error");
    res.status(500).json({ error: "Error al enviar correo de recuperación" });
  }
});

// POST /api/auth/reset-password — reset password with token
router.post("/reset-password", validate(resetPasswordSchema), async (req, res) => {
  try {
    const { token, password } = req.body;

    // Hash the incoming token to compare against stored hash
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const tokenResult = await query(
      "SELECT id, user_id, expires_at, used FROM password_reset_tokens WHERE token = $1",
      [tokenHash]
    );

    if (tokenResult.rows.length === 0) {
      res.status(400).json({ error: "Token inválido o expirado" });
      return;
    }

    const resetToken = tokenResult.rows[0];

    if (resetToken.used) {
      res.status(400).json({ error: "Este enlace ya fue utilizado" });
      return;
    }

    if (new Date(resetToken.expires_at) < new Date()) {
      res.status(400).json({ error: "El enlace ha expirado. Solicita uno nuevo." });
      return;
    }

    const hash = await hashPassword(password);

    await query("UPDATE profiles SET password_hash = $2, auth_provider = 'email', updated_at = NOW() WHERE id = $1", [resetToken.user_id, hash]);
    await query("UPDATE password_reset_tokens SET used = TRUE WHERE id = $1", [resetToken.id]);

    res.json({ success: true, message: "Contraseña actualizada correctamente" });
  } catch (err: any) {
    logger.error({ err }, "Reset password error");
    res.status(500).json({ error: "Error al restablecer contraseña" });
  }
});

// GET /api/auth/me — get current user profile
router.get("/me", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const result = await query(
      `SELECT id, email, role, first_name, last_name, phone,
              address_street, address_city, address_state,
              address_postal_code, address_country, auth_provider, created_at
       FROM profiles WHERE id = $1`,
      [userId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    logger.error({ err }, "Get me error");
    res.status(500).json({ error: "Error al obtener perfil" });
  }
});

// PUT /api/auth/profile — update own profile (sanitized)
router.put("/profile", requireAuth, validate(updateProfileSchema), async (req, res) => {
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
      [userId, sanitize(first_name), sanitize(last_name), sanitize(phone), sanitize(address_street), sanitize(address_city), sanitize(address_state), sanitize(address_postal_code), sanitize(address_country)]
    );

    res.json(result.rows[0]);
  } catch (err) {
    logger.error({ err }, "Update profile error");
    res.status(500).json({ error: "Error al actualizar perfil" });
  }
});

// PUT /api/auth/password — change password (requires current password)
router.put("/password", requireAuth, validate(changePasswordSchema), async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { current_password, password } = req.body;

    // Verify current password
    const userResult = await query("SELECT password_hash FROM profiles WHERE id = $1", [userId]);
    if (userResult.rows.length === 0) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }

    const user = userResult.rows[0];
    if (!user.password_hash) {
      res.status(400).json({ error: "Esta cuenta usa autenticación social. No se puede cambiar la contraseña." });
      return;
    }

    const valid = await comparePassword(current_password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: "La contraseña actual es incorrecta" });
      return;
    }

    const hash = await hashPassword(password);
    await query("UPDATE profiles SET password_hash = $2, updated_at = NOW() WHERE id = $1", [userId, hash]);
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Change password error");
    res.status(500).json({ error: "Error al cambiar contraseña" });
  }
});

// DELETE /api/auth/account — delete own account (right to be forgotten)
router.delete("/account", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { password } = req.body;

    // Verify identity: require password for email users
    const userResult = await query("SELECT id, password_hash, auth_provider FROM profiles WHERE id = $1", [userId]);
    if (userResult.rows.length === 0) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }

    const user = userResult.rows[0];

    // Email users must confirm with password
    if (user.auth_provider === "email" && user.password_hash) {
      if (!password) {
        res.status(400).json({ error: "Debes confirmar tu contraseña para eliminar la cuenta" });
        return;
      }
      const valid = await comparePassword(password, user.password_hash);
      if (!valid) {
        res.status(401).json({ error: "Contraseña incorrecta" });
        return;
      }
    }

    // Anonymize personal data instead of hard delete to preserve order history integrity
    await query(
      `UPDATE profiles SET
        email = 'deleted_' || id || '@removed.local',
        password_hash = NULL,
        first_name = NULL,
        last_name = NULL,
        phone = NULL,
        address_street = NULL,
        address_city = NULL,
        address_state = NULL,
        address_postal_code = NULL,
        address_country = NULL,
        auth_provider_id = NULL,
        updated_at = NOW()
       WHERE id = $1`,
      [userId]
    );

    // Delete related personal data
    await query("DELETE FROM carts WHERE user_id = $1", [userId]);
    await query("DELETE FROM favorites WHERE user_id = $1", [userId]);
    await query("DELETE FROM skating_notifications WHERE user_id = $1", [userId]);
    await query("DELETE FROM password_reset_tokens WHERE user_id = $1", [userId]);

    logger.security("account_deleted", { userId, ip: req.ip });
    clearTokenCookie(res);
    res.json({ success: true, message: "Cuenta eliminada exitosamente. Tus datos personales han sido removidos." });
  } catch (err) {
    logger.error({ err }, "Delete account error");
    res.status(500).json({ error: "Error al eliminar la cuenta" });
  }
});

export default router;

// DELETE /api/auth/account — delete own account (right to be forgotten)
router.delete("/account", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { password } = req.body;

    // Verify identity: require password for email users
    const userResult = await query("SELECT id, password_hash, auth_provider FROM profiles WHERE id = $1", [userId]);
    if (userResult.rows.length === 0) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }

    const user = userResult.rows[0];

    // Email users must confirm with password
    if (user.auth_provider === "email" && user.password_hash) {
      if (!password) {
        res.status(400).json({ error: "Debes confirmar tu contraseña para eliminar la cuenta" });
        return;
      }
      const valid = await comparePassword(password, user.password_hash);
      if (!valid) {
        res.status(401).json({ error: "Contraseña incorrecta" });
        return;
      }
    }

    // Anonymize personal data instead of hard delete to preserve order history integrity
    await query(
      `UPDATE profiles SET
        email = 'deleted_' || id || '@removed.local',
        password_hash = NULL,
        first_name = NULL,
        last_name = NULL,
        phone = NULL,
        address_street = NULL,
        address_city = NULL,
        address_state = NULL,
        address_postal_code = NULL,
        address_country = NULL,
        auth_provider_id = NULL,
        updated_at = NOW()
       WHERE id = $1`,
      [userId]
    );

    // Delete related personal data
    await query("DELETE FROM carts WHERE user_id = $1", [userId]);
    await query("DELETE FROM favorites WHERE user_id = $1", [userId]);
    await query("DELETE FROM skating_notifications WHERE user_id = $1", [userId]);
    await query("DELETE FROM password_reset_tokens WHERE user_id = $1", [userId]);

    logger.security("account_deleted", { userId, ip: req.ip });
    clearTokenCookie(res);
    res.json({ success: true, message: "Cuenta eliminada exitosamente. Tus datos personales han sido removidos." });
  } catch (err) {
    logger.error({ err }, "Delete account error");
    res.status(500).json({ error: "Error al eliminar la cuenta" });
  }
});

