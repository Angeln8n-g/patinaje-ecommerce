-- ============================================================
-- Migration: 014_database_storage.sql
-- Create table for storing uploaded files directly in PostgreSQL
-- ============================================================

CREATE TABLE IF NOT EXISTS uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  mimetype TEXT NOT NULL,
  data BYTEA NOT NULL,
  size INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uploads_key ON uploads(key);
