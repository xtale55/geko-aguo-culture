-- Add foreign key constraint between farm_employees and farms
ALTER TABLE public.farm_employees 
ADD CONSTRAINT farm_employees_farm_id_fkey 
FOREIGN KEY (farm_id) REFERENCES public.farms(id) ON DELETE CASCADE;