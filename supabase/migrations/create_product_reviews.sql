-- Product reviews table
CREATE TABLE IF NOT EXISTS skating_product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES skating_products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name VARCHAR(255) NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE skating_product_reviews ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Reviews are viewable by everyone" 
  ON skating_product_reviews FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can create reviews" 
  ON skating_product_reviews FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');
