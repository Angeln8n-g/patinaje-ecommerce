-- Create table for promo text banners (like the Delivery one)
CREATE TABLE IF NOT EXISTS promo_text_banners (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL, -- Internal name
  prefix_text text,
  highlight_text text,
  suffix_text text,
  image_url text, -- Can be background image or GIF
  bg_color text DEFAULT '#E9F7E8',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE promo_text_banners ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public read access" ON promo_text_banners FOR SELECT USING (true);
CREATE POLICY "Admin full access" ON promo_text_banners FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
);

-- Insert the default one
INSERT INTO promo_text_banners (title, prefix_text, highlight_text, suffix_text, bg_color)
VALUES ('Delivery Promo', 'Delivery is', '50%', 'cheaper', '#E9F7E8');
