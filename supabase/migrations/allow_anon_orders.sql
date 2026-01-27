-- Allow anonymous orders
DROP POLICY IF EXISTS "Users can create their own orders" ON skating_orders;

CREATE POLICY "Users can create their own orders or anon orders" 
  ON skating_orders FOR INSERT 
  TO public
  WITH CHECK (
    (auth.uid() = user_id) OR (user_id IS NULL)
  );

-- Ensure permissions are granted
GRANT INSERT ON skating_orders TO anon;
GRANT INSERT ON skating_orders TO authenticated;
