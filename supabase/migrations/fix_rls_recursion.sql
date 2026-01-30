-- Fix infinite recursion in RLS policies between skating_orders and shipments

-- 1. Drop the problematic policies
DROP POLICY IF EXISTS "Delivery men can view their assigned orders" ON skating_orders;
DROP POLICY IF EXISTS "Delivery men can update their assigned orders" ON skating_orders;
DROP POLICY IF EXISTS "Customers can view their order shipments" ON shipments;

-- 2. Redefine shipments policy for customers to avoid recursion
-- We use a subquery that doesn't trigger the SELECT policy of skating_orders recursively
CREATE POLICY "Customers can view their order shipments"
  ON shipments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM skating_orders
      WHERE skating_orders.id = shipments.order_id
      AND skating_orders.user_id = auth.uid()
    )
  );
-- Wait, the above is what we had. To avoid recursion, we can use a non-RLS check if possible 
-- or ensure the other side doesn't call back.

-- 3. Redefine skating_orders policy for delivery men
-- Instead of EXISTS, we use a join-like check
CREATE POLICY "Delivery men can view their assigned orders" 
  ON skating_orders FOR SELECT 
  USING (
    id IN (
      SELECT order_id FROM shipments 
      WHERE delivery_man_id = auth.uid()
    )
  );

CREATE POLICY "Delivery men can update their assigned orders" 
  ON skating_orders FOR UPDATE
  USING (
    id IN (
      SELECT order_id FROM shipments 
      WHERE delivery_man_id = auth.uid()
    )
  )
  WITH CHECK (
    id IN (
      SELECT order_id FROM shipments 
      WHERE delivery_man_id = auth.uid()
    )
  );

-- 4. To fully break the recursion, we need to ensure shipments SELECT policy 
-- for delivery men is simple (which it is: auth.uid() = delivery_man_id)
-- And for customers, we can make it more direct if we know the user_id is in the order.

-- If the recursion persists, it's because both tables have policies that query each other.
-- Let's make the shipment visibility for customers more direct by ensuring we don't 
-- trigger the skating_orders SELECT policy. 

-- In PostgreSQL, RLS policies are not applied to the table when queried from inside 
-- a policy of the SAME table, but they ARE applied when querying ANOTHER table.

-- So:
-- skating_orders policy queries shipments -> triggers shipments RLS
-- shipments policy queries skating_orders -> triggers skating_orders RLS -> RECURSION!

-- FIX: Make one of the policies NOT query the other table.
-- We can do this by adding user_id to shipments table or by using a security definer function.

-- Let's add order_user_id to shipments to avoid the join in the policy.
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS order_user_id UUID;

-- Update existing shipments
UPDATE shipments 
SET order_user_id = (SELECT user_id FROM skating_orders WHERE skating_orders.id = shipments.order_id);

-- Now redefine the customer policy for shipments without querying skating_orders
DROP POLICY IF EXISTS "Customers can view their order shipments" ON shipments;
CREATE POLICY "Customers can view their order shipments"
  ON shipments FOR SELECT
  USING (
    auth.uid() = order_user_id
  );

-- Also, update the insert/update logic for shipments to include order_user_id
-- (This would be in the application code or a trigger)

-- Let's add a trigger to keep order_user_id in sync
CREATE OR REPLACE FUNCTION sync_shipment_user_id()
RETURNS TRIGGER AS $$
BEGIN
  SELECT user_id INTO NEW.order_user_id FROM skating_orders WHERE id = NEW.order_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sync_shipment_user_id ON shipments;
CREATE TRIGGER tr_sync_shipment_user_id
BEFORE INSERT OR UPDATE OF order_id ON shipments
FOR EACH ROW EXECUTE FUNCTION sync_shipment_user_id();
