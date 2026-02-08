-- Add delivery destination coordinates to orders
ALTER TABLE skating_orders ADD COLUMN IF NOT EXISTS customer_lat DECIMAL(10, 8);
ALTER TABLE skating_orders ADD COLUMN IF NOT EXISTS customer_lng DECIMAL(11, 8);
