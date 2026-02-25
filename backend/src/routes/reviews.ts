import { Router } from "express";
import { query } from "../db/pool.js";
import { requireAuth } from "../lib/auth.js";
import { validate, createReviewSchema } from "../lib/validators.js";
import { sanitize } from "../lib/sanitize.js";

const router = Router();

// GET /api/reviews/:productId
router.get("/:productId", async (req, res) => {
  try {
    const result = await query(
      "SELECT * FROM skating_product_reviews WHERE product_id = $1 ORDER BY created_at DESC",
      [req.params.productId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener reseñas" });
  }
});

// POST /api/reviews (validated + sanitized)
router.post("/", requireAuth, validate(createReviewSchema), async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { product_id, user_name, rating, comment } = req.body;
    const result = await query(
      "INSERT INTO skating_product_reviews (product_id, user_id, user_name, rating, comment) VALUES ($1,$2,$3,$4,$5) RETURNING *",
      [product_id, userId, sanitize(user_name), rating, comment ? sanitize(comment) : null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error al crear reseña" });
  }
});

export default router;
