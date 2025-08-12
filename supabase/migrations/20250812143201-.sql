-- Create operational_costs table for tracking farm operational expenses
CREATE TABLE public.operational_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  farm_id UUID NOT NULL,
  pond_batch_id UUID NULL,
  category TEXT NOT NULL CHECK (category IN ('labor', 'energy', 'fuel', 'other')),
  amount NUMERIC NOT NULL DEFAULT 0,
  cost_date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.operational_costs ENABLE ROW LEVEL SECURITY;

-- Create policies for operational_costs
CREATE POLICY "Users can view operational_costs from own farms" 
ON public.operational_costs 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM farms 
  WHERE farms.id = operational_costs.farm_id 
  AND farms.user_id = auth.uid()
));

CREATE POLICY "Users can insert operational_costs to own farms" 
ON public.operational_costs 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM farms 
  WHERE farms.id = operational_costs.farm_id 
  AND farms.user_id = auth.uid()
));

CREATE POLICY "Users can update operational_costs from own farms" 
ON public.operational_costs 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM farms 
  WHERE farms.id = operational_costs.farm_id 
  AND farms.user_id = auth.uid()
));

CREATE POLICY "Users can delete operational_costs from own farms" 
ON public.operational_costs 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM farms 
  WHERE farms.id = operational_costs.farm_id 
  AND farms.user_id = auth.uid()
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_operational_costs_updated_at
BEFORE UPDATE ON public.operational_costs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();