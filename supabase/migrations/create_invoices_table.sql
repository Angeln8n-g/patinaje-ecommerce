-- Invoices table
CREATE TABLE IF NOT EXISTS skating_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES skating_orders(id) ON DELETE CASCADE,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'sent', -- sent, cancelled
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE skating_invoices ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Invoices are viewable by admins" 
  ON skating_invoices FOR SELECT 
  USING (auth.jwt() ->> 'email' IN (SELECT email FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'));

CREATE POLICY "Users can view their own invoices" 
  ON skating_invoices FOR SELECT 
  USING (auth.uid() IN (SELECT user_id FROM skating_orders WHERE id = order_id));
