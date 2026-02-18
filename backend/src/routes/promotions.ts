import { Router } from "express";
import { query } from "../db/pool.js";
import { requireAuth, requireRole } from "../lib/auth.js";

const router = Router();

// ==========================================
// Public: Subscribe to promo waitlist
// ==========================================
router.post("/waitlist", async (req, res) => {
  try {
    const { banner_id, email, name } = req.body;
    const userId = (req as any).user?.userId || null;

    if (!banner_id || !email) {
      return res.status(400).json({ error: "banner_id y email son requeridos" });
    }

    // Verify banner exists and is upcoming
    const bannerCheck = await query(
      "SELECT id, promo_status FROM banners WHERE id = $1",
      [banner_id]
    );
    if (!bannerCheck.rows[0]) {
      return res.status(404).json({ error: "Banner no encontrado" });
    }
    if (bannerCheck.rows[0].promo_status !== "upcoming") {
      return res.status(400).json({ error: "Esta promoción no está en estado próximamente" });
    }

    const result = await query(
      `INSERT INTO promo_waitlist (banner_id, user_id, email, name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (banner_id, email) DO NOTHING
       RETURNING *`,
      [banner_id, userId, email, name || null]
    );

    if (result.rows.length === 0) {
      return res.json({ already_subscribed: true, message: "Ya estás inscrito en esta promoción" });
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error subscribing to waitlist:", err);
    res.status(500).json({ error: "Error al inscribirse en la lista de espera" });
  }
});

// ==========================================
// Public: Check if user is subscribed
// ==========================================
router.get("/waitlist/check", async (req, res) => {
  try {
    const { banner_id, email } = req.query;
    if (!banner_id || !email) {
      return res.status(400).json({ error: "banner_id y email son requeridos" });
    }
    const result = await query(
      "SELECT id FROM promo_waitlist WHERE banner_id = $1 AND email = $2",
      [banner_id, email]
    );
    res.json({ subscribed: result.rows.length > 0 });
  } catch (err) {
    res.status(500).json({ error: "Error al verificar inscripción" });
  }
});

// ==========================================
// Admin: Get upcoming/active promos with waitlist counts
// ==========================================
router.get("/", requireAuth, requireRole("ADMIN"), async (_req, res) => {
  try {
    const result = await query(`
      SELECT b.*,
        (SELECT COUNT(*) FROM promo_waitlist pw WHERE pw.banner_id = b.id) as waitlist_count,
        (SELECT COUNT(*) FROM promo_waitlist pw WHERE pw.banner_id = b.id AND pw.notified = TRUE) as notified_count
      FROM banners b
      WHERE b.promo_status != 'none'
      ORDER BY
        CASE b.promo_status
          WHEN 'upcoming' THEN 1
          WHEN 'active' THEN 2
          WHEN 'expired' THEN 3
        END,
        b.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener promociones" });
  }
});

// ==========================================
// Admin: Get waitlist for a specific banner
// ==========================================
router.get("/waitlist/:bannerId", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const result = await query(
      `SELECT pw.*, p.first_name, p.last_name
       FROM promo_waitlist pw
       LEFT JOIN profiles p ON p.id = pw.user_id
       WHERE pw.banner_id = $1
       ORDER BY pw.created_at DESC`,
      [req.params.bannerId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener lista de espera" });
  }
});


// ==========================================
// Admin: Activate promo (change status + send emails)
// ==========================================
router.put("/:id/activate", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const bannerId = req.params.id;

    // Update banner status to active
    const bannerResult = await query(
      `UPDATE banners SET promo_status = 'active', active = TRUE WHERE id = $1 RETURNING *`,
      [bannerId]
    );
    const banner = bannerResult.rows[0];
    if (!banner) {
      return res.status(404).json({ error: "Banner no encontrado" });
    }

    // Get all waitlist subscribers not yet notified
    const subscribers = await query(
      "SELECT * FROM promo_waitlist WHERE banner_id = $1 AND notified = FALSE",
      [bannerId]
    );

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    let emailsSent = 0;
    const errors: string[] = [];

    if (RESEND_API_KEY && subscribers.rows.length > 0) {
      const storeUrl = process.env.STORE_URL || process.env.CORS_ORIGIN?.split(",")[0] || "https://hunykho.com";
      const promoLink = banner.link_url
        ? `${storeUrl}${banner.link_url}`
        : `${storeUrl}/skating-store`;

      for (const sub of subscribers.rows) {
        try {
          const emailHtml = buildPromoEmailHtml({
            name: sub.name || "Cliente",
            bannerTitle: banner.title,
            bannerDescription: banner.description || "",
            bannerImageUrl: banner.image_url,
            promoLink,
            storeUrl,
          });

          const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: "Hunykho Store <noreply@hunykho.com>",
              to: [sub.email],
              subject: `🎉 ¡${banner.title} ya está disponible!`,
              html: emailHtml,
            }),
          });

          if (emailRes.ok) {
            emailsSent++;
            await query(
              "UPDATE promo_waitlist SET notified = TRUE, notified_at = NOW() WHERE id = $1",
              [sub.id]
            );
          } else {
            const errBody = await emailRes.text();
            errors.push(`${sub.email}: ${errBody}`);
          }
        } catch (emailErr: any) {
          errors.push(`${sub.email}: ${emailErr.message}`);
        }
      }
    }

    res.json({
      banner,
      total_subscribers: subscribers.rows.length,
      emails_sent: emailsSent,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("Error activating promo:", err);
    res.status(500).json({ error: "Error al activar promoción" });
  }
});

// ==========================================
// Admin: Update promo status
// ==========================================
router.put("/:id/status", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { promo_status, promo_start_date, promo_end_date } = req.body;
    const result = await query(
      `UPDATE banners SET promo_status = COALESCE($2, promo_status),
       promo_start_date = COALESCE($3, promo_start_date),
       promo_end_date = COALESCE($4, promo_end_date)
       WHERE id = $1 RETURNING *`,
      [req.params.id, promo_status, promo_start_date || null, promo_end_date || null]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: "Banner no encontrado" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error al actualizar estado de promoción" });
  }
});

// ==========================================
// Email HTML builder
// ==========================================
function buildPromoEmailHtml(params: {
  name: string;
  bannerTitle: string;
  bannerDescription: string;
  bannerImageUrl: string;
  promoLink: string;
  storeUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;margin-top:20px;margin-bottom:20px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
    <!-- Header Image -->
    <div style="width:100%;overflow:hidden;">
      <img src="${params.bannerImageUrl}" alt="${params.bannerTitle}" style="width:100%;height:auto;display:block;object-fit:cover;" />
    </div>
    <!-- Content -->
    <div style="padding:32px 24px;text-align:center;">
      <h1 style="color:#18181b;font-size:24px;margin:0 0 8px;">🎉 ¡${params.bannerTitle}!</h1>
      <p style="color:#71717a;font-size:16px;margin:0 0 24px;line-height:1.5;">
        Hola ${params.name}, la promoción que estabas esperando ya está activa.
        ${params.bannerDescription ? `<br/><br/>${params.bannerDescription}` : ""}
      </p>
      <a href="${params.promoLink}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:9999px;font-weight:700;font-size:16px;letter-spacing:0.5px;">
        Ver Promoción
      </a>
      <p style="color:#a1a1aa;font-size:12px;margin-top:32px;">
        Recibiste este correo porque te inscribiste en la lista de espera de esta promoción en
        <a href="${params.storeUrl}" style="color:#7c3aed;">Hunykho Store</a>.
      </p>
    </div>
  </div>
</body>
</html>`;
}

export default router;
