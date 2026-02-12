import { Router } from "express";
import { query } from "../db/pool.js";
import { requireAuth, requireRole } from "../lib/auth.js";

const router = Router();

// GET /api/products — public, list all products
router.get("/", async (req, res) => {
  try {
    const { category, search, featured } = req.query;
    let sql = "SELECT * FROM skating_products WHERE 1=1";
    const params: any[] = [];
    let idx = 1;

    if (category) {
      sql += ` AND category = $${idx++}`;
      params.push(category);
    }
    if (search) {
      sql += ` AND (name ILIKE $${idx} OR description ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }
    if (featured === "true") {
      sql += " AND featured = TRUE";
    }

    sql += " ORDER BY created_at DESC";

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Get products error:", err);
    res.status(500).json({ error: "Error al obtener productos" });
  }
});

// GET /api/products/:id — public, single product
router.get("/:id", async (req, res) => {
  try {
    const result = await query("SELECT * FROM skating_products WHERE id = $1", [req.params.id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Producto no encontrado" });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Get product error:", err);
    res.status(500).json({ error: "Error al obtener producto" });
  }
});

// GET /api/products/barcode/:barcode — search by barcode
router.get("/barcode/:barcode", async (req, res) => {
  try {
    const result = await query("SELECT * FROM skating_products WHERE barcode = $1", [req.params.barcode]);
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: "Error al buscar por código" });
  }
});

// POST /api/products — admin only
router.post("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { name, description, price, category, images, stock, featured, barcode, variant_type, variant_options, status, subcategory, unit_type, supplier, purchase_price } = req.body;

    const result = await query(
      `INSERT INTO skating_products (name, description, price, category, images, stock, featured, barcode, variant_type, variant_options, status, subcategory, unit_type, supplier, purchase_price)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [name, description, price, category, images || [], stock || 0, featured || false, barcode, variant_type || 'none', variant_options || [], status || 'active', subcategory, unit_type, supplier, purchase_price]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error("Create product error:", err);
    res.status(500).json({ error: "Error al crear producto" });
  }
});

// PUT /api/products/:id — admin or seller
router.put("/:id", requireAuth, requireRole("ADMIN", "SELLER"), async (req, res) => {
  try {
    const fields = req.body;
    const sets: string[] = [];
    const params: any[] = [];
    let idx = 1;

    const allowed = ["name", "description", "price", "category", "images", "stock", "featured", "barcode", "variant_type", "variant_options", "status", "subcategory", "unit_type", "supplier", "purchase_price"];

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        sets.push(`${key} = $${idx++}`);
        params.push(fields[key]);
      }
    }

    if (sets.length === 0) {
      res.status(400).json({ error: "No hay campos para actualizar" });
      return;
    }

    sets.push(`updated_at = NOW()`);
    params.push(req.params.id);

    const result = await query(
      `UPDATE skating_products SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Producto no encontrado" });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update product error:", err);
    res.status(500).json({ error: "Error al actualizar producto" });
  }
});

// DELETE /api/products/:id — admin only
router.delete("/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const result = await query("DELETE FROM skating_products WHERE id = $1 RETURNING id", [req.params.id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Producto no encontrado" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Delete product error:", err);
    res.status(500).json({ error: "Error al eliminar producto" });
  }
});

export default router;
