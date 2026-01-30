-- Add payment fields to skating_orders
ALTER TABLE skating_orders 
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'card',
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS qr_token UUID DEFAULT gen_random_uuid();

-- Update existing orders to have a qr_token if they don't
UPDATE skating_orders SET qr_token = gen_random_uuid() WHERE qr_token IS NULL;

-- Create a policy to allow delivery men to update order payment status if they have the correct qr_token
-- This is a bit complex for a single policy, so we'll handle the validation in the RPC or server action, 
-- but we need to ensure delivery men can at least see the orders they are delivering.

-- Ensure delivery men can view orders they are assigned to through the shipments table
CREATE POLICY "Delivery men can view their assigned orders" 
  ON skating_orders FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM shipments 
      WHERE shipments.order_id = skating_orders.id 
      AND shipments.delivery_man_id = auth.uid()
    )
  );

-- Allow delivery men to update payment_status and status of their assigned orders
CREATE POLICY "Delivery men can update their assigned orders" 
  ON skating_orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM shipments 
      WHERE shipments.order_id = skating_orders.id 
      AND shipments.delivery_man_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shipments 
      WHERE shipments.order_id = skating_orders.id 
      AND shipments.delivery_man_id = auth.uid()
    )
  );
