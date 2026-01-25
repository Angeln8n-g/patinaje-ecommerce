-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Banners Table
CREATE TABLE IF NOT EXISTS banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  image_url TEXT NOT NULL,
  link_url TEXT,
  active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

-- Policies for Categories
-- Public read
CREATE POLICY "Categories are viewable by everyone" 
  ON categories FOR SELECT 
  USING (true);

-- Admin manage
CREATE POLICY "Admins can manage categories" 
  ON categories FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'ADMIN'
    )
  );

-- Policies for Banners
-- Public read active banners
CREATE POLICY "Active banners are viewable by everyone" 
  ON banners FOR SELECT 
  USING (active = true);

-- Admin see all banners
CREATE POLICY "Admins can view all banners" 
  ON banners FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'ADMIN'
    )
  );

-- Admin manage banners
CREATE POLICY "Admins can manage banners" 
  ON banners FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'ADMIN'
    )
  );

-- Insert default categories (from existing hardcoded list) to avoid empty table
INSERT INTO categories (name, slug) VALUES 
('Patines Completos', 'patines-completos'),
('Ruedas', 'ruedas'),
('Bases / Frames', 'bases-frames'),
('Botas', 'botas'),
('Protecciones', 'protecciones'),
('Accesorios', 'accesorios')
ON CONFLICT (name) DO NOTHING;
