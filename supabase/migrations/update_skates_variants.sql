-- Update all products in 'patines' category to have size variants
UPDATE skating_products
SET 
  variant_type = 'size',
  variant_options = ARRAY['36', '37', '38', '39', '40', '41', '42', '43', '44', '45']
WHERE category = 'patines';
