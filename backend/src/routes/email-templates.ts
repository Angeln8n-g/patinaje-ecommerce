import { Router } from "express";
import { query } from "../db/pool.js";
import { requireAuth, requireRole } from "../lib/auth.js";

const router = Router();

// ==========================================
// Helpers
// ==========================================

/** Map a DB row (snake_case) to a camelCase list item */
function toListItem(row: any) {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    triggerType: row.trigger_type,
    updatedAt: row.updated_at,
  };
}

/** Map a DB row (snake_case) to a full camelCase template */
function toTemplate(row: any) {
  return {
    id: row.id,
    name: row.name,
    subject: row.subject,
    senderName: row.sender_name,
    replyTo: row.reply_to,
    htmlContent: row.html_content,
    contentProperties: row.content_properties,
    styleProperties: row.style_properties,
    triggerType: row.trigger_type,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Example values for template variables */
const EXAMPLE_VALUES: Record<string, string> = {
  nombre_usuario: "Juan Pérez",
  email_usuario: "juan@ejemplo.com",
  nombre_tienda: "Hunykho Store",
  url_tienda: "https://hunykho.com",
  fecha_actual: new Date().toISOString().slice(0, 10),
};

function replaceVariables(html: string, values: Record<string, string>): string {
  let result = html;
  for (const [key, value] of Object.entries(values)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

/** Required fields for activation */
const REQUIRED_FOR_ACTIVATION = ["name", "subject", "senderName", "replyTo", "htmlContent"] as const;

// ==========================================
// GET /api/email-templates — List templates
// ==========================================
router.get("/", requireAuth, requireRole("ADMIN"), async (_req, res) => {
  try {
    const result = await query(
      "SELECT id, name, status, trigger_type, updated_at FROM email_templates ORDER BY updated_at DESC"
    );
    res.json(result.rows.map(toListItem));
  } catch (err) {
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ==========================================
// GET /api/email-templates/:id — Get template
// ==========================================
router.get("/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const result = await query("SELECT * FROM email_templates WHERE id = $1", [req.params.id]);
    if (!result.rows[0]) {
      return res.status(404).json({ error: "Plantilla no encontrada" });
    }
    res.json(toTemplate(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ==========================================
// POST /api/email-templates — Create template
// ==========================================
router.post("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const {
      name, subject, senderName, replyTo, htmlContent,
      contentProperties, styleProperties, triggerType, status,
    } = req.body;

    const result = await query(
      `INSERT INTO email_templates
        (name, subject, sender_name, reply_to, html_content,
         content_properties, style_properties, trigger_type, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        name || "",
        subject || "",
        senderName || "",
        replyTo || "",
        htmlContent || "",
        JSON.stringify(contentProperties || {}),
        JSON.stringify(styleProperties || {}),
        triggerType || "manual-campana",
        status || "borrador",
      ]
    );

    res.status(201).json(toTemplate(result.rows[0]));
  } catch (err: any) {
    if (err?.code === "23505") {
      return res.status(409).json({ error: "Ya existe una plantilla con ese nombre" });
    }
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ==========================================
// PUT /api/email-templates/:id — Update template
// ==========================================
router.put("/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const {
      name, subject, senderName, replyTo, htmlContent,
      contentProperties, styleProperties, triggerType, status,
    } = req.body;

    // Check template exists
    const existing = await query("SELECT * FROM email_templates WHERE id = $1", [req.params.id]);
    if (!existing.rows[0]) {
      return res.status(404).json({ error: "Plantilla no encontrada" });
    }

    // If activating, validate required fields
    if (status === "activa") {
      const incoming = {
        name: name ?? existing.rows[0].name,
        subject: subject ?? existing.rows[0].subject,
        senderName: senderName ?? existing.rows[0].sender_name,
        replyTo: replyTo ?? existing.rows[0].reply_to,
        htmlContent: htmlContent ?? existing.rows[0].html_content,
      };
      const missingFields = REQUIRED_FOR_ACTIVATION.filter((f) => !incoming[f]?.trim());
      if (missingFields.length > 0) {
        return res.status(422).json({
          error: "Campos obligatorios faltantes",
          fields: missingFields,
        });
      }
    }

    // Validate name uniqueness if name is changing
    if (name !== undefined && name !== existing.rows[0].name) {
      const dup = await query(
        "SELECT id FROM email_templates WHERE name = $1 AND id != $2",
        [name, req.params.id]
      );
      if (dup.rows.length > 0) {
        return res.status(409).json({ error: "Ya existe una plantilla con ese nombre" });
      }
    }

    const result = await query(
      `UPDATE email_templates SET
        name = COALESCE($2, name),
        subject = COALESCE($3, subject),
        sender_name = COALESCE($4, sender_name),
        reply_to = COALESCE($5, reply_to),
        html_content = COALESCE($6, html_content),
        content_properties = COALESCE($7, content_properties),
        style_properties = COALESCE($8, style_properties),
        trigger_type = COALESCE($9, trigger_type),
        status = COALESCE($10, status),
        updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        req.params.id,
        name ?? null,
        subject ?? null,
        senderName ?? null,
        replyTo ?? null,
        htmlContent ?? null,
        contentProperties ? JSON.stringify(contentProperties) : null,
        styleProperties ? JSON.stringify(styleProperties) : null,
        triggerType ?? null,
        status ?? null,
      ]
    );

    res.json(toTemplate(result.rows[0]));
  } catch (err: any) {
    if (err?.code === "23505") {
      return res.status(409).json({ error: "Ya existe una plantilla con ese nombre" });
    }
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ==========================================
// DELETE /api/email-templates/:id — Delete template
// ==========================================
router.delete("/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const result = await query(
      "DELETE FROM email_templates WHERE id = $1 RETURNING id",
      [req.params.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: "Plantilla no encontrada" });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ==========================================
// POST /api/email-templates/:id/send-test — Send test email
// ==========================================
router.post("/:id/send-test", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { to } = req.body;
    if (!to) {
      return res.status(400).json({ error: "Dirección de email requerida" });
    }

    const result = await query("SELECT * FROM email_templates WHERE id = $1", [req.params.id]);
    if (!result.rows[0]) {
      return res.status(404).json({ error: "Plantilla no encontrada" });
    }

    const template = result.rows[0];
    const html = replaceVariables(template.html_content || "", EXAMPLE_VALUES);

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      return res.status(502).json({ error: "Error al enviar email de prueba", detail: "RESEND_API_KEY no configurada" });
    }

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${template.sender_name || "Hunykho Store"} <noreply@hunykho.com>`,
        to: [to],
        subject: template.subject || "Email de prueba",
        html,
      }),
    });

    if (!emailRes.ok) {
      const errBody = await emailRes.text();
      return res.status(502).json({ error: "Error al enviar email de prueba", detail: errBody });
    }

    const emailData = await emailRes.json();
    res.json({ success: true, messageId: emailData.id });
  } catch (err: any) {
    res.status(502).json({ error: "Error al enviar email de prueba", detail: err.message });
  }
});

export default router;
