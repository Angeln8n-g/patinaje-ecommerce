ALTER TABLE categories
ADD COLUMN IF NOT EXISTS icon_name text;

-- Optional: backfill common mappings by slug
UPDATE categories
SET icon_name = CASE
  WHEN slug ILIKE '%patines%' THEN 'Footprints'
  WHEN slug ILIKE '%ruedas%' THEN 'Disc'
  WHEN slug ILIKE '%botas%' THEN 'Footprints'
  WHEN slug ILIKE '%protecciones%' THEN 'Shield'
  WHEN slug ILIKE '%accesorios%' THEN 'Package'
  WHEN slug ILIKE '%bases%' THEN 'Component'
  ELSE icon_name
END
WHERE icon_name IS NULL;
