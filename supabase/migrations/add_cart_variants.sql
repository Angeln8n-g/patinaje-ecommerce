-- Add variant support to cart items
ALTER TABLE cart_items 
ADD COLUMN IF NOT EXISTS selected_variant VARCHAR(50);
