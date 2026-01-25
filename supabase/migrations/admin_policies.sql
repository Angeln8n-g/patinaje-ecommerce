-- Add RLS policies for Products table to allow Admin modifications

-- Everyone can read products
CREATE POLICY "Public read access for products" 
  ON skating_products FOR SELECT 
  USING (true);

-- Only admins can insert/update/delete products
-- Note: This assumes we check the profile role. 
-- For simplicity in this demo using ANON key on server actions, we might need to be careful.
-- Ideally, we use Service Role Key for admin actions, bypassing RLS.
-- But if we stick to RLS:

CREATE POLICY "Admins can insert products" 
  ON skating_products FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can update products" 
  ON skating_products FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can delete products" 
  ON skating_products FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'ADMIN'
    )
  );
