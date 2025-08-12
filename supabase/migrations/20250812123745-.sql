-- Remove the problematic check constraint entirely
-- Frontend validation will handle category validation
ALTER TABLE inventory DROP CONSTRAINT IF EXISTS inventory_category_check;