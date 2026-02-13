-- Add OAuth support columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'email';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS auth_provider_id TEXT;
ALTER TABLE profiles ALTER COLUMN password_hash DROP NOT NULL;

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_user ON password_reset_tokens(user_id);
