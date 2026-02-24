-- ============================================================
-- 011: Multi-store support
-- ============================================================

-- ==========================================
-- stores
-- ==========================================
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address TEXT,
  lat DECIMAL(10,8),
  lng DECIMAL(11,8),
  color VARCHAR(7) NOT NULL DEFAULT '#3b82f6',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- store_sellers (many-to-many: stores ↔ sellers)
-- ==========================================
CREATE TABLE IF NOT EXISTS store_sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, seller_id)
);

-- ==========================================
-- store_delivery_zones (many-to-many: stores ↔ delivery_zones)
-- ==========================================
CREATE TABLE IF NOT EXISTS store_delivery_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES delivery_zones(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, zone_id)
);

-- Add store_id to orders
ALTER TABLE skating_orders ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);

-- Add color to delivery_zones
ALTER TABLE delivery_zones ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#3b82f6';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_store_sellers_store ON store_sellers(store_id);
CREATE INDEX IF NOT EXISTS idx_store_sellers_seller ON store_sellers(seller_id);
CREATE INDEX IF NOT EXISTS idx_store_delivery_zones_store ON store_delivery_zones(store_id);
CREATE INDEX IF NOT EXISTS idx_store_delivery_zones_zone ON store_delivery_zones(zone_id);
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON skating_orders(store_id);
