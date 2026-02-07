-- Delivery Ratings table
CREATE TABLE IF NOT EXISTS delivery_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES skating_orders(id) ON DELETE CASCADE,
  delivery_man_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(order_id) -- Only one rating per order
);

-- RLS
ALTER TABLE delivery_ratings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can create ratings for their orders" 
  ON delivery_ratings FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own ratings" 
  ON delivery_ratings FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all ratings" 
  ON delivery_ratings FOR SELECT 
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'));

CREATE POLICY "Delivery men can view their own ratings" 
  ON delivery_ratings FOR SELECT 
  USING (auth.uid() = delivery_man_id);
