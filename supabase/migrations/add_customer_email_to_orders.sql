-- Add customer_email to orders
ALTER TABLE skating_orders ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);
