-- Create water_quality table for storing water parameter measurements
CREATE TABLE public.water_quality (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pond_id UUID NOT NULL,
  measurement_date DATE NOT NULL,
  oxygen_level NUMERIC,  -- mg/L
  temperature NUMERIC,   -- °C
  ph_level NUMERIC,      -- pH
  alkalinity NUMERIC,    -- mg/L
  hardness NUMERIC,      -- mg/L
  ammonia NUMERIC,       -- mg/L
  turbidity NUMERIC,     -- NTU
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.water_quality ENABLE ROW LEVEL SECURITY;

-- Create policies for water_quality access
CREATE POLICY "Users can view water_quality from own farms" 
ON public.water_quality 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM ponds 
  JOIN farms ON ponds.farm_id = farms.id 
  WHERE ponds.id = water_quality.pond_id 
  AND farms.user_id = auth.uid()
));

CREATE POLICY "Users can insert water_quality to own farms" 
ON public.water_quality 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM ponds 
  JOIN farms ON ponds.farm_id = farms.id 
  WHERE ponds.id = water_quality.pond_id 
  AND farms.user_id = auth.uid()
));

CREATE POLICY "Users can update water_quality from own farms" 
ON public.water_quality 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM ponds 
  JOIN farms ON ponds.farm_id = farms.id 
  WHERE ponds.id = water_quality.pond_id 
  AND farms.user_id = auth.uid()
));

CREATE POLICY "Users can delete water_quality from own farms" 
ON public.water_quality 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM ponds 
  JOIN farms ON ponds.farm_id = farms.id 
  WHERE ponds.id = water_quality.pond_id 
  AND farms.user_id = auth.uid()
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_water_quality_updated_at
BEFORE UPDATE ON public.water_quality
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();