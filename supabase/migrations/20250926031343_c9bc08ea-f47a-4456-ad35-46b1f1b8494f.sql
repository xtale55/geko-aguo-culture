-- Remover a política problemática que causa erro de acesso
DROP POLICY IF EXISTS "Technicians can view own employee records" ON public.farm_employees;

-- Criar política correta usando auth.email() em vez de acessar auth.users diretamente
CREATE POLICY "Technicians can view own employee records" 
ON public.farm_employees 
FOR SELECT 
TO authenticated 
USING (
  email = auth.email()
);

-- Adicionar política para técnicos poderem ver detalhes das fazendas onde trabalham
CREATE POLICY "Technicians can view assigned farms" 
ON public.farms 
FOR SELECT 
TO authenticated 
USING (
  id IN (
    SELECT farm_id 
    FROM farm_employees 
    WHERE email = auth.email() 
    AND role = 'Técnico' 
    AND status = 'ativo'
  )
);