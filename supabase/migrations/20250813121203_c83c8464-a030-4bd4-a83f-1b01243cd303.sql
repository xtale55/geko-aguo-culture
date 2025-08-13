-- Create DELETE policy for ponds table to allow users to delete only their own farm's ponds
CREATE POLICY "Users can delete ponds from own farms" 
ON public.ponds 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 
    FROM farms 
    WHERE farms.id = ponds.farm_id 
    AND farms.user_id = auth.uid()
  ) 
  AND status = 'free'  -- Only allow deletion of free ponds
);