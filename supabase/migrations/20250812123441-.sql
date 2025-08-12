-- Remove the existing constraint
ALTER TABLE inventory DROP CONSTRAINT inventory_category_check;

-- Add a more flexible constraint that handles encoding issues
ALTER TABLE inventory 
ADD CONSTRAINT inventory_category_check 
CHECK (category IN (
  'Ração',
  'Medicamentos', 
  'Equipamentos',
  'Fertilizantes',
  'Pós-Larvas',
  'Combustível',
  'Outros'
));

-- Also ensure the column allows proper text encoding
ALTER TABLE inventory ALTER COLUMN category TYPE TEXT;