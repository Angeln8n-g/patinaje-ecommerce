-- ============================================================
-- Fix infinite recursion in profiles RLS policies
-- The problem: policies on "profiles" that SELECT from "profiles"
-- to check role cause infinite recursion.
-- Solution: Use auth.jwt() to read role from JWT metadata,
-- or use a simple auth.uid() = id check.
-- ============================================================

-- Drop ALL existing policies on profiles to start clean
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
  END LOOP;
END $$;

-- Users can read their own profile (no recursion)
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Service role / admin bypass: allow reading all profiles
-- for admin checks in OTHER tables' policies.
-- We use a security definer function to avoid recursion.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- Admins can view all profiles (uses function, no recursion)
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (public.get_my_role() = 'ADMIN');

-- Admins can update all profiles
CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (public.get_my_role() = 'ADMIN');

-- Now fix OTHER tables that reference profiles directly in policies
-- Replace EXISTS(SELECT 1 FROM profiles WHERE ...) with get_my_role()

-- ==========================================
-- skating_products
-- ==========================================
DROP POLICY IF EXISTS "Admins can insert products" ON skating_products;
CREATE POLICY "Admins can insert products"
  ON skating_products FOR INSERT
  WITH CHECK (public.get_my_role() = 'ADMIN');

DROP POLICY IF EXISTS "Admins can update products" ON skating_products;
CREATE POLICY "Admins can update products"
  ON skating_products FOR UPDATE
  USING (public.get_my_role() = 'ADMIN');

DROP POLICY IF EXISTS "Admins can delete products" ON skating_products;
CREATE POLICY "Admins can delete products"
  ON skating_products FOR DELETE
  USING (public.get_my_role() = 'ADMIN');

DROP POLICY IF EXISTS "Admins can manage products" ON skating_products;

DROP POLICY IF EXISTS "Sellers can update products" ON skating_products;
CREATE POLICY "Sellers can update products"
  ON skating_products FOR UPDATE
  USING (public.get_my_role() = 'SELLER');

-- ==========================================
-- skating_orders
-- ==========================================
DROP POLICY IF EXISTS "Admins can view all orders" ON skating_orders;
CREATE POLICY "Admins can view all orders"
  ON skating_orders FOR SELECT
  USING (public.get_my_role() = 'ADMIN');

DROP POLICY IF EXISTS "Admins can update all orders" ON skating_orders;
CREATE POLICY "Admins can update all orders"
  ON skating_orders FOR UPDATE
  USING (public.get_my_role() = 'ADMIN');

DROP POLICY IF EXISTS "Sellers can create orders" ON skating_orders;
CREATE POLICY "Sellers can create orders"
  ON skating_orders FOR INSERT
  WITH CHECK (public.get_my_role() = 'SELLER');

DROP POLICY IF EXISTS "Sellers can view assigned orders" ON skating_orders;
CREATE POLICY "Sellers can view assigned orders"
  ON skating_orders FOR SELECT
  USING (seller_id = auth.uid());

DROP POLICY IF EXISTS "Sellers can update assigned orders" ON skating_orders;
CREATE POLICY "Sellers can update assigned orders"
  ON skating_orders FOR UPDATE
  USING (seller_id = auth.uid());

-- ==========================================
-- pos_sessions
-- ==========================================
DROP POLICY IF EXISTS "Admins can view all sessions" ON pos_sessions;
CREATE POLICY "Admins can view all sessions"
  ON pos_sessions FOR SELECT
  USING (public.get_my_role() = 'ADMIN');

DROP POLICY IF EXISTS "Sellers can view own sessions" ON pos_sessions;
CREATE POLICY "Sellers can view own sessions"
  ON pos_sessions FOR SELECT
  USING (auth.uid() = seller_id);

DROP POLICY IF EXISTS "Sellers can create sessions" ON pos_sessions;
CREATE POLICY "Sellers can create sessions"
  ON pos_sessions FOR INSERT
  WITH CHECK (auth.uid() = seller_id AND public.get_my_role() = 'SELLER');

DROP POLICY IF EXISTS "Sellers can update own sessions" ON pos_sessions;
CREATE POLICY "Sellers can update own sessions"
  ON pos_sessions FOR UPDATE
  USING (auth.uid() = seller_id);

-- ==========================================
-- inventory_movements
-- ==========================================
DROP POLICY IF EXISTS "Admins can view all movements" ON inventory_movements;
CREATE POLICY "Admins can view all movements"
  ON inventory_movements FOR SELECT
  USING (public.get_my_role() = 'ADMIN');

DROP POLICY IF EXISTS "Admins can insert movements" ON inventory_movements;
CREATE POLICY "Admins can insert movements"
  ON inventory_movements FOR INSERT
  WITH CHECK (public.get_my_role() = 'ADMIN');

DROP POLICY IF EXISTS "Sellers can insert movements" ON inventory_movements;
CREATE POLICY "Sellers can insert movements"
  ON inventory_movements FOR INSERT
  WITH CHECK (public.get_my_role() = 'SELLER');

-- ==========================================
-- categories
-- ==========================================
DROP POLICY IF EXISTS "Admins can manage categories" ON categories;
CREATE POLICY "Admins can manage categories"
  ON categories FOR ALL
  USING (public.get_my_role() = 'ADMIN');

-- Ensure public read for categories
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON categories;
CREATE POLICY "Categories are viewable by everyone"
  ON categories FOR SELECT
  USING (true);

-- Ensure public read for products
DROP POLICY IF EXISTS "Products are viewable by everyone" ON skating_products;
CREATE POLICY "Products are viewable by everyone"
  ON skating_products FOR SELECT
  USING (true);

-- ==========================================
-- banners
-- ==========================================
DROP POLICY IF EXISTS "Admins can view all banners" ON banners;
CREATE POLICY "Admins can view all banners"
  ON banners FOR SELECT
  USING (public.get_my_role() = 'ADMIN');

DROP POLICY IF EXISTS "Admins can manage banners" ON banners;
CREATE POLICY "Admins can manage banners"
  ON banners FOR ALL
  USING (public.get_my_role() = 'ADMIN');

-- Keep public read for active banners
DROP POLICY IF EXISTS "Active banners are viewable by everyone" ON banners;
CREATE POLICY "Active banners are viewable by everyone"
  ON banners FOR SELECT
  USING (active = true);

DROP POLICY IF EXISTS "Banners are viewable by everyone" ON banners;
CREATE POLICY "Banners are viewable by everyone"
  ON banners FOR SELECT
  USING (true);

-- ==========================================
-- promo_text_banners
-- ==========================================
DROP POLICY IF EXISTS "Admin full access" ON promo_text_banners;
CREATE POLICY "Admin full access"
  ON promo_text_banners FOR ALL
  USING (public.get_my_role() = 'ADMIN');

DROP POLICY IF EXISTS "Public read access" ON promo_text_banners;
CREATE POLICY "Public read access"
  ON promo_text_banners FOR SELECT
  USING (true);

-- ==========================================
-- static_content
-- ==========================================
DROP POLICY IF EXISTS "Admin full access" ON static_content;
CREATE POLICY "Admin full access"
  ON static_content FOR ALL
  USING (public.get_my_role() = 'ADMIN');

DROP POLICY IF EXISTS "Public read access" ON static_content;
CREATE POLICY "Public read access"
  ON static_content FOR SELECT
  USING (true);

-- ==========================================
-- delivery_ratings
-- ==========================================
DROP POLICY IF EXISTS "Admins can view all ratings" ON delivery_ratings;
CREATE POLICY "Admins can view all ratings"
  ON delivery_ratings FOR SELECT
  USING (public.get_my_role() = 'ADMIN');
