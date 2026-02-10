-- ============================================================
-- Migration: Seller POS System
-- Description: Extends the system to support SELLER role,
--   POS sessions, and seller-related order fields.
-- Requirements: 1.1, 2.1, 3.1
-- ============================================================

-- 1. Update profiles role constraint to include SELLER
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('USER', 'ADMIN', 'DELIVERY', 'SELLER'));

-- 2. Add seller-related columns to skating_orders
ALTER TABLE skating_orders
ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS order_type VARCHAR(20) DEFAULT 'online'
  CHECK (order_type IN ('online', 'in_store')),
ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMP WITH TIME ZONE;

-- 3. Create pos_sessions table
CREATE TABLE IF NOT EXISTS pos_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES profiles(id) NOT NULL,
  initial_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  reported_amount DECIMAL(10,2),
  expected_amount DECIMAL(10,2),
  total_sales DECIMAL(10,2) DEFAULT 0,
  total_card_sales DECIMAL(10,2) DEFAULT 0,
  total_cash_sales DECIMAL(10,2) DEFAULT 0,
  transaction_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS for pos_sessions
ALTER TABLE pos_sessions ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for pos_sessions

-- Sellers can view their own sessions
CREATE POLICY "Sellers can view own sessions"
  ON pos_sessions FOR SELECT
  USING (auth.uid() = seller_id);

-- Sellers can create sessions
CREATE POLICY "Sellers can create sessions"
  ON pos_sessions FOR INSERT
  WITH CHECK (
    auth.uid() = seller_id AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'SELLER')
  );

-- Sellers can update their own sessions (close cash session)
CREATE POLICY "Sellers can update own sessions"
  ON pos_sessions FOR UPDATE
  USING (auth.uid() = seller_id);

-- Admins can view all sessions
CREATE POLICY "Admins can view all sessions"
  ON pos_sessions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- 5. RLS Policies for skating_orders (seller-related)

-- Sellers can create orders
CREATE POLICY "Sellers can create orders"
  ON skating_orders FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'SELLER')
  );

-- Sellers can view orders assigned to them
CREATE POLICY "Sellers can view assigned orders"
  ON skating_orders FOR SELECT
  USING (seller_id = auth.uid());

-- Sellers can update orders assigned to them (dispatch)
CREATE POLICY "Sellers can update assigned orders"
  ON skating_orders FOR UPDATE
  USING (seller_id = auth.uid());

-- 6. Allow sellers to insert inventory movements (for POS sales stock deduction)
CREATE POLICY "Sellers can insert movements"
  ON inventory_movements FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'SELLER')
  );

-- Allow sellers to update product stock (for POS sales)
CREATE POLICY "Sellers can update products"
  ON skating_products FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'SELLER')
  );
