import { Router } from "express";
import { query } from "../db/pool.js";
import { requireAuth, requireRole } from "../lib/auth.js";

const router = Router();

// ==========================================
// Categories
// ==========================================
router.get("/categories", async (_req, res) => {
  try {
    const result = await query("SELECT * FROM categories ORDER BY name");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener categorías" });
  }
});

router.post("/categories", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { name, slug, description, icon_name, icon_url } = req.body;
    const result = await query(
      "INSERT INTO categories (name, slug, description, icon_name, icon_url) VALUES ($1,$2,$3,$4,$5) RETURNING *",
      [name, slug, description, icon_name, icon_url]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error al crear categoría" });
  }
});

router.delete("/categories/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    await query("DELETE FROM categories WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Error al eliminar categoría" });
  }
});

// ==========================================
// Banners
// ==========================================
router.get("/banners", async (req, res) => {
  try {
    const activeOnly = req.query.active === "true";
    let sql = "SELECT * FROM banners";
    if (activeOnly) sql += " WHERE active = TRUE";
    sql += " ORDER BY display_order ASC";
    const result = await query(sql);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener banners" });
  }
});

router.post("/banners", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { title, description, image_url, link_url, active, display_order } = req.body;
    const result = await query(
      "INSERT INTO banners (title, description, image_url, link_url, active, display_order) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
      [title, description, image_url, link_url, active ?? true, display_order ?? 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error al crear banner" });
  }
});

router.put("/banners/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { title, description, image_url, link_url, active, display_order } = req.body;
    const result = await query(
      `UPDATE banners SET title=COALESCE($2,title), description=COALESCE($3,description),
       image_url=COALESCE($4,image_url), link_url=COALESCE($5,link_url),
       active=COALESCE($6,active), display_order=COALESCE($7,display_order)
       WHERE id=$1 RETURNING *`,
      [req.params.id, title, description, image_url, link_url, active, display_order]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error al actualizar banner" });
  }
});

router.delete("/banners/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    await query("DELETE FROM banners WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Error al eliminar banner" });
  }
});

// ==========================================
// Promo Text Banners
// ==========================================
router.get("/promo-banners", async (req, res) => {
  try {
    const activeOnly = req.query.active === "true";
    let sql = "SELECT * FROM promo_text_banners";
    if (activeOnly) sql += " WHERE active = TRUE";
    sql += " ORDER BY created_at DESC";
    const result = await query(sql);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener promo banners" });
  }
});

router.put("/promo-banners/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { title, prefix_text, highlight_text, suffix_text, image_url, bg_color, active } = req.body;
    const result = await query(
      `UPDATE promo_text_banners SET title=COALESCE($2,title), prefix_text=COALESCE($3,prefix_text),
       highlight_text=COALESCE($4,highlight_text), suffix_text=COALESCE($5,suffix_text),
       image_url=COALESCE($6,image_url), bg_color=COALESCE($7,bg_color), active=COALESCE($8,active)
       WHERE id=$1 RETURNING *`,
      [req.params.id, title, prefix_text, highlight_text, suffix_text, image_url, bg_color, active]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error al actualizar promo banner" });
  }
});

// ==========================================
// Static Content
// ==========================================
router.get("/static/:slug", async (req, res) => {
  try {
    const result = await query("SELECT * FROM static_content WHERE slug = $1", [req.params.slug]);
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener contenido" });
  }
});

router.put("/static/:slug", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { data } = req.body;
    const result = await query(
      `INSERT INTO static_content (slug, data, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (slug) DO UPDATE SET data = $2, updated_at = NOW()
       RETURNING *`,
      [req.params.slug, JSON.stringify(data)]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error al actualizar contenido" });
  }
});

export default router;
