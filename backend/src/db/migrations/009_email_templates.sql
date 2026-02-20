-- Migration: Create email_templates table
-- Requisitos: 10.1, 10.3

CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  subject VARCHAR(500) NOT NULL DEFAULT '',
  sender_name VARCHAR(255) NOT NULL DEFAULT '',
  reply_to VARCHAR(255) NOT NULL DEFAULT '',
  html_content TEXT NOT NULL DEFAULT '',
  content_properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  style_properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  trigger_type VARCHAR(50) NOT NULL DEFAULT 'manual-campana'
    CHECK (trigger_type IN ('automatico-registro', 'manual-campana', 'evento-disparado')),
  status VARCHAR(20) NOT NULL DEFAULT 'borrador'
    CHECK (status IN ('activa', 'borrador', 'pausada')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_templates_status ON email_templates(status);
CREATE INDEX IF NOT EXISTS idx_email_templates_trigger ON email_templates(trigger_type);
CREATE INDEX IF NOT EXISTS idx_email_templates_updated ON email_templates(updated_at DESC);
