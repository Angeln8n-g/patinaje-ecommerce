-- ============================================================
-- Skating Store - Complete Database Schema
-- PostgreSQL (standalone, no Supabase)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- profiles (users)
-- ==========================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  role TEXT DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN', 'DELIVERY', 'SELLER')),
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  address_street TEXT,
  address_city TEXT,
  address_state TEXT,
  address_postal_code TEXT,
  address_country TEXT,
  email_confirmed BOOLEAN DEFAULT FALSE,
  auth_provider TEXT DEFAULT 'email',
  auth_provider_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- categories
-- ==========================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon_name TEXT,
  icon_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- skating_products
-- ==========================================
CREATE TABLE IF NOT EXISTS skating_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category VARCHAR(50) NOT NULL,
  subcategory VARCHAR(100),
  images TEXT[] DEFAULT '{}',
  stock INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT FALSE,
  barcode VARCHAR(100) UNIQUE,
  unit_type VARCHAR(20) DEFAULT 'unit',
  supplier VARCHAR(255),
  purchase_price DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'active',
  variant_type VARCHAR(20) DEFAULT 'none',
  variant_options TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- skating_orders
-- ==========================================
CREATE TABLE IF NOT EXISTS skating_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  customer_name VARCHAR(255) NOT NULL,
  customer_address TEXT NOT NULL,
  customer_city VARCHAR(100) NOT NULL,
  customer_postal_code VARCHAR(20) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  customer_email TEXT,
  items JSONB NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  payment_method VARCHAR(20) DEFAULT 'card',
  payment_status VARCHAR(20) DEFAULT 'pending',
  qr_token TEXT,
  seller_id UUID REFERENCES profiles(id),
  order_type VARCHAR(20) DEFAULT 'online',
  shipping_lat DECIMAL(10,8),
  shipping_lng DECIMAL(11,8),
  dispatched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- banners
-- ==========================================
CREATE TABLE IF NOT EXISTS banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  link_url TEXT,
  active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- promo_text_banners
-- ==========================================
CREATE TABLE IF NOT EXISTS promo_text_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  prefix_text TEXT NOT NULL DEFAULT '',
  highlight_text TEXT NOT NULL DEFAULT '',
  suffix_text TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  bg_color TEXT DEFAULT '#000000',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- static_content
-- ==========================================
CREATE TABLE IF NOT EXISTS static_content (
  slug TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- carts & cart_items
-- ==========================================
CREATE TABLE IF NOT EXISTS carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID REFERENCES carts(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES skating_products(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  selected_variant TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cart_id, product_id, selected_variant)
);

-- ==========================================
-- favorites
-- ==========================================
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES skating_products(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- ==========================================
-- skating_contact_messages
-- ==========================================
CREATE TABLE IF NOT EXISTS skating_contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- skating_product_reviews
-- ==========================================
CREATE TABLE IF NOT EXISTS skating_product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES skating_products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  user_name VARCHAR(255) NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- inventory_movements
-- ==========================================
CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES skating_products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  quantity_change INTEGER NOT NULL,
  movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment')),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- pos_sessions
-- ==========================================
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
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- ==========================================
-- shipments
-- ==========================================
CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES skating_orders(id) NOT NULL,
  delivery_man_id UUID REFERENCES profiles(id),
  status VARCHAR(50) DEFAULT 'ASIGNADO' CHECK (status IN ('ASIGNADO', 'EN_RUTA', 'CERCA', 'ENTREGADO')),
  current_lat DECIMAL(10,8),
  current_lng DECIMAL(11,8),
  estimated_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- delivery_zones
-- ==========================================
CREATE TABLE IF NOT EXISTS delivery_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  polygon JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- delivery_locations
-- ==========================================
CREATE TABLE IF NOT EXISTS delivery_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_man_id UUID REFERENCES profiles(id) NOT NULL UNIQUE,
  lat DECIMAL(10,8) NOT NULL,
  lng DECIMAL(11,8) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- delivery_ratings
-- ==========================================
CREATE TABLE IF NOT EXISTS delivery_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES skating_orders(id) ON DELETE CASCADE,
  delivery_man_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(order_id)
);

-- ==========================================
-- skating_notifications
-- ==========================================
CREATE TABLE IF NOT EXISTS skating_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES skating_orders(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- skating_invoices
-- ==========================================
CREATE TABLE IF NOT EXISTS skating_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES skating_orders(id) ON DELETE CASCADE,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'sent',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- Default data
-- ==========================================
INSERT INTO categories (name, slug) VALUES 
('Patines Completos', 'patines-completos'),
('Ruedas', 'ruedas'),
('Bases / Frames', 'bases-frames'),
('Botas', 'botas'),
('Protecciones', 'protecciones'),
('Accesorios', 'accesorios')
ON CONFLICT (name) DO NOTHING;

-- ==========================================
-- Indexes for performance
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_products_category ON skating_products(category);
CREATE INDEX IF NOT EXISTS idx_products_featured ON skating_products(featured);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON skating_products(barcode);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON skating_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON skating_orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON skating_orders(status);
CREATE INDEX IF NOT EXISTS idx_shipments_order_id ON shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_delivery_man ON shipments(delivery_man_id);
CREATE INDEX IF NOT EXISTS idx_pos_sessions_seller ON pos_sessions(seller_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON skating_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON skating_product_reviews(product_id);

-- ==========================================
-- password_reset_tokens
-- ==========================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_user ON password_reset_tokens(user_id);
