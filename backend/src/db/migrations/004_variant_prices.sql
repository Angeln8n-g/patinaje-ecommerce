-- Add variant_prices column to skating_products
-- Stores a JSON object mapping variant option -> price, e.g. {"42": 59.99, "43": 64.99}
ALTER TABLE skating_products ADD COLUMN IF NOT EXISTS variant_prices JSONB DEFAULT '{}';
