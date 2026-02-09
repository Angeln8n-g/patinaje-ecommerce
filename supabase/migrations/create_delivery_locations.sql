-- Create delivery_locations table for storing the last known location of each delivery person
-- Each delivery person has exactly one record (UNIQUE on delivery_man_id), updated via upsert

CREATE TABLE IF NOT EXISTS delivery_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_man_id UUID REFERENCES profiles(id) NOT NULL UNIQUE,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE delivery_locations ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Admins can read all delivery locations (needed for admin map and nearest delivery man assignment)
CREATE POLICY "Admins can read all delivery locations"
  ON delivery_locations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

-- Delivery users can read all delivery locations (needed for shared visibility)
CREATE POLICY "Delivery users can read all delivery locations"
  ON delivery_locations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'DELIVERY'
    )
  );

-- Delivery users can insert their own location
CREATE POLICY "Delivery users can insert own location"
  ON delivery_locations FOR INSERT
  WITH CHECK (
    delivery_man_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'DELIVERY'
    )
  );

-- Delivery users can update their own location
CREATE POLICY "Delivery users can update own location"
  ON delivery_locations FOR UPDATE
  USING (
    delivery_man_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'DELIVERY'
    )
  );

-- Enable Supabase Realtime for delivery_locations (needed for real-time location tracking on admin map)
ALTER PUBLICATION supabase_realtime ADD TABLE delivery_locations;
