-- Ensure public read access for static_content table
ALTER TABLE static_content ENABLE ROW LEVEL SECURITY;

-- Grant usage on schema public to anon and authenticated
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant select on static_content to anon and authenticated
GRANT SELECT ON static_content TO anon, authenticated;

-- Drop existing read policy to avoid conflicts/duplicates
DROP POLICY IF EXISTS "Public read access" ON static_content;

-- Re-create the policy allowing everyone to read
CREATE POLICY "Public read access" 
ON static_content 
FOR SELECT 
TO public 
USING (true);
