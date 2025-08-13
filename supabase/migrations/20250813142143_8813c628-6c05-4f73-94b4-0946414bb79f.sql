-- Create harvest_records table for tracking fish harvests
CREATE TABLE public.harvest_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pond_batch_id UUID NOT NULL,
  harvest_date DATE NOT NULL,
  harvest_type TEXT NOT NULL CHECK (harvest_type IN ('total', 'partial')),
  biomass_harvested NUMERIC NOT NULL DEFAULT 0,
  population_harvested INTEGER NOT NULL DEFAULT 0,
  price_per_kg NUMERIC,
  total_value NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.harvest_records ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for harvest_records
CREATE POLICY "Users can view harvest_records from own farms" 
ON public.harvest_records 
FOR SELECT 
USING (EXISTS ( SELECT 1
   FROM ((pond_batches pb
     JOIN ponds p ON ((pb.pond_id = p.id)))
     JOIN farms f ON ((p.farm_id = f.id)))
  WHERE ((pb.id = harvest_records.pond_batch_id) AND (f.user_id = auth.uid()))));

CREATE POLICY "Users can insert harvest_records to own farms" 
ON public.harvest_records 
FOR INSERT 
WITH CHECK (EXISTS ( SELECT 1
   FROM ((pond_batches pb
     JOIN ponds p ON ((pb.pond_id = p.id)))
     JOIN farms f ON ((p.farm_id = f.id)))
  WHERE ((pb.id = harvest_records.pond_batch_id) AND (f.user_id = auth.uid()))));

CREATE POLICY "Users can update harvest_records from own farms" 
ON public.harvest_records 
FOR UPDATE 
USING (EXISTS ( SELECT 1
   FROM ((pond_batches pb
     JOIN ponds p ON ((pb.pond_id = p.id)))
     JOIN farms f ON ((p.farm_id = f.id)))
  WHERE ((pb.id = harvest_records.pond_batch_id) AND (f.user_id = auth.uid()))));

CREATE POLICY "Users can delete harvest_records from own farms" 
ON public.harvest_records 
FOR DELETE 
USING (EXISTS ( SELECT 1
   FROM ((pond_batches pb
     JOIN ponds p ON ((pb.pond_id = p.id)))
     JOIN farms f ON ((p.farm_id = f.id)))
  WHERE ((pb.id = harvest_records.pond_batch_id) AND (f.user_id = auth.uid()))));

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_harvest_records_updated_at
BEFORE UPDATE ON public.harvest_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();