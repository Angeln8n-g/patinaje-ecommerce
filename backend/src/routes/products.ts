import { Router } from "express";
import { query } from "../db/pool.js";
import { requireAuth, requireRole } from "../lib/auth.js";
import { validateColorOptions } from "../lib/color-validation.js";

const router = Router();

// Helper: parse numeric fields that PostgreSQL returns as strings
function parseProduct(row: any) {
  if (!row) return row;
  return {
    ...row,
    price: row.price != null ? parseFloat(row.price) : 0,
    purchase_price: row.purchase_price != null ? parseFloat(row.purchase_price) : null,
    stock: row.stock != null ? parseInt(row.stock) : 0,
    images: Array.isArray(row.images) ? row.images : [],
    variant_options: Array.isArray(row.variant_options) ? row.variant_options : [],
    variant_prices: row.variant_prices && typeof row.variant_prices === 'object' ? row.variant_prices : {},
    variant_images: row.variant_images && typeof row.variant_images === 'object' ? row.variant_images : {},
  };
}

// GET /api/products — public, list all products
router.get("/", async (req, res) => {
  try {
    const { category, search, featured } = req.query;
    let sql = "SELECT * FROM skating_products WHERE 1=1";
    const params: any[] = [];
    let idx = 1;

    if (category) {
      sql += " AND category = $" + (idx++);
      params.push(category);
    }
    if (search) {
      sql += " AND (name ILIKE $" + idx + " OR description ILIKE $" + idx + ")";
      params.push("%" + search + "%");
      idx++;
    }
    if (featured === "true") {
      sql += " AND featured = TRUE";
    }

    sql += " ORDER BY created_at DESC";
    const result = await query(sql, params);
    res.json(result.rows.map(parseProduct));
  } catch (err) {
    console.error("Get products error:", err);
    res.status(500).json({ error: "Error al obtener productos" });
  }
});

// GET /api/products/barcode/:barcode — search by barcode
router.get("/barcode/:barcode", async (req, res) => {
  try {
    const result = await query("SELECT * FROM skating_products WHERE barcode = $1", [req.params.barcode]);
    res.json(result.rows[0] ? parseProduct(result.rows[0]) : null);
  } catch (err) {
    res.status(500).json({ error: "Error al buscar por código" });
  }
});

// GET /api/products/search-pos — seller: search products for POS
router.get("/search-pos", requireAuth, requireRole("SELLER"), async (req, res) => {
  try {
    const searchTerm = (req.query.q as string || "").trim();
    if (!searchTerm) { res.json([]); return; }

    // Try exact barcode match first
    const barcodeResult = await query(
      "SELECT * FROM skating_products WHERE status = 'active' AND stock > 0 AND barcode = $1 LIMIT 1",
      [searchTerm]
    );
    if (barcodeResult.rows.length > 0) { res.json(barcodeResult.rows.map(parseProduct)); return; }

    // Fallback to name search
    const result = await query(
      "SELECT * FROM skating_products WHERE status = 'active' AND stock > 0 AND name ILIKE $1 ORDER BY name LIMIT 20",
      ["%" + searchTerm + "%"]
    );
    res.json(result.rows.map(parseProduct));
  } catch (err) {
    res.status(500).json({ error: "Error al buscar productos" });
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
    res.json(parseProduct(result.rows[0]));
  } catch (err) {
    console.error("Get product error:", err);
    res.status(500).json({ error: "Error al obtener producto" });
  }
});

// POST /api/products — admin only
router.post("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { name, description, price, category, images, stock, featured, barcode, variant_type, variant_options, variant_prices, variant_images, status, subcategory, unit_type, supplier, purchase_price } = req.body;

    // Validate color variant options
    if (variant_type === 'color' && Array.isArray(variant_options)) {
      const colorError = validateColorOptions(variant_options);
      if (colorError) {
        res.status(400).json({ error: colorError });
        return;
      }
    }

    const result = await query(
      `INSERT INTO skating_products (name, description, price, category, images, stock, featured, barcode, variant_type, variant_options, variant_prices, variant_images, status, subcategory, unit_type, supplier, purchase_price)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING *`,
      [name, description, price, category, images || [], stock || 0, featured || false, barcode, variant_type || 'none', variant_options || [], JSON.stringify(variant_prices || {}), JSON.stringify(variant_images || {}), status || 'active', subcategory, unit_type, supplier, purchase_price]
    );
    res.status(201).json(parseProduct(result.rows[0]));
  } catch (err: any) {
    console.error("Create product error:", err);
    res.status(500).json({ error: "Error al crear producto" });
  }
});

// POST /api/products/bulk — admin: bulk create products
router.post("/bulk", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { products } = req.body;
    if (!Array.isArray(products) || products.length === 0) {
      res.status(400).json({ error: "Debe enviar un array de productos" });
      return;
    }
    if (products.length > 500) {
      res.status(400).json({ error: "Máximo 500 productos por carga" });
      return;
    }

    const results: { success: any[]; errors: { row: number; name: string; error: string }[] } = { success: [], errors: [] };

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      try {
        if (!p.name || !p.price) {
          results.errors.push({ row: i + 1, name: p.name || "Sin nombre", error: "Nombre y precio son obligatorios" });
          continue;
        }
        const result = await query(
          `INSERT INTO skating_products (name, description, price, category, images, stock, featured, barcode, variant_type, variant_options, variant_prices, variant_images, status, subcategory, unit_type, supplier, purchase_price)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
           RETURNING *`,
          [
            p.name,
            p.description || "",
            parseFloat(p.price) || 0,
            p.category || "",
            p.images || [],
            parseInt(p.stock) || 0,
            p.featured === true || p.featured === "true" || p.featured === "si" || p.featured === "sí",
            p.barcode || null,
            p.variant_type || "none",
            p.variant_options || [],
            JSON.stringify(p.variant_prices || {}),
            JSON.stringify(p.variant_images || {}),
            p.status || "active",
            p.subcategory || null,
            p.unit_type || null,
            p.supplier || null,
            p.purchase_price ? parseFloat(p.purchase_price) : null,
          ]
        );
        results.success.push(parseProduct(result.rows[0]));
      } catch (err: any) {
        results.errors.push({ row: i + 1, name: p.name || "Sin nombre", error: err.message || "Error desconocido" });
      }
    }

    res.status(201).json({
      total: products.length,
      created: results.success.length,
      failed: results.errors.length,
      errors: results.errors,
    });
  } catch (err) {
    console.error("Bulk create error:", err);
    res.status(500).json({ error: "Error en carga masiva" });
  }
});

// PUT /api/products/:id — admin or seller
router.put("/:id", requireAuth, requireRole("ADMIN", "SELLER"), async (req, res) => {
  try {
    const fields = req.body;

    // Validate color variant options
    if (fields.variant_type === 'color' && Array.isArray(fields.variant_options)) {
      const colorError = validateColorOptions(fields.variant_options);
      if (colorError) {
        res.status(400).json({ error: colorError });
        return;
      }
    }

    const sets: string[] = [];
    const params: any[] = [];
    let idx = 1;
    const allowed = ["name", "description", "price", "category", "images", "stock", "featured", "barcode", "variant_type", "variant_options", "variant_prices", "variant_images", "status", "subcategory", "unit_type", "supplier", "purchase_price"];
    for (const key of allowed) {
      if (fields[key] !== undefined) {
        sets.push(key + " = $" + (idx++));
        params.push(key === 'variant_prices' || key === 'variant_images' ? JSON.stringify(fields[key]) : fields[key]);
      }
    }
    if (sets.length === 0) { res.status(400).json({ error: "No hay campos para actualizar" }); return; }
    sets.push("updated_at = NOW()");
    params.push(req.params.id);
    const result = await query(
      "UPDATE skating_products SET " + sets.join(", ") + " WHERE id = $" + idx + " RETURNING *",
      params
    );
    if (result.rows.length === 0) { res.status(404).json({ error: "Producto no encontrado" }); return; }
    res.json(parseProduct(result.rows[0]));
  } catch (err) {
    console.error("Update product error:", err);
    res.status(500).json({ error: "Error al actualizar producto" });
  }
});

// DELETE /api/products/:id — admin only
router.delete("/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const result = await query("DELETE FROM skating_products WHERE id = $1 RETURNING id", [req.params.id]);
    if (result.rows.length === 0) { res.status(404).json({ error: "Producto no encontrado" }); return; }
    res.json({ success: true });
  } catch (err) {
    console.error("Delete product error:", err);
    res.status(500).json({ error: "Error al eliminar producto" });
  }
});

export default router;
