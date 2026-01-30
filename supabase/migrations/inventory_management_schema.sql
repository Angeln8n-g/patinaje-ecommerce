-- Add inventory fields to skating_products
ALTER TABLE skating_products 
ADD COLUMN IF NOT EXISTS barcode VARCHAR(100) UNIQUE,
ADD COLUMN IF NOT EXISTS unit_type VARCHAR(20) DEFAULT 'unit',
ADD COLUMN IF NOT EXISTS supplier VARCHAR(255),
ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS subcategory VARCHAR(100);

-- Create inventory_movements table
CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES skating_products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  quantity_change INTEGER NOT NULL,
  movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment')),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for inventory_movements
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- Policies for inventory_movements
CREATE POLICY "Admins can view all movements" 
  ON inventory_movements FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can insert movements" 
  ON inventory_movements FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'ADMIN'
    )
  );

-- Update skating_products policies to allow admins to manage all fields
DROP POLICY IF EXISTS "Admins can manage products" ON skating_products;
CREATE POLICY "Admins can manage products" 
  ON skating_products FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'ADMIN'
    )
  );
