-- ============================================================
-- DEFINITIVE RLS FIX - Clean slate approach
-- 
-- This script:
-- 1. Creates a SECURITY DEFINER function to check roles without recursion
-- 2. Drops ALL existing policies from ALL app tables
-- 3. Recreates every policy from scratch using the safe function
--
-- Run this ONCE in Supabase SQL Editor. It is idempotent.
-- ============================================================

-- ============================================================
-- STEP 1: Create helper function (SECURITY DEFINER bypasses RLS)
-- ============================================================
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
-- STEP 2: Drop ALL policies from ALL tables dynamically
-- This ensures no leftover recursive policies exist
-- ============================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ============================================================
-- STEP 3: Recreate ALL policies from scratch
-- Rule: NEVER use "EXISTS(SELECT FROM profiles)" in any policy.
-- Always use public.get_my_role() for role checks.
-- ============================================================

-- ==========================================
-- profiles
-- ==========================================
CREATE POLICY "users_select_own_profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "users_update_own_profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "admins_select_all_profiles"
  ON profiles FOR SELECT
  USING (public.get_my_role() = 'ADMIN');

CREATE POLICY "admins_update_all_profiles"
  ON profiles FOR UPDATE
  USING (public.get_my_role() = 'ADMIN');

CREATE POLICY "admins_insert_profiles"
  ON profiles FOR INSERT
  WITH CHECK (public.get_my_role() = 'ADMIN');

-- ==========================================
-- skating_products
-- ==========================================
CREATE POLICY "products_public_read"
  ON skating_products FOR SELECT
  USING (true);

CREATE POLICY "products_admin_insert"
  ON skating_products FOR INSERT
  WITH CHECK (public.get_my_role() = 'ADMIN');

CREATE POLICY "products_admin_update"
  ON skating_products FOR UPDATE
  USING (public.get_my_role() = 'ADMIN');

CREATE POLICY "products_admin_delete"
  ON skating_products FOR DELETE
  USING (public.get_my_role() = 'ADMIN');

CREATE POLICY "products_seller_update"
  ON skating_products FOR UPDATE
  USING (public.get_my_role() = 'SELLER');

-- ==========================================
-- skating_orders
-- ==========================================
CREATE POLICY "orders_public_insert"
  ON skating_orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "orders_user_select_own"
  ON skating_orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "orders_admin_select"
  ON skating_orders FOR SELECT
  USING (public.get_my_role() = 'ADMIN');

CREATE POLICY "orders_admin_update"
  ON skating_orders FOR UPDATE
  USING (public.get_my_role() = 'ADMIN');

CREATE POLICY "orders_admin_delete"
  ON skating_orders FOR DELETE
  USING (public.get_my_role() = 'ADMIN');

CREATE POLICY "orders_seller_insert"
  ON skating_orders FOR INSERT
  WITH CHECK (public.get_my_role() = 'SELLER');

CREATE POLICY "orders_seller_select_assigned"
  ON skating_orders FOR SELECT
  USING (seller_id = auth.uid());

CREATE POLICY "orders_seller_update_assigned"
  ON skating_orders FOR UPDATE
  USING (seller_id = auth.uid());

-- ==========================================
-- categories
-- ==========================================
CREATE POLICY "categories_public_read"
  ON categories FOR SELECT
  USING (true);

CREATE POLICY "categories_admin_all"
  ON categories FOR ALL
  USING (public.get_my_role() = 'ADMIN');

-- ==========================================
-- banners
-- ==========================================
CREATE POLICY "banners_public_read"
  ON banners FOR SELECT
  USING (true);

CREATE POLICY "banners_admin_all"
  ON banners FOR ALL
  USING (public.get_my_role() = 'ADMIN');

-- ==========================================
-- promo_text_banners
-- ==========================================
CREATE POLICY "promo_banners_public_read"
  ON promo_text_banners FOR SELECT
  USING (true);

CREATE POLICY "promo_banners_admin_all"
  ON promo_text_banners FOR ALL
  USING (public.get_my_role() = 'ADMIN');

-- ==========================================
-- static_content
-- ==========================================
CREATE POLICY "static_content_public_read"
  ON static_content FOR SELECT
  USING (true);

CREATE POLICY "static_content_admin_all"
  ON static_content FOR ALL
  USING (public.get_my_role() = 'ADMIN');

-- ==========================================
-- pos_sessions
-- ==========================================
CREATE POLICY "pos_sessions_admin_select"
  ON pos_sessions FOR SELECT
  USING (public.get_my_role() = 'ADMIN');

CREATE POLICY "pos_sessions_seller_select_own"
  ON pos_sessions FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "pos_sessions_seller_insert"
  ON pos_sessions FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "pos_sessions_seller_update_own"
  ON pos_sessions FOR UPDATE
  USING (auth.uid() = seller_id);

-- ==========================================
-- inventory_movements
-- ==========================================
CREATE POLICY "inventory_admin_select"
  ON inventory_movements FOR SELECT
  USING (public.get_my_role() = 'ADMIN');

CREATE POLICY "inventory_admin_insert"
  ON inventory_movements FOR INSERT
  WITH CHECK (public.get_my_role() = 'ADMIN');

CREATE POLICY "inventory_seller_insert"
  ON inventory_movements FOR INSERT
  WITH CHECK (public.get_my_role() = 'SELLER');

-- ==========================================
-- shipments
-- ==========================================
CREATE POLICY "shipments_admin_all"
  ON shipments FOR ALL
  USING (public.get_my_role() = 'ADMIN');

CREATE POLICY "shipments_delivery_select_own"
  ON shipments FOR SELECT
  USING (auth.uid() = delivery_man_id);

CREATE POLICY "shipments_delivery_update_own"
  ON shipments FOR UPDATE
  USING (auth.uid() = delivery_man_id);

CREATE POLICY "shipments_customer_select_own"
  ON shipments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM skating_orders
      WHERE skating_orders.id = shipments.order_id
      AND skating_orders.user_id = auth.uid()
    )
  );

-- ==========================================
-- delivery_zones
-- ==========================================
CREATE POLICY "delivery_zones_public_read"
  ON delivery_zones FOR SELECT
  USING (true);

CREATE POLICY "delivery_zones_admin_insert"
  ON delivery_zones FOR INSERT
  WITH CHECK (public.get_my_role() = 'ADMIN');

CREATE POLICY "delivery_zones_admin_update"
  ON delivery_zones FOR UPDATE
  USING (public.get_my_role() = 'ADMIN');

CREATE POLICY "delivery_zones_admin_delete"
  ON delivery_zones FOR DELETE
  USING (public.get_my_role() = 'ADMIN');

-- ==========================================
-- delivery_locations
-- ==========================================
CREATE POLICY "delivery_locations_admin_select"
  ON delivery_locations FOR SELECT
  USING (public.get_my_role() = 'ADMIN');

CREATE POLICY "delivery_locations_delivery_select"
  ON delivery_locations FOR SELECT
  USING (public.get_my_role() = 'DELIVERY');

CREATE POLICY "delivery_locations_delivery_insert_own"
  ON delivery_locations FOR INSERT
  WITH CHECK (delivery_man_id = auth.uid());

CREATE POLICY "delivery_locations_delivery_update_own"
  ON delivery_locations FOR UPDATE
  USING (delivery_man_id = auth.uid());

-- ==========================================
-- delivery_ratings
-- ==========================================
CREATE POLICY "delivery_ratings_admin_select"
  ON delivery_ratings FOR SELECT
  USING (public.get_my_role() = 'ADMIN');

CREATE POLICY "delivery_ratings_user_insert_own"
  ON delivery_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delivery_ratings_user_select_own"
  ON delivery_ratings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "delivery_ratings_delivery_select_own"
  ON delivery_ratings FOR SELECT
  USING (auth.uid() = delivery_man_id);

-- ==========================================
-- skating_product_reviews
-- ==========================================
CREATE POLICY "reviews_public_read"
  ON skating_product_reviews FOR SELECT
  USING (true);

CREATE POLICY "reviews_authenticated_insert"
  ON skating_product_reviews FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ==========================================
-- skating_contact_messages
-- ==========================================
CREATE POLICY "contact_messages_public_insert"
  ON skating_contact_messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "contact_messages_admin_select"
  ON skating_contact_messages FOR SELECT
  USING (public.get_my_role() = 'ADMIN');

-- ==========================================
-- skating_notifications
-- ==========================================
CREATE POLICY "notifications_user_select_own"
  ON skating_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "notifications_user_update_own"
  ON skating_notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "notifications_admin_all"
  ON skating_notifications FOR ALL
  USING (public.get_my_role() = 'ADMIN');

-- ==========================================
-- skating_invoices
-- ==========================================
CREATE POLICY "invoices_admin_all"
  ON skating_invoices FOR ALL
  USING (public.get_my_role() = 'ADMIN');

CREATE POLICY "invoices_user_select_own"
  ON skating_invoices FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM skating_orders WHERE id = order_id
    )
  );

-- ==========================================
-- favorites
-- ==========================================
CREATE POLICY "favorites_user_select_own"
  ON favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "favorites_user_insert_own"
  ON favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "favorites_user_delete_own"
  ON favorites FOR DELETE
  USING (auth.uid() = user_id);

-- ==========================================
-- carts
-- ==========================================
CREATE POLICY "carts_user_select_own"
  ON carts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "carts_user_insert_own"
  ON carts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "carts_user_update_own"
  ON carts FOR UPDATE
  USING (auth.uid() = user_id);

-- ==========================================
-- cart_items
-- ==========================================
CREATE POLICY "cart_items_user_select_own"
  ON cart_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM carts
      WHERE carts.id = cart_items.cart_id
      AND carts.user_id = auth.uid()
    )
  );

CREATE POLICY "cart_items_user_insert_own"
  ON cart_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM carts
      WHERE carts.id = cart_items.cart_id
      AND carts.user_id = auth.uid()
    )
  );

CREATE POLICY "cart_items_user_update_own"
  ON cart_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM carts
      WHERE carts.id = cart_items.cart_id
      AND carts.user_id = auth.uid()
    )
  );

CREATE POLICY "cart_items_user_delete_own"
  ON cart_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM carts
      WHERE carts.id = cart_items.cart_id
      AND carts.user_id = auth.uid()
    )
  );

-- ============================================================
-- DONE. All RLS policies recreated from scratch.
-- No policy references profiles table directly anymore.
-- All role checks go through public.get_my_role() (SECURITY DEFINER).
-- ============================================================
