-- Add farm_id to feeding_rates to support farm-wide templates
ALTER TABLE public.feeding_rates ADD COLUMN farm_id UUID;

-- Create index for performance
CREATE INDEX idx_feeding_rates_farm_id ON public.feeding_rates(farm_id);
CREATE INDEX idx_feeding_rates_pond_batch_id ON public.feeding_rates(pond_batch_id);

-- Update RLS policies to support both farm templates and pond-specific rates
DROP POLICY IF EXISTS "Users can view feeding_rates from own farms" ON public.feeding_rates;
DROP POLICY IF EXISTS "Users can insert feeding_rates to own farms" ON public.feeding_rates;
DROP POLICY IF EXISTS "Users can update feeding_rates from own farms" ON public.feeding_rates;
DROP POLICY IF EXISTS "Users can delete feeding_rates from own farms" ON public.feeding_rates;

-- New RLS policies for both farm templates and pond-specific rates
CREATE POLICY "Users can view feeding_rates from own farms" 
ON public.feeding_rates 
FOR SELECT 
USING (
  (farm_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM farms f 
    WHERE f.id = feeding_rates.farm_id AND f.user_id = auth.uid()
  ))
  OR
  (pond_batch_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM pond_batches pb
    JOIN ponds p ON pb.pond_id = p.id
    JOIN farms f ON p.farm_id = f.id
    WHERE pb.id = feeding_rates.pond_batch_id AND f.user_id = auth.uid()
  ))
);

CREATE POLICY "Users can insert feeding_rates to own farms" 
ON public.feeding_rates 
FOR INSERT 
WITH CHECK (
  (farm_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM farms f 
    WHERE f.id = feeding_rates.farm_id AND f.user_id = auth.uid()
  ))
  OR
  (pond_batch_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM pond_batches pb
    JOIN ponds p ON pb.pond_id = p.id
    JOIN farms f ON p.farm_id = f.id
    WHERE pb.id = feeding_rates.pond_batch_id AND f.user_id = auth.uid()
  ))
);

CREATE POLICY "Users can update feeding_rates from own farms" 
ON public.feeding_rates 
FOR UPDATE 
USING (
  (farm_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM farms f 
    WHERE f.id = feeding_rates.farm_id AND f.user_id = auth.uid()
  ))
  OR
  (pond_batch_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM pond_batches pb
    JOIN ponds p ON pb.pond_id = p.id
    JOIN farms f ON p.farm_id = f.id
    WHERE pb.id = feeding_rates.pond_batch_id AND f.user_id = auth.uid()
  ))
);

CREATE POLICY "Users can delete feeding_rates from own farms" 
ON public.feeding_rates 
FOR DELETE 
USING (
  (farm_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM farms f 
    WHERE f.id = feeding_rates.farm_id AND f.user_id = auth.uid()
  ))
  OR
  (pond_batch_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM pond_batches pb
    JOIN ponds p ON pb.pond_id = p.id
    JOIN farms f ON p.farm_id = f.id
    WHERE pb.id = feeding_rates.pond_batch_id AND f.user_id = auth.uid()
  ))
);