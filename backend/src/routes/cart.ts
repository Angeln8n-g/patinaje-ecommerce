import { Router } from "express";
import { query } from "../db/pool.js";
import { requireAuth } from "../lib/auth.js";

const router = Router();

// Helper: get or create cart
async function getOrCreateCart(userId: string): Promise<string> {
  const existing = await query("SELECT id FROM carts WHERE user_id = $1", [userId]);
  if (existing.rows.length > 0) return existing.rows[0].id;
  const created = await query("INSERT INTO carts (user_id) VALUES ($1) RETURNING id", [userId]);
  return created.rows[0].id;
}

// GET /api/cart — get user's cart with product details
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const cartId = await getOrCreateCart(userId);

    const result = await query(
      `SELECT ci.quantity, ci.selected_variant, p.*
       FROM cart_items ci
       JOIN skating_products p ON p.id = ci.product_id
       WHERE ci.cart_id = $1`,
      [cartId]
    );

    const items = result.rows.map((row) => ({
      quantity: row.quantity,
      selectedVariant: row.selected_variant,
      product: {
        id: row.id, name: row.name, description: row.description,
        price: parseFloat(row.price), category: row.category, images: row.images,
        stock: row.stock, featured: row.featured, barcode: row.barcode,
        variant_type: row.variant_type, variant_options: row.variant_options,
        status: row.status, created_at: row.created_at, updated_at: row.updated_at,
      },
    }));

    res.json(items);
  } catch (err) {
    console.error("Get cart error:", err);
    res.status(500).json({ error: "Error al obtener carrito" });
  }
});

// POST /api/cart — add item
router.post("/", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { product_id, quantity, selected_variant } = req.body;
    const cartId = await getOrCreateCart(userId);

    // Upsert
    await query(
      `INSERT INTO cart_items (cart_id, product_id, quantity, selected_variant)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (cart_id, product_id, selected_variant)
       DO UPDATE SET quantity = cart_items.quantity + $3, updated_at = NOW()`,
      [cartId, product_id, quantity || 1, selected_variant || null]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Add to cart error:", err);
    res.status(500).json({ error: "Error al agregar al carrito" });
  }
});

// PUT /api/cart/:productId — update quantity
router.put("/:productId", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const cartId = await getOrCreateCart(userId);
    const { quantity } = req.body;

    await query(
      "UPDATE cart_items SET quantity = $3, updated_at = NOW() WHERE cart_id = $1 AND product_id = $2",
      [cartId, req.params.productId, quantity]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Error al actualizar cantidad" });
  }
});

// DELETE /api/cart/:productId — remove item
router.delete("/:productId", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const cartId = await getOrCreateCart(userId);
    await query("DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2", [cartId, req.params.productId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Error al eliminar del carrito" });
  }
});

// DELETE /api/cart — clear cart
router.delete("/", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const cartId = await getOrCreateCart(userId);
    await query("DELETE FROM cart_items WHERE cart_id = $1", [cartId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Error al vaciar carrito" });
  }
});

export default router;
