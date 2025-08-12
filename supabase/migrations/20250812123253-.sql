-- Add missing foreign key constraint between inventory and farms
ALTER TABLE inventory
ADD CONSTRAINT inventory_farm_id_fkey 
FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE;

-- Drop the existing check constraint that's causing issues
ALTER TABLE inventory 
DROP CONSTRAINT IF EXISTS inventory_category_check;

-- Recreate the category check constraint with correct values
ALTER TABLE inventory
ADD CONSTRAINT inventory_category_check 
CHECK (category IN ('Ração', 'Medicamentos', 'Equipamentos', 'Fertilizantes', 'Pós-Larvas', 'Combustível', 'Outros'));