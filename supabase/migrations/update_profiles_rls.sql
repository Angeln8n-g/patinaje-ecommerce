-- Enable RLS on profiles if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);

-- Ensure users can read their own profile (and maybe others if public profiles are needed, but let's stick to own for now or public read)
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

-- Or if we want profiles to be public read:
-- DROP POLICY IF EXISTS "Public profiles" ON profiles;
-- CREATE POLICY "Public profiles" ON profiles FOR SELECT USING (true);
