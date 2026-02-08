-- Add destination coordinates to shipments for proximity detection
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS destination_lat DECIMAL(10, 8);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS destination_lng DECIMAL(11, 8);
