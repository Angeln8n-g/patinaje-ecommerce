-- Create delivery_zones table for storing delivery area polygons
-- Each zone has a name, a JSONB polygon (array of {lat, lng} vertices), and an active status

CREATE TABLE IF NOT EXISTS delivery_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  polygon JSONB NOT NULL, -- Array de {lat, lng} representando los vértices del polígono
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Public read access: anyone can read delivery zones (needed for checkout zone validation)
CREATE POLICY "Public read access for delivery zones"
  ON delivery_zones FOR SELECT
  USING (true);

-- Only admins can insert delivery zones
CREATE POLICY "Admins can insert delivery zones"
  ON delivery_zones FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

-- Only admins can update delivery zones
CREATE POLICY "Admins can update delivery zones"
  ON delivery_zones FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

-- Only admins can delete delivery zones
CREATE POLICY "Admins can delete delivery zones"
  ON delivery_zones FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );
