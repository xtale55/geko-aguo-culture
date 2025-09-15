-- Add purchase unit fields to inventory table
ALTER TABLE public.inventory 
ADD COLUMN IF NOT EXISTS purchase_unit text DEFAULT 'kg',
ADD COLUMN IF NOT EXISTS purchase_quantity numeric,
ADD COLUMN IF NOT EXISTS purchase_unit_price numeric;