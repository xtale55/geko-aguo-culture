-- Add missing DELETE policies for complete RLS coverage

-- Allow users to delete batches from their own farms
CREATE POLICY "Users can delete batches from own farms" 
ON public.batches 
FOR DELETE 
USING (EXISTS ( SELECT 1
   FROM farms
  WHERE ((farms.id = batches.farm_id) AND (farms.user_id = auth.uid()))));

-- Allow users to delete their own farms
CREATE POLICY "Users can delete own farms" 
ON public.farms 
FOR DELETE 
USING (auth.uid() = user_id);

-- Allow users to delete mortality records from their own farms
CREATE POLICY "Users can delete mortality_records from own farms" 
ON public.mortality_records 
FOR DELETE 
USING (EXISTS ( SELECT 1
   FROM ((pond_batches pb
     JOIN ponds p ON ((pb.pond_id = p.id)))
     JOIN farms f ON ((p.farm_id = f.id)))
  WHERE ((pb.id = mortality_records.pond_batch_id) AND (f.user_id = auth.uid()))));

-- Allow users to delete pond batches from their own farms
CREATE POLICY "Users can delete pond_batches from own farms" 
ON public.pond_batches 
FOR DELETE 
USING (EXISTS ( SELECT 1
   FROM (ponds p
     JOIN farms f ON ((p.farm_id = f.id)))
  WHERE ((p.id = pond_batches.pond_id) AND (f.user_id = auth.uid()))));

-- Allow users to delete their own profile
CREATE POLICY "Users can delete own profile" 
ON public.profiles 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add missing UPDATE policies

-- Allow users to update biometrics from their own farms
CREATE POLICY "Users can update biometrics from own farms" 
ON public.biometrics 
FOR UPDATE 
USING (EXISTS ( SELECT 1
   FROM ((pond_batches pb
     JOIN ponds p ON ((pb.pond_id = p.id)))
     JOIN farms f ON ((p.farm_id = f.id)))
  WHERE ((pb.id = biometrics.pond_batch_id) AND (f.user_id = auth.uid()))));

-- Allow users to update mortality records from their own farms
CREATE POLICY "Users can update mortality_records from own farms" 
ON public.mortality_records 
FOR UPDATE 
USING (EXISTS ( SELECT 1
   FROM ((pond_batches pb
     JOIN ponds p ON ((pb.pond_id = p.id)))
     JOIN farms f ON ((p.farm_id = f.id)))
  WHERE ((pb.id = mortality_records.pond_batch_id) AND (f.user_id = auth.uid()))));