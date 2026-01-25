-- Add user_id to orders if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skating_orders' AND column_name = 'user_id') THEN
        ALTER TABLE skating_orders ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Update profiles role check to include DELIVERY
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('USER', 'ADMIN', 'DELIVERY'));

-- Create shipments table
CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES skating_orders(id) NOT NULL,
  delivery_man_id UUID REFERENCES profiles(id),
  status VARCHAR(50) DEFAULT 'ASIGNADO' CHECK (status IN ('ASIGNADO', 'EN_RUTA', 'CERCA', 'ENTREGADO')),
  current_lat DECIMAL(10, 8),
  current_lng DECIMAL(11, 8),
  estimated_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;

-- Policies for shipments

-- Admin can do everything
DROP POLICY IF EXISTS "Admins can manage shipments" ON shipments;
CREATE POLICY "Admins can manage shipments"
  ON shipments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

-- Delivery men can view assigned shipments
DROP POLICY IF EXISTS "Delivery men can view assigned shipments" ON shipments;
CREATE POLICY "Delivery men can view assigned shipments"
  ON shipments FOR SELECT
  USING (
    auth.uid() = delivery_man_id
  );

-- Delivery men can update assigned shipments
DROP POLICY IF EXISTS "Delivery men can update assigned shipments" ON shipments;
CREATE POLICY "Delivery men can update assigned shipments"
  ON shipments FOR UPDATE
  USING (
    auth.uid() = delivery_man_id
  );

-- Customers can view shipments for their orders
DROP POLICY IF EXISTS "Customers can view their order shipments" ON shipments;
CREATE POLICY "Customers can view their order shipments"
  ON shipments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM skating_orders
      WHERE skating_orders.id = shipments.order_id
      AND skating_orders.user_id = auth.uid()
    )
  );

-- Update orders policies to allow users to view their own orders
DROP POLICY IF EXISTS "Users can view own orders" ON skating_orders;
CREATE POLICY "Users can view own orders"
  ON skating_orders FOR SELECT
  USING (
    auth.uid() = user_id
  );
