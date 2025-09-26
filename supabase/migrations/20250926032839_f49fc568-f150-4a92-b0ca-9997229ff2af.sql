-- Create SECURITY DEFINER function to break RLS recursion cycle
CREATE OR REPLACE FUNCTION public.get_user_accessible_farm_ids()
RETURNS TABLE(farm_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- Return farms owned by the user
  SELECT id as farm_id
  FROM farms 
  WHERE user_id = auth.uid()
  
  UNION
  
  -- Return farms where user is an active technician
  SELECT fe.farm_id
  FROM farm_employees fe
  WHERE fe.email = auth.email() 
    AND fe.role = 'Técnico'
    AND fe.status = 'ativo';
$$;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Technicians can view assigned farms" ON public.farms;

-- Create new policy using the SECURITY DEFINER function
CREATE POLICY "Users can view accessible farms" 
ON public.farms 
FOR SELECT 
USING (id IN (SELECT farm_id FROM public.get_user_accessible_farm_ids()));