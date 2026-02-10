-- Asignar códigos de barras a productos existentes que no tienen uno
UPDATE skating_products
SET barcode = 'SK-' || UPPER(SUBSTRING(md5(id::text) FROM 1 FOR 8)) || '-' || UPPER(SUBSTRING(md5(random()::text) FROM 1 FOR 4))
WHERE barcode IS NULL OR barcode = '';
