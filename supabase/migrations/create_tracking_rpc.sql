
-- Function to get tracking info publicly securely
CREATE OR REPLACE FUNCTION get_tracking_info(p_order_id UUID)
RETURNS TABLE (
  id UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR,
  total NUMERIC,
  items JSONB,
  payment_method VARCHAR,
  payment_status VARCHAR,
  qr_token UUID,
  customer_name VARCHAR,
  customer_city VARCHAR,
  customer_address TEXT,
  customer_postal_code VARCHAR,
  customer_phone VARCHAR,
  customer_email VARCHAR,
  shipment_status VARCHAR,
  delivery_man_id UUID,
  current_lat FLOAT,
  current_lng FLOAT
) 
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.created_at,
    o.status,
    o.total,
    o.items,
    o.payment_method,
    o.payment_status,
    o.qr_token,
    o.customer_name,
    o.customer_city,
    o.customer_address,
    o.customer_postal_code,
    o.customer_phone,
    o.customer_email,
    CAST(s.status AS VARCHAR) as shipment_status,
    s.delivery_man_id,
    s.current_lat,
    s.current_lng
  FROM skating_orders o
  LEFT JOIN shipments s ON s.order_id = o.id
  WHERE o.id = p_order_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION get_tracking_info(UUID) TO anon, authenticated;
