-- Products table
CREATE TABLE IF NOT EXISTS skating_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category VARCHAR(50) NOT NULL,
  images TEXT[] DEFAULT '{}',
  stock INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS skating_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name VARCHAR(255) NOT NULL,
  customer_address TEXT NOT NULL,
  customer_city VARCHAR(100) NOT NULL,
  customer_postal_code VARCHAR(20) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  items JSONB NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contact messages table
CREATE TABLE IF NOT EXISTS skating_contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE skating_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE skating_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE skating_contact_messages ENABLE ROW LEVEL SECURITY;

-- Public read access for products
CREATE POLICY "Products are viewable by everyone" 
  ON skating_products FOR SELECT 
  USING (true);

-- Public insert for orders
CREATE POLICY "Anyone can create orders" 
  ON skating_orders FOR INSERT 
  WITH CHECK (true);

-- Public insert for contact messages
CREATE POLICY "Anyone can send contact messages" 
  ON skating_contact_messages FOR INSERT 
  WITH CHECK (true);
