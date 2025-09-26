-- Adicionar política RLS para técnicos verem seus próprios registros
CREATE POLICY "Technicians can view own employee records" 
ON public.farm_employees 
FOR SELECT 
TO authenticated 
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);