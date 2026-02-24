-- ============================================================
-- 012: Store-level shipping configuration
-- ============================================================

-- Add shipping config as JSONB to stores (per-store pricing)
ALTER TABLE stores ADD COLUMN IF NOT EXISTS shipping_config JSONB DEFAULT NULL;
