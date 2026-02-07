-- Notifications table
CREATE TABLE IF NOT EXISTS skating_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES skating_orders(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info', -- info, success, warning, error
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE skating_notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own notifications" 
  ON skating_notifications FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
  ON skating_notifications FOR UPDATE 
  USING (auth.uid() = user_id);

-- Allow system/admin to insert (via service role usually, but explicit policy helps if logic is client-side sometimes)
-- For now, we rely on backend logic, but if we insert from client (e.g. some triggers), we might need insert policy.
-- Assuming inserts happen via server actions with appropriate privileges or service role if needed.
-- But standard authenticated users shouldn't insert their own random notifications usually.
-- We'll allow authenticated insert for now to simplify testing if needed, or rely on service role.
-- Actually, let's keep it strict. Only server actions should insert. 
-- Wait, RLS applies to server actions if they use authenticated client.
-- Let's allow insert for authenticated users if they are inserting for themselves (rare) or if they are admin/delivery.
-- Better: Delivery drivers need to trigger notifications for users.
-- So we need a policy allowing Delivery/Admin to insert notifications for OTHER users?
-- Or we use Service Role in the server action. Service Role bypasses RLS.
-- We will use Service Role in the action for safety.

