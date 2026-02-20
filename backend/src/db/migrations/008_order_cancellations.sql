-- Migration 008: Order Cancellations
-- Creates the order_cancellations table and adds 'CANCELADO' status to shipments

CREATE TABLE IF NOT EXISTS order_cancellations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES skating_orders(id) ON DELETE CASCADE,
  cancelled_by UUID NOT NULL REFERENCES profiles(id),
  cancelled_by_role VARCHAR(20) NOT NULL CHECK (cancelled_by_role IN ('USER', 'DELIVERY', 'SELLER', 'ADMIN')),
  reason_code VARCHAR(50) NOT NULL,
  reason_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_cancellations_order ON order_cancellations(order_id);
CREATE INDEX IF NOT EXISTS idx_order_cancellations_role ON order_cancellations(cancelled_by_role);
CREATE INDEX IF NOT EXISTS idx_order_cancellations_date ON order_cancellations(created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_order_cancellations_unique_order ON order_cancellations(order_id);

ALTER TABLE shipments DROP CONSTRAINT IF EXISTS shipments_status_check;
ALTER TABLE shipments ADD CONSTRAINT shipments_status_check 
  CHECK (status IN ('ASIGNADO', 'EN_RUTA', 'CERCA', 'ENTREGADO', 'CANCELADO'));
