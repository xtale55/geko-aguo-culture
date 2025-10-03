-- Drop the old function first
DROP FUNCTION IF EXISTS public.delete_user_by_email(text);

-- Recreate with the correct signature
CREATE OR REPLACE FUNCTION public.delete_user_by_email(user_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
  result_message TEXT;
BEGIN
  -- Buscar o user_id pelo email
  SELECT id INTO target_user_id 
  FROM auth.users 
  WHERE email = user_email;
  
  -- Verificar se o usuário existe
  IF target_user_id IS NULL THEN
    RETURN 'ERRO: Usuário com email ' || user_email || ' não encontrado.';
  END IF;
  
  -- Iniciar a limpeza dos dados
  
  -- 1. Limpar registros que referenciam pond_batches
  DELETE FROM public.harvest_records 
  WHERE pond_batch_id IN (
    SELECT pb.id FROM public.pond_batches pb
    JOIN public.ponds p ON pb.pond_id = p.id
    JOIN public.farms f ON p.farm_id = f.id
    WHERE f.user_id = target_user_id
  );
  
  DELETE FROM public.feeding_records 
  WHERE pond_batch_id IN (
    SELECT pb.id FROM public.pond_batches pb
    JOIN public.ponds p ON pb.pond_id = p.id
    JOIN public.farms f ON p.farm_id = f.id
    WHERE f.user_id = target_user_id
  );
  
  DELETE FROM public.input_applications 
  WHERE pond_batch_id IN (
    SELECT pb.id FROM public.pond_batches pb
    JOIN public.ponds p ON pb.pond_id = p.id
    JOIN public.farms f ON p.farm_id = f.id
    WHERE f.user_id = target_user_id
  );
  
  DELETE FROM public.mortality_records 
  WHERE pond_batch_id IN (
    SELECT pb.id FROM public.pond_batches pb
    JOIN public.ponds p ON pb.pond_id = p.id
    JOIN public.farms f ON p.farm_id = f.id
    WHERE f.user_id = target_user_id
  );
  
  DELETE FROM public.biometrics 
  WHERE pond_batch_id IN (
    SELECT pb.id FROM public.pond_batches pb
    JOIN public.ponds p ON pb.pond_id = p.id
    JOIN public.farms f ON p.farm_id = f.id
    WHERE f.user_id = target_user_id
  );
  
  DELETE FROM public.survival_adjustments 
  WHERE pond_batch_id IN (
    SELECT pb.id FROM public.pond_batches pb
    JOIN public.ponds p ON pb.pond_id = p.id
    JOIN public.farms f ON p.farm_id = f.id
    WHERE f.user_id = target_user_id
  );
  
  -- 2. Limpar feeding_rates - CORREÇÃO: usar default_feed_type_id
  DELETE FROM public.feeding_rates 
  WHERE default_feed_type_id IN (
    SELECT i.id FROM public.inventory i
    JOIN public.farms f ON i.farm_id = f.id
    WHERE f.user_id = target_user_id
  ) OR pond_batch_id IN (
    SELECT pb.id FROM public.pond_batches pb
    JOIN public.ponds p ON pb.pond_id = p.id
    JOIN public.farms f ON p.farm_id = f.id
    WHERE f.user_id = target_user_id
  ) OR farm_id IN (
    SELECT id FROM public.farms WHERE user_id = target_user_id
  );
  
  -- 3. Limpar water_quality
  DELETE FROM public.water_quality 
  WHERE pond_id IN (
    SELECT p.id FROM public.ponds p
    JOIN public.farms f ON p.farm_id = f.id
    WHERE f.user_id = target_user_id
  );
  
  -- 4. Limpar pond_batches
  DELETE FROM public.pond_batches 
  WHERE pond_id IN (
    SELECT p.id FROM public.ponds p
    JOIN public.farms f ON p.farm_id = f.id
    WHERE f.user_id = target_user_id
  );
  
  -- 5. Limpar mixture_ingredients
  DELETE FROM public.mixture_ingredients 
  WHERE recipe_id IN (
    SELECT mr.id FROM public.mixture_recipes mr
    JOIN public.farms f ON mr.farm_id = f.id
    WHERE f.user_id = target_user_id
  );
  
  -- 6. Limpar tabelas que referenciam farms diretamente
  DELETE FROM public.inventory WHERE farm_id IN (
    SELECT id FROM public.farms WHERE user_id = target_user_id
  );
  
  DELETE FROM public.ponds WHERE farm_id IN (
    SELECT id FROM public.farms WHERE user_id = target_user_id
  );
  
  DELETE FROM public.batches WHERE farm_id IN (
    SELECT id FROM public.farms WHERE user_id = target_user_id
  );
  
  DELETE FROM public.operational_costs WHERE farm_id IN (
    SELECT id FROM public.farms WHERE user_id = target_user_id
  );
  
  DELETE FROM public.mixture_recipes WHERE farm_id IN (
    SELECT id FROM public.farms WHERE user_id = target_user_id
  );
  
  DELETE FROM public.inventory_movements WHERE farm_id IN (
    SELECT id FROM public.farms WHERE user_id = target_user_id
  );
  
  -- 7. Limpar convites e membros
  UPDATE public.invitations 
  SET status = 'cancelled' 
  WHERE email = user_email;
  
  DELETE FROM public.organization_members WHERE user_id = target_user_id;
  
  -- 8. Remover tarefas do usuário
  DELETE FROM public.user_tasks WHERE user_id = target_user_id;
  
  -- 9. Excluir fazendas do usuário
  DELETE FROM public.farms WHERE user_id = target_user_id;
  
  -- 10. Excluir perfil do usuário
  DELETE FROM public.profiles WHERE user_id = target_user_id;
  
  -- 11. Finalmente, deletar o usuário da tabela auth.users
  DELETE FROM auth.users WHERE id = target_user_id;
  
  -- Montar mensagem de sucesso
  result_message := 'SUCESSO: Usuário ' || user_email || ' (ID: ' || target_user_id || ') foi completamente deletado do sistema, incluindo todos os dados relacionados.';
  
  RETURN result_message;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'ERRO: Falha ao deletar usuário ' || user_email || '. Erro: ' || SQLERRM;
END;
$$;

-- Fix cleanup_user_data_before_delete function - CORREÇÃO: usar default_feed_type_id
CREATE OR REPLACE FUNCTION public.cleanup_user_data_before_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Limpar registros que referenciam pond_batches
  DELETE FROM public.harvest_records 
  WHERE pond_batch_id IN (
    SELECT pb.id FROM public.pond_batches pb
    JOIN public.ponds p ON pb.pond_id = p.id
    JOIN public.farms f ON p.farm_id = f.id
    WHERE f.user_id = OLD.id
  );
  
  DELETE FROM public.feeding_records 
  WHERE pond_batch_id IN (
    SELECT pb.id FROM public.pond_batches pb
    JOIN public.ponds p ON pb.pond_id = p.id
    JOIN public.farms f ON p.farm_id = f.id
    WHERE f.user_id = OLD.id
  );
  
  DELETE FROM public.input_applications 
  WHERE pond_batch_id IN (
    SELECT pb.id FROM public.pond_batches pb
    JOIN public.ponds p ON pb.pond_id = p.id
    JOIN public.farms f ON p.farm_id = f.id
    WHERE f.user_id = OLD.id
  );
  
  DELETE FROM public.mortality_records 
  WHERE pond_batch_id IN (
    SELECT pb.id FROM public.pond_batches pb
    JOIN public.ponds p ON pb.pond_id = p.id
    JOIN public.farms f ON p.farm_id = f.id
    WHERE f.user_id = OLD.id
  );
  
  DELETE FROM public.biometrics 
  WHERE pond_batch_id IN (
    SELECT pb.id FROM public.pond_batches pb
    JOIN public.ponds p ON pb.pond_id = p.id
    JOIN public.farms f ON p.farm_id = f.id
    WHERE f.user_id = OLD.id
  );
  
  DELETE FROM public.survival_adjustments 
  WHERE pond_batch_id IN (
    SELECT pb.id FROM public.pond_batches pb
    JOIN public.ponds p ON pb.pond_id = p.id
    JOIN public.farms f ON p.farm_id = f.id
    WHERE f.user_id = OLD.id
  );
  
  -- 2. Limpar feeding_rates - CORREÇÃO: usar default_feed_type_id
  DELETE FROM public.feeding_rates 
  WHERE default_feed_type_id IN (
    SELECT i.id FROM public.inventory i
    JOIN public.farms f ON i.farm_id = f.id
    WHERE f.user_id = OLD.id
  ) OR pond_batch_id IN (
    SELECT pb.id FROM public.pond_batches pb
    JOIN public.ponds p ON pb.pond_id = p.id
    JOIN public.farms f ON p.farm_id = f.id
    WHERE f.user_id = OLD.id
  ) OR farm_id IN (
    SELECT id FROM public.farms WHERE user_id = OLD.id
  );
  
  -- 3. Limpar water_quality
  DELETE FROM public.water_quality 
  WHERE pond_id IN (
    SELECT p.id FROM public.ponds p
    JOIN public.farms f ON p.farm_id = f.id
    WHERE f.user_id = OLD.id
  );
  
  -- 4. Limpar pond_batches
  DELETE FROM public.pond_batches 
  WHERE pond_id IN (
    SELECT p.id FROM public.ponds p
    JOIN public.farms f ON p.farm_id = f.id
    WHERE f.user_id = OLD.id
  );
  
  -- 5. Limpar mixture_ingredients
  DELETE FROM public.mixture_ingredients 
  WHERE recipe_id IN (
    SELECT mr.id FROM public.mixture_recipes mr
    JOIN public.farms f ON mr.farm_id = f.id
    WHERE f.user_id = OLD.id
  );
  
  -- 6. Limpar tabelas que referenciam farms diretamente
  DELETE FROM public.inventory WHERE farm_id IN (
    SELECT id FROM public.farms WHERE user_id = OLD.id
  );
  
  DELETE FROM public.ponds WHERE farm_id IN (
    SELECT id FROM public.farms WHERE user_id = OLD.id
  );
  
  DELETE FROM public.batches WHERE farm_id IN (
    SELECT id FROM public.farms WHERE user_id = OLD.id
  );
  
  DELETE FROM public.operational_costs WHERE farm_id IN (
    SELECT id FROM public.farms WHERE user_id = OLD.id
  );
  
  DELETE FROM public.mixture_recipes WHERE farm_id IN (
    SELECT id FROM public.farms WHERE user_id = OLD.id
  );
  
  -- 7. Limpar convites pendentes
  UPDATE public.invitations 
  SET status = 'cancelled' 
  WHERE email = (SELECT email FROM auth.users WHERE id = OLD.id);
  
  -- 8. Remover membros da organização
  DELETE FROM public.organization_members WHERE user_id = OLD.id;
  
  -- 9. Remover tarefas do usuário
  DELETE FROM public.user_tasks WHERE user_id = OLD.id;
  
  -- 10. Excluir fazendas do usuário
  DELETE FROM public.farms WHERE user_id = OLD.id;
  
  -- 11. Excluir perfil do usuário
  DELETE FROM public.profiles WHERE user_id = OLD.id;
  
  RETURN OLD;
END;
$$;