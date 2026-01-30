-- Fix RLS for static_content to ensure admins can update
-- Also allow insert for admins

ALTER TABLE static_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access" ON static_content;

-- Create a more permissive policy for authenticated users temporarily to debug/fix
-- Or strictly for admins if we are confident
CREATE POLICY "Admin full access" ON static_content 
FOR ALL 
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
);

-- Ensure public read access is still there
DROP POLICY IF EXISTS "Public read access" ON static_content;
CREATE POLICY "Public read access" ON static_content FOR SELECT USING (true);
