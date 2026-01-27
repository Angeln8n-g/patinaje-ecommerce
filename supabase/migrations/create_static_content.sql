CREATE TABLE IF NOT EXISTS static_content (
  slug text PRIMARY KEY,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE static_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access" ON static_content;
CREATE POLICY "Public read access" ON static_content FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin full access" ON static_content;
CREATE POLICY "Admin full access" ON static_content FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
);

-- Insert default data if not exists
INSERT INTO static_content (slug, data)
VALUES
  ('about-us', '{
    "title": "Sobre Nosotros",
    "history_title": "Nuestra Historia",
    "history_content": "Fundada en 2026, Skating Store nació de la pasión por el patinaje urbano. Empezamos como un pequeño grupo de amigos patinando en las calles y ahora somos la tienda líder en equipamiento profesional.",
    "mission_title": "Nuestra Misión",
    "mission_content": "Proporcionar el mejor equipo a patinadores de todos los niveles, fomentando la comunidad y apoyando el crecimiento del deporte en nuestra ciudad.",
    "image_url": "https://placehold.co/800x600/png?text=Skate+Shop+Team"
  }'::jsonb),
  ('contact-info', '{
    "title": "Contáctanos",
    "address": "Av. del Patinaje 123\nMadrid, 28001",
    "phone": "+34 912 345 678",
    "email": "info@skatingstore.com"
  }'::jsonb)
ON CONFLICT (slug) DO NOTHING;
