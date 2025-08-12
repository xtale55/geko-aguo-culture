-- Create feeding_records table to track actual feeding
CREATE TABLE public.feeding_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pond_batch_id UUID NOT NULL,
  feeding_date DATE NOT NULL,
  feeding_time TIME NOT NULL,
  planned_amount NUMERIC NOT NULL DEFAULT 0,
  actual_amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  feeding_rate_percentage NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create feeding_rates table for technician-adjustable feeding rates
CREATE TABLE public.feeding_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pond_batch_id UUID NOT NULL,
  weight_range_min NUMERIC NOT NULL,
  weight_range_max NUMERIC NOT NULL,
  feeding_percentage NUMERIC NOT NULL,
  meals_per_day INTEGER NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.feeding_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feeding_rates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for feeding_records
CREATE POLICY "Users can view feeding_records from own farms" 
ON public.feeding_records 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM pond_batches pb
  JOIN ponds p ON pb.pond_id = p.id
  JOIN farms f ON p.farm_id = f.id
  WHERE pb.id = feeding_records.pond_batch_id AND f.user_id = auth.uid()
));

CREATE POLICY "Users can insert feeding_records to own farms" 
ON public.feeding_records 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM pond_batches pb
  JOIN ponds p ON pb.pond_id = p.id
  JOIN farms f ON p.farm_id = f.id
  WHERE pb.id = feeding_records.pond_batch_id AND f.user_id = auth.uid()
));

CREATE POLICY "Users can update feeding_records from own farms" 
ON public.feeding_records 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM pond_batches pb
  JOIN ponds p ON pb.pond_id = p.id
  JOIN farms f ON p.farm_id = f.id
  WHERE pb.id = feeding_records.pond_batch_id AND f.user_id = auth.uid()
));

CREATE POLICY "Users can delete feeding_records from own farms" 
ON public.feeding_records 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM pond_batches pb
  JOIN ponds p ON pb.pond_id = p.id
  JOIN farms f ON p.farm_id = f.id
  WHERE pb.id = feeding_records.pond_batch_id AND f.user_id = auth.uid()
));

-- Create RLS policies for feeding_rates
CREATE POLICY "Users can view feeding_rates from own farms" 
ON public.feeding_rates 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM pond_batches pb
  JOIN ponds p ON pb.pond_id = p.id
  JOIN farms f ON p.farm_id = f.id
  WHERE pb.id = feeding_rates.pond_batch_id AND f.user_id = auth.uid()
));

CREATE POLICY "Users can insert feeding_rates to own farms" 
ON public.feeding_rates 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM pond_batches pb
  JOIN ponds p ON pb.pond_id = p.id
  JOIN farms f ON p.farm_id = f.id
  WHERE pb.id = feeding_rates.pond_batch_id AND f.user_id = auth.uid()
) AND auth.uid() = created_by);

CREATE POLICY "Users can update feeding_rates from own farms" 
ON public.feeding_rates 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM pond_batches pb
  JOIN ponds p ON pb.pond_id = p.id
  JOIN farms f ON p.farm_id = f.id
  WHERE pb.id = feeding_rates.pond_batch_id AND f.user_id = auth.uid()
));

CREATE POLICY "Users can delete feeding_rates from own farms" 
ON public.feeding_rates 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM pond_batches pb
  JOIN ponds p ON pb.pond_id = p.id
  JOIN farms f ON p.farm_id = f.id
  WHERE pb.id = feeding_rates.pond_batch_id AND f.user_id = auth.uid()
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_feeding_records_updated_at
BEFORE UPDATE ON public.feeding_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_feeding_rates_updated_at
BEFORE UPDATE ON public.feeding_rates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();