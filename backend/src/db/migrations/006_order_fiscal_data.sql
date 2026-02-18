-- Add fiscal_data column to skating_orders for storing fiscal invoice data
ALTER TABLE skating_orders ADD COLUMN IF NOT EXISTS fiscal_data JSONB DEFAULT NULL;
