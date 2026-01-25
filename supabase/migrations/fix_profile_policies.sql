-- Policy for Admins to update ANY profile (including roles)
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;

CREATE POLICY "Admins can update any profile" 
  ON profiles FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles AS admin_profile
      WHERE admin_profile.id = auth.uid() 
      AND admin_profile.role = 'ADMIN'
    )
  );
