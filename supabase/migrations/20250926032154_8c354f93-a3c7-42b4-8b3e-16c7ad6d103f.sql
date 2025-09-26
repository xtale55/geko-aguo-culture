-- Remover a política que causa recursão infinita
DROP POLICY IF EXISTS "Users can view employees from own farms" ON public.farm_employees;

-- Política melhorada para proprietários de fazenda verem funcionários
CREATE POLICY "Farm owners can view employees" 
ON public.farm_employees 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 
    FROM farms 
    WHERE farms.id = farm_employees.farm_id 
    AND farms.user_id = auth.uid()
  )
);

-- Garantir que técnicos podem ver apenas seus próprios registros (já existe)
-- CREATE POLICY "Technicians can view own employee records" 
-- ON public.farm_employees 
-- FOR SELECT 
-- TO authenticated 
-- USING (email = auth.email());