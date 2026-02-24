-- ============================================================
-- 013: Store-level inventory separation
-- ============================================================

-- ==========================================
-- store_inventory (per-store stock for each product)
-- ==========================================
CREATE TABLE IF NOT EXISTS store_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES skating_products(id) ON DELETE CASCADE,
  stock INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, product_id)
);

-- Add store_id to inventory_movements for tracking per-store movements
ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_store_inventory_store ON store_inventory(store_id);
CREATE INDEX IF NOT EXISTS idx_store_inventory_product ON store_inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_store_inventory_store_product ON store_inventory(store_id, product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_store ON inventory_movements(store_id);
