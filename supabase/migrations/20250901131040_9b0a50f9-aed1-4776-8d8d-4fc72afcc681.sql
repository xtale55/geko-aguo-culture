-- Corrigir a função allocate_partial_harvest_costs para usar lógica correta de particionamento
CREATE OR REPLACE FUNCTION public.allocate_partial_harvest_costs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_biomass_estimate numeric;
  total_feed_cost numeric;
  total_input_cost numeric;
  pl_cost numeric;
  preparation_cost numeric;
  proportion_harvested numeric;
  current_population integer;
  current_avg_weight numeric;
BEGIN
  -- Só executar para despescas (total ou parcial)
  IF TG_OP = 'INSERT' THEN
    -- Buscar dados atuais do pond_batch
    SELECT 
      pb.current_population,
      COALESCE(
        (SELECT average_weight 
         FROM biometrics 
         WHERE pond_batch_id = pb.id 
         ORDER BY measurement_date DESC 
         LIMIT 1), 
        1.0
      ) as latest_avg_weight
    INTO current_population, current_avg_weight
    FROM pond_batches pb
    WHERE pb.id = NEW.pond_batch_id;
    
    -- Calcular biomassa estimada antes da despesca
    current_biomass_estimate := (current_population * current_avg_weight) / 1000.0;
    
    -- Se a biomassa estimada for muito baixa, usar pelo menos a biomassa despescada
    IF current_biomass_estimate < NEW.biomass_harvested THEN
      current_biomass_estimate := NEW.biomass_harvested;
    END IF;
    
    -- Calcular custos totais acumulados do ciclo
    -- Custo de ração (converter gramas para kg)
    SELECT COALESCE(SUM((actual_amount / 1000.0) * COALESCE(unit_cost, 0)), 0)
    INTO total_feed_cost
    FROM feeding_records 
    WHERE pond_batch_id = NEW.pond_batch_id;
    
    -- Custo de insumos
    SELECT COALESCE(SUM(total_cost), 0)
    INTO total_input_cost
    FROM input_applications 
    WHERE pond_batch_id = NEW.pond_batch_id;
    
    -- Custo de PLs e preparação
    SELECT 
      (pb.pl_quantity / 1000.0) * b.pl_cost,
      COALESCE(pb.preparation_cost, 0)
    INTO pl_cost, preparation_cost
    FROM pond_batches pb
    JOIN batches b ON pb.batch_id = b.id
    WHERE pb.id = NEW.pond_batch_id;
    
    -- Calcular proporção baseada na biomassa despescada vs biomassa total estimada antes da despesca
    IF current_biomass_estimate > 0 THEN
      proportion_harvested := NEW.biomass_harvested / current_biomass_estimate;
      
      -- Garantir que a proporção não seja maior que 1
      IF proportion_harvested > 1.0 THEN
        proportion_harvested := 1.0;
      END IF;
      
      -- Alocar custos proporcionalmente baseado na biomassa
      NEW.allocated_feed_cost := total_feed_cost * proportion_harvested;
      NEW.allocated_input_cost := total_input_cost * proportion_harvested;
      NEW.allocated_pl_cost := pl_cost * proportion_harvested;
      NEW.allocated_preparation_cost := preparation_cost * proportion_harvested;
    ELSE
      -- Se não há estimativa válida, não alocar custos
      NEW.allocated_feed_cost := 0;
      NEW.allocated_input_cost := 0;
      NEW.allocated_pl_cost := 0;
      NEW.allocated_preparation_cost := 0;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;