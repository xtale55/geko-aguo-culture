-- Create input_applications table for tracking input usage
CREATE TABLE public.input_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pond_batch_id UUID NOT NULL,
  input_item_id UUID NOT NULL,
  input_item_name TEXT NOT NULL,
  application_date DATE NOT NULL,
  application_time TIME WITHOUT TIME ZONE,
  quantity_applied NUMERIC NOT NULL,
  unit_cost NUMERIC,
  total_cost NUMERIC,
  dosage_per_hectare NUMERIC,
  purpose TEXT, -- 'water_preparation', 'ph_correction', 'fertilization', 'probiotic', etc.
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.input_applications ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view input_applications from own farms" 
ON public.input_applications 
FOR SELECT 
USING (EXISTS (
  SELECT 1
  FROM pond_batches pb
  JOIN ponds p ON pb.pond_id = p.id
  JOIN farms f ON p.farm_id = f.id
  WHERE pb.id = input_applications.pond_batch_id 
  AND f.user_id = auth.uid()
));

CREATE POLICY "Users can insert input_applications to own farms" 
ON public.input_applications 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1
  FROM pond_batches pb
  JOIN ponds p ON pb.pond_id = p.id
  JOIN farms f ON p.farm_id = f.id
  WHERE pb.id = input_applications.pond_batch_id 
  AND f.user_id = auth.uid()
));

CREATE POLICY "Users can update input_applications from own farms" 
ON public.input_applications 
FOR UPDATE 
USING (EXISTS (
  SELECT 1
  FROM pond_batches pb
  JOIN ponds p ON pb.pond_id = p.id
  JOIN farms f ON p.farm_id = f.id
  WHERE pb.id = input_applications.pond_batch_id 
  AND f.user_id = auth.uid()
));

CREATE POLICY "Users can delete input_applications from own farms" 
ON public.input_applications 
FOR DELETE 
USING (EXISTS (
  SELECT 1
  FROM pond_batches pb
  JOIN ponds p ON pb.pond_id = p.id
  JOIN farms f ON p.farm_id = f.id
  WHERE pb.id = input_applications.pond_batch_id 
  AND f.user_id = auth.uid()
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_input_applications_updated_at
BEFORE UPDATE ON public.input_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();