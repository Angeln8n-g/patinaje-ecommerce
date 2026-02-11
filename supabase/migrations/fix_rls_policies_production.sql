-- ============================================================
-- Fix RLS policies for production
-- Ensures all tables used by admin/seller have proper policies
-- ============================================================

-- ==========================================
-- skating_products: Ensure public SELECT
-- ==========================================
DROP POLICY IF EXISTS "Products are viewable by everyone" ON skating_products;
DROP POLICY IF EXISTS "Public read access for products" ON skating_products;
CREATE POLICY "Products are viewable by everyone"
  ON skating_products FOR SELECT
  USING (true);

-- ==========================================
-- skating_orders: Ensure admin can read all
-- ==========================================
DROP POLICY IF EXISTS "Admins can view all orders" ON skating_orders;
CREATE POLICY "Admins can view all orders"
  ON skating_orders FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

DROP POLICY IF EXISTS "Admins can update all orders" ON skating_orders;
CREATE POLICY "Admins can update all orders"
  ON skating_orders FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Users can view their own orders
DROP POLICY IF EXISTS "Users can view own orders" ON skating_orders;
CREATE POLICY "Users can view own orders"
  ON skating_orders FOR SELECT
  USING (auth.uid() = user_id);

-- ==========================================
-- profiles: Ensure proper access
-- ==========================================
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ==========================================
-- inventory_movements: Admin and seller access
-- ==========================================
DROP POLICY IF EXISTS "Admins can view all movements" ON inventory_movements;
CREATE POLICY "Admins can view all movements"
  ON inventory_movements FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

DROP POLICY IF EXISTS "Admins can insert movements" ON inventory_movements;
CREATE POLICY "Admins can insert movements"
  ON inventory_movements FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ==========================================
-- pos_sessions: Ensure admin full access
-- ==========================================
DROP POLICY IF EXISTS "Admins can view all sessions" ON pos_sessions;
CREATE POLICY "Admins can view all sessions"
  ON pos_sessions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ==========================================
-- categories: Public read
-- ==========================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'categories') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Categories are viewable by everyone" ON categories';
    EXECUTE 'CREATE POLICY "Categories are viewable by everyone" ON categories FOR SELECT USING (true)';
  END IF;
END $$;

-- ==========================================
-- banners: Public read
-- ==========================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'banners') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Banners are viewable by everyone" ON banners';
    EXECUTE 'CREATE POLICY "Banners are viewable by everyone" ON banners FOR SELECT USING (true)';
  END IF;
END $$;
