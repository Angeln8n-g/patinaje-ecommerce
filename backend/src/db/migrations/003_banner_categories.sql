-- ============================================================
-- Banner Categories - Database Migration
-- Table: banner_categories (many-to-many relation between banners and categories)
-- ============================================================

CREATE TABLE IF NOT EXISTS banner_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  banner_id UUID NOT NULL REFERENCES banners(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(banner_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_banner_categories_banner ON banner_categories(banner_id);
CREATE INDEX IF NOT EXISTS idx_banner_categories_category ON banner_categories(category_id);
