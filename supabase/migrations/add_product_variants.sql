-- Add variant support to products
ALTER TABLE skating_products 
ADD COLUMN IF NOT EXISTS variant_type VARCHAR(50) DEFAULT 'none', -- 'none', 'size', 'measurement'
ADD COLUMN IF NOT EXISTS variant_options TEXT[] DEFAULT '{}';
