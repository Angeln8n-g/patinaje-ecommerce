DO $$ 
BEGIN
    -- Drop existing policies to ensure clean slate (avoiding "already exists" errors)
    DROP POLICY IF EXISTS "Users can view own cart" ON carts;
    DROP POLICY IF EXISTS "Users can create own cart" ON carts;
    DROP POLICY IF EXISTS "Users can view own cart items" ON cart_items;
    DROP POLICY IF EXISTS "Users can insert own cart items" ON cart_items;
    DROP POLICY IF EXISTS "Users can update own cart items" ON cart_items;
    DROP POLICY IF EXISTS "Users can delete own cart items" ON cart_items;
END $$;

-- Re-create policies
CREATE POLICY "Users can view own cart" 
  ON carts FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own cart" 
  ON carts FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own cart items" 
  ON cart_items FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM carts 
      WHERE carts.id = cart_items.cart_id 
      AND carts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own cart items" 
  ON cart_items FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM carts 
      WHERE carts.id = cart_items.cart_id 
      AND carts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own cart items" 
  ON cart_items FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM carts 
      WHERE carts.id = cart_items.cart_id 
      AND carts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own cart items" 
  ON cart_items FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM carts 
      WHERE carts.id = cart_items.cart_id 
      AND carts.user_id = auth.uid()
    )
  );
