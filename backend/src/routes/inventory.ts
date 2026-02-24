import { Router } from "express";
import { query, withTransaction } from "../db/pool.js";
import { requireAuth, requireRole } from "../lib/auth.js";

const router = Router();

// GET /api/inventory — admin: all movements (optionally filtered by store)
router.get("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { store_id } = req.query;
    let sql = `SELECT im.*, p.name as product_name, s.name as store_name
       FROM inventory_movements im
       LEFT JOIN skating_products p ON p.id = im.product_id
       LEFT JOIN stores s ON s.id = im.store_id`;
    const params: any[] = [];

    if (store_id) {
      sql += " WHERE im.store_id = $1";
      params.push(store_id);
    }

    sql += " ORDER BY im.created_at DESC";
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener movimientos" });
  }
});

// GET /api/inventory/store/:storeId — get store inventory (stock per product)
router.get("/store/:storeId", requireAuth, requireRole("ADMIN", "SELLER"), async (req, res) => {
  try {
    const result = await query(
      `SELECT si.*, p.name as product_name, p.barcode, p.price, p.category, p.images, p.status
       FROM store_inventory si
       JOIN skating_products p ON p.id = si.product_id
       WHERE si.store_id = $1
       ORDER BY p.name ASC`,
      [req.params.storeId]
    );
    res.json(result.rows.map(row => ({
      ...row,
      price: row.price != null ? parseFloat(row.price) : 0,
      stock: row.stock != null ? parseInt(row.stock) : 0,
    })));
  } catch (err) {
    res.status(500).json({ error: "Error al obtener inventario de tienda" });
  }
});

// POST /api/inventory — add movement + update stock (now store-aware)
router.post("/", requireAuth, requireRole("ADMIN", "SELLER"), async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { product_id, quantity_change, movement_type, reason, store_id } = req.body;

    const result = await withTransaction(async (client) => {
      // Update global stock on skating_products
      await client.query(
        "UPDATE skating_products SET stock = stock + $2, updated_at = NOW() WHERE id = $1",
        [product_id, quantity_change]
      );

      // Update store-level stock if store_id provided
      if (store_id) {
        await client.query(
          `INSERT INTO store_inventory (store_id, product_id, stock)
           VALUES ($1, $2, GREATEST(0, $3))
           ON CONFLICT (store_id, product_id)
           DO UPDATE SET stock = GREATEST(0, store_inventory.stock + $3), updated_at = NOW()`,
          [store_id, product_id, quantity_change]
        );
      }

      // Record movement with store_id
      const mov = await client.query(
        "INSERT INTO inventory_movements (product_id, user_id, quantity_change, movement_type, reason, store_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
        [product_id, userId, quantity_change, movement_type, reason, store_id || null]
      );

      return mov.rows[0];
    });

    res.status(201).json(result);
  } catch (err) {
    console.error("Inventory movement error:", err);
    res.status(500).json({ error: "Error al registrar movimiento" });
  }
});

// POST /api/inventory/transfer — transfer stock between stores
router.post("/transfer", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { product_id, from_store_id, to_store_id, quantity, reason } = req.body;

    if (!product_id || !from_store_id || !to_store_id || !quantity || quantity <= 0) {
      res.status(400).json({ error: "Datos incompletos para la transferencia" });
      return;
    }

    const result = await withTransaction(async (client) => {
      // Check source store has enough stock
      const sourceStock = await client.query(
        "SELECT stock FROM store_inventory WHERE store_id = $1 AND product_id = $2",
        [from_store_id, product_id]
      );
      const currentStock = sourceStock.rows[0]?.stock || 0;
      if (currentStock < quantity) {
        throw new Error(`Stock insuficiente en tienda origen. Disponible: ${currentStock}`);
      }

      // Decrease source store stock
      await client.query(
        `UPDATE store_inventory SET stock = stock - $3, updated_at = NOW()
         WHERE store_id = $1 AND product_id = $2`,
        [from_store_id, product_id, quantity]
      );

      // Increase destination store stock
      await client.query(
        `INSERT INTO store_inventory (store_id, product_id, stock)
         VALUES ($1, $2, $3)
         ON CONFLICT (store_id, product_id)
         DO UPDATE SET stock = store_inventory.stock + $3, updated_at = NOW()`,
        [to_store_id, product_id, quantity]
      );

      // Record outgoing movement
      await client.query(
        "INSERT INTO inventory_movements (product_id, user_id, quantity_change, movement_type, reason, store_id) VALUES ($1,$2,$3,$4,$5,$6)",
        [product_id, userId, -quantity, 'out', reason || `Transferencia a otra tienda`, from_store_id]
      );

      // Record incoming movement
      const mov = await client.query(
        "INSERT INTO inventory_movements (product_id, user_id, quantity_change, movement_type, reason, store_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
        [product_id, userId, quantity, 'in', reason || `Transferencia desde otra tienda`, to_store_id]
      );

      return mov.rows[0];
    });

    res.status(201).json(result);
  } catch (err: any) {
    console.error("Transfer error:", err);
    res.status(400).json({ error: err.message || "Error al transferir inventario" });
  }
});

export default router;
