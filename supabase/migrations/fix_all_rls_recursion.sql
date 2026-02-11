-- ============================================================
-- NUCLEAR FIX: Resolve ALL infinite recursion in RLS policies
-- 
-- Problem: Any policy that does SELECT FROM profiles to check
-- role causes infinite recursion because profiles itself has RLS.
--
-- Solution: SECURITY DEFINER function get_my_role() bypasses RLS
-- on profiles table, breaking the recursion chain.
-- ============================================================

-- Step 1: Create the helper function FIRST
-- This function runs with definer privileges, bypassing RLS on profiles
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- ============================================================
-- Step 2: Fix PROFILES table (the root cause)
-- ============================================================
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
  END LOOP;
END $$;

-- Simple non-recursive policies for profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (public.get_my_role() = 'ADMIN');

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (public.get_my_role() = 'ADMIN');

-- ============================================================
-- Step 3: Fix ALL other tables
-- Pattern: DROP old recursive policy, CREATE new one using get_my_role()
-- ============================================================

-- ==========================================
-- skating_products
-- ==========================================
DROP POLICY IF EXISTS "Admins can manage products" ON skating_products;
DROP POLICY IF EXISTS "Admins can insert products" ON skating_products;
DROP POLICY IF EXISTS "Admins can update products" ON skating_products;
DROP POLICY IF EXISTS "Admins can delete products" ON skating_products;
DROP POLICY IF EXISTS "Sellers can update products" ON skating_products;
DROP POLICY IF EXISTS "Products are viewable by everyone" ON skating_products;

CREATE POLICY "Products are viewable by everyone"
  ON skating_products FOR SELECT USING (true);

CREATE POLICY "Admins can insert products"
  ON skating_products FOR INSERT
  WITH CHECK (public.get_my_role() = 'ADMIN');

CREATE POLICY "Admins can update products"
  ON skating_products FOR UPDATE
  USING (public.get_my_role() = 'ADMIN');

CREATE POLICY "Admins can delete products"
  ON skating_products FOR DELETE
  USING (public.get_my_role() = 'ADMIN');

CREATE POLICY "Sellers can update products"
  ON skating_products FOR UPDATE
  USING (public.get_my_role() = 'SELLER');

-- ==========================================
-- skating_orders
-- ==========================================
DROP POLICY IF EXISTS "Admins can view all orders" ON skating_orders;
DROP POLICY IF EXISTS "Admins can update all orders" ON skating_orders;
DROP POLICY IF EXISTS "Sellers can create orders" ON skating_orders;
DROP POLICY IF EXISTS "Sellers can view assigned orders" ON skating_orders;
DROP POLICY IF EXISTS "Sellers can update assigned orders" ON skating_orders;
-- Keep user policies (they don't reference profiles)

CREATE POLICY "Admins can view all orders"
  ON skating_orders FOR SELECT
  USING (public.get_my_role() = 'ADMIN');

CREATE POLICY "Admins can update all orders"
  ON skating_orders FOR UPDATE
  USING (public.get_my_role() = 'ADMIN');

CREATE POLICY "Sellers can create orders"
  ON skating_orders FOR INSERT
  WITH CHECK (public.get_my_role() = 'SELLER');

CREATE POLICY "Sellers can view assigned orders"
  ON skating_orders FOR SELECT
  USING (seller_id = auth.uid());

CREATE POLICY "Sellers can update assigned orders"
  ON skating_orders FOR UPDATE
  USING (seller_id = auth.uid());

-- ==========================================
-- categories
-- ==========================================
DROP POLICY IF EXISTS "Admins can manage categories" ON categories;
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON categories;

CREATE POLICY "Categories are viewable by everyone"
  ON categories FOR SELECT USING (true);

CREATE POLICY "Admins can manage categories"
  ON categories FOR ALL
  USING (public.get_my_role() = 'ADMIN');

-- ==========================================
-- banners
-- ==========================================
DROP POLICY IF EXISTS "Admins can manage banners" ON banners;
DROP POLICY IF EXISTS "Admins can view all banners" ON banners;
DROP POLICY IF EXISTS "Active banners are viewable by everyone" ON banners;
DROP POLICY IF EXISTS "Banners are viewable by everyone" ON banners;

CREATE POLICY "Banners are viewable by everyone"
  ON banners FOR SELECT USING (true);

CREATE POLICY "Admins can manage banners"
  ON banners FOR ALL
  USING (public.get_my_role() = 'ADMIN');

-- ==========================================
-- promo_text_banners
-- ==========================================
DROP POLICY IF EXISTS "Admin full access" ON promo_text_banners;
DROP POLICY IF EXISTS "Public read access" ON promo_text_banners;

CREATE POLICY "Public read access"
  ON promo_text_banners FOR SELECT USING (true);

CREATE POLICY "Admin full access"
  ON promo_text_banners FOR ALL
  USING (public.get_my_role() = 'ADMIN');

-- ==========================================
-- static_content
-- ==========================================
DROP POLICY IF EXISTS "Admin full access" ON static_content;
DROP POLICY IF EXISTS "Public read access" ON static_content;

CREATE POLICY "Public read access"
  ON static_content FOR SELECT USING (true);

CREATE POLICY "Admin full access"
  ON static_content FOR ALL
  USING (public.get_my_role() = 'ADMIN');

-- ==========================================
-- pos_sessions
-- ==========================================
DROP POLICY IF EXISTS "Admins can view all sessions" ON pos_sessions;
DROP POLICY IF EXISTS "Admin full access for pos_sessions" ON pos_sessions;
DROP POLICY IF EXISTS "Sellers can view own sessions" ON pos_sessions;
DROP POLICY IF EXISTS "Sellers can create sessions" ON pos_sessions;
DROP POLICY IF EXISTS "Sellers can update own sessions" ON pos_sessions;

CREATE POLICY "Admins can view all sessions"
  ON pos_sessions FOR SELECT
  USING (public.get_my_role() = 'ADMIN');

CREATE POLICY "Sellers can view own sessions"
  ON pos_sessions FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can create sessions"
  ON pos_sessions FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update own sessions"
  ON pos_sessions FOR UPDATE
  USING (auth.uid() = seller_id);

-- ==========================================
-- inventory_movements
-- ==========================================
DROP POLICY IF EXISTS "Admins can view all movements" ON inventory_movements;
DROP POLICY IF EXISTS "Admins can insert movements" ON inventory_movements;
DROP POLICY IF EXISTS "Sellers can insert movements" ON inventory_movements;
DROP POLICY IF EXISTS "Admin full access for inventory" ON inventory_movements;

CREATE POLICY "Admins can view all movements"
  ON inventory_movements FOR SELECT
  USING (public.get_my_role() = 'ADMIN');

CREATE POLICY "Admins can insert movements"
  ON inventory_movements FOR INSERT
  WITH CHECK (public.get_my_role() = 'ADMIN');

CREATE POLICY "Sellers can insert movements"
  ON inventory_movements FOR INSERT
  WITH CHECK (public.get_my_role() = 'SELLER');

-- ==========================================
-- shipments
-- ==========================================
DROP POLICY IF EXISTS "Admins can manage shipments" ON shipments;

CREATE POLICY "Admins can manage shipments"
  ON shipments FOR ALL
  USING (public.get_my_role() = 'ADMIN');

-- Keep non-recursive shipment policies (they don't reference profiles)
-- "Delivery men can view/update assigned shipments" use auth.uid() = delivery_man_id (safe)
-- "Customers can view their order shipments" uses skating_orders subquery (safe)

-- ==========================================
-- delivery_zones
-- ==========================================
DROP POLICY IF EXISTS "Admins can insert delivery zones" ON delivery_zones;
DROP POLICY IF EXISTS "Admins can update delivery zones" ON delivery_zones;
DROP POLICY IF EXISTS "Admins can delete delivery zones" ON delivery_zones;
-- Keep "Public read access for delivery zones" (safe, uses true)

CREATE POLICY "Admins can insert delivery zones"
  ON delivery_zones FOR INSERT
  WITH CHECK (public.get_my_role() = 'ADMIN');

CREATE POLICY "Admins can update delivery zones"
  ON delivery_zones FOR UPDATE
  USING (public.get_my_role() = 'ADMIN');

CREATE POLICY "Admins can delete delivery zones"
  ON delivery_zones FOR DELETE
  USING (public.get_my_role() = 'ADMIN');

-- ==========================================
-- delivery_locations
-- ==========================================
DROP POLICY IF EXISTS "Admins can read all delivery locations" ON delivery_locations;
DROP POLICY IF EXISTS "Delivery users can read all delivery locations" ON delivery_locations;
DROP POLICY IF EXISTS "Delivery users can insert own location" ON delivery_locations;
DROP POLICY IF EXISTS "Delivery users can update own location" ON delivery_locations;

CREATE POLICY "Admins can read all delivery locations"
  ON delivery_locations FOR SELECT
  USING (public.get_my_role() = 'ADMIN');

CREATE POLICY "Delivery users can read all delivery locations"
  ON delivery_locations FOR SELECT
  USING (public.get_my_role() = 'DELIVERY');

CREATE POLICY "Delivery users can insert own location"
  ON delivery_locations FOR INSERT
  WITH CHECK (delivery_man_id = auth.uid());

CREATE POLICY "Delivery users can update own location"
  ON delivery_locations FOR UPDATE
  USING (delivery_man_id = auth.uid());

-- ==========================================
-- delivery_ratings
-- ==========================================
DROP POLICY IF EXISTS "Admins can view all ratings" ON delivery_ratings;

CREATE POLICY "Admins can view all ratings"
  ON delivery_ratings FOR SELECT
  USING (public.get_my_role() = 'ADMIN');

-- Keep non-recursive policies:
-- "Users can create ratings for their orders" uses auth.uid() = user_id (safe)
-- "Users can view their own ratings" uses auth.uid() = user_id (safe)
-- "Delivery men can view their own ratings" uses auth.uid() = delivery_man_id (safe)

-- ============================================================
-- DONE. All policies now use get_my_role() instead of
-- EXISTS(SELECT FROM profiles), eliminating recursion.
-- ============================================================
