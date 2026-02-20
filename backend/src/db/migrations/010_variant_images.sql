-- Add variant_images column to skating_products
-- Maps variant name (e.g. color name) to an image URL
ALTER TABLE skating_products ADD COLUMN IF NOT EXISTS variant_images JSONB DEFAULT '{}';
