-- Create survival_adjustments table for tracking population adjustments
CREATE TABLE public.survival_adjustments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pond_batch_id uuid NOT NULL,
  adjustment_date date NOT NULL,
  adjustment_type text NOT NULL CHECK (adjustment_type IN ('survival_rate', 'biomass_estimate')),
  -- For survival rate adjustment
  estimated_survival_rate numeric,
  -- For biomass estimate adjustment
  estimated_biomass_kg numeric,
  calculated_survival_rate numeric,
  -- Data before adjustment
  previous_population integer NOT NULL,
  adjusted_population integer NOT NULL,
  -- Biomass calculation based on biometry
  biometry_based_biomass_kg numeric,
  latest_average_weight_g numeric,
  -- Metadata
  reason text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.survival_adjustments ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view survival_adjustments from own farms" 
ON public.survival_adjustments 
FOR SELECT 
USING (EXISTS (
  SELECT 1 
  FROM pond_batches pb
  JOIN ponds p ON pb.pond_id = p.id
  JOIN farms f ON p.farm_id = f.id
  WHERE pb.id = survival_adjustments.pond_batch_id 
  AND f.user_id = auth.uid()
));

CREATE POLICY "Users can create survival_adjustments to own farms" 
ON public.survival_adjustments 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 
  FROM pond_batches pb
  JOIN ponds p ON pb.pond_id = p.id
  JOIN farms f ON p.farm_id = f.id
  WHERE pb.id = survival_adjustments.pond_batch_id 
  AND f.user_id = auth.uid()
));

CREATE POLICY "Users can update survival_adjustments from own farms" 
ON public.survival_adjustments 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 
  FROM pond_batches pb
  JOIN ponds p ON pb.pond_id = p.id
  JOIN farms f ON p.farm_id = f.id
  WHERE pb.id = survival_adjustments.pond_batch_id 
  AND f.user_id = auth.uid()
));

CREATE POLICY "Users can delete survival_adjustments from own farms" 
ON public.survival_adjustments 
FOR DELETE 
USING (EXISTS (
  SELECT 1 
  FROM pond_batches pb
  JOIN ponds p ON pb.pond_id = p.id
  JOIN farms f ON p.farm_id = f.id
  WHERE pb.id = survival_adjustments.pond_batch_id 
  AND f.user_id = auth.uid()
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_survival_adjustments_updated_at
BEFORE UPDATE ON public.survival_adjustments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();