-- ============================================================
-- Promo Waitlist - Database Migration
-- Adds promo_status to banners and creates promo_waitlist table
-- ============================================================

-- Add promo_status to banners (upcoming = próximamente, active = activa, expired = expirada, none = sin promo)
ALTER TABLE banners ADD COLUMN IF NOT EXISTS promo_status VARCHAR(20) DEFAULT 'none' CHECK (promo_status IN ('none', 'upcoming', 'active', 'expired'));
ALTER TABLE banners ADD COLUMN IF NOT EXISTS promo_start_date TIMESTAMPTZ;
ALTER TABLE banners ADD COLUMN IF NOT EXISTS promo_end_date TIMESTAMPTZ;

-- Waitlist subscriptions
CREATE TABLE IF NOT EXISTS promo_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  banner_id UUID NOT NULL REFERENCES banners(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  notified BOOLEAN DEFAULT FALSE,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(banner_id, email)
);

CREATE INDEX IF NOT EXISTS idx_promo_waitlist_banner ON promo_waitlist(banner_id);
CREATE INDEX IF NOT EXISTS idx_promo_waitlist_email ON promo_waitlist(email);
CREATE INDEX IF NOT EXISTS idx_banners_promo_status ON banners(promo_status);
