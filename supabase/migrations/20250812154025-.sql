-- Create policy for DELETE on biometrics table
CREATE POLICY "Users can delete biometrics from own farms" 
ON public.biometrics 
FOR DELETE 
USING (EXISTS ( 
  SELECT 1
  FROM ((pond_batches pb
    JOIN ponds p ON ((pb.pond_id = p.id)))
    JOIN farms f ON ((p.farm_id = f.id)))
  WHERE ((pb.id = biometrics.pond_batch_id) AND (f.user_id = auth.uid()))
));