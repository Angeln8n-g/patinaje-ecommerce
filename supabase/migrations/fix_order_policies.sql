-- Update policy for inserting orders
-- We need to allow authenticated users to insert orders if they assign themselves as the owner
DROP POLICY IF EXISTS "Anyone can create orders" ON skating_orders;

CREATE POLICY "Users can create their own orders" 
  ON skating_orders FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id
  );

-- Keep public read for now or update it? 
-- The previous delivery_schema.sql added "Users can view own orders", but we might need to be careful with existing policies.
-- Let's ensure Admins can see all orders too.

CREATE POLICY "Admins can view all orders" 
  ON skating_orders FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

-- Also ensure Admins can update orders (e.g. status)
CREATE POLICY "Admins can update all orders" 
  ON skating_orders FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );
