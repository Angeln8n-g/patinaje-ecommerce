-- ============================================
-- FIX: Notifications RLS + Realtime
-- ============================================

-- 1. Allow admins to insert notifications for any user
DROP POLICY IF EXISTS "Admins can insert notifications" ON skating_notifications;
CREATE POLICY "Admins can insert notifications"
  ON skating_notifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

-- 2. Allow delivery men to insert notifications (for order status updates)
DROP POLICY IF EXISTS "Delivery can insert notifications" ON skating_notifications;
CREATE POLICY "Delivery can insert notifications"
  ON skating_notifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'DELIVERY'
    )
  );

-- 3. Allow users to insert their own notifications (for checkout self-notifications)
DROP POLICY IF EXISTS "Users can insert own notifications" ON skating_notifications;
CREATE POLICY "Users can insert own notifications"
  ON skating_notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 4. Allow users to delete their own notifications
DROP POLICY IF EXISTS "Users can delete own notifications" ON skating_notifications;
CREATE POLICY "Users can delete own notifications"
  ON skating_notifications FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Enable Realtime for the notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE skating_notifications;

-- 6. Enable Realtime for orders and shipments (for tracking page live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE skating_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE shipments;
