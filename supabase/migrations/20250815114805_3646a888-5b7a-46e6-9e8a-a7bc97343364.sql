-- Corrigir warnings de segurança: adicionar search_path às funções

-- 1. Corrigir função allocate_partial_harvest_costs
CREATE OR REPLACE FUNCTION allocate_partial_harvest_costs()
RETURNS TRIGGER AS $$
DECLARE
  total_biomass_produced numeric;
  total_feed_cost numeric;
  total_input_cost numeric;
  pl_cost numeric;
  preparation_cost numeric;
  proportion_harvested numeric;
BEGIN
  -- Só executar para despescas (total ou parcial)
  IF TG_OP = 'INSERT' THEN
    -- Calcular biomassa total produzida até agora no ciclo
    SELECT COALESCE(SUM(biomass_harvested), 0) + NEW.biomass_harvested
    INTO total_biomass_produced
    FROM harvest_records 
    WHERE pond_batch_id = NEW.pond_batch_id;
    
    -- Calcular custos totais do ciclo
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
    
    -- Calcular proporção desta despesca em relação ao total produzido
    IF total_biomass_produced > 0 THEN
      proportion_harvested := NEW.biomass_harvested / total_biomass_produced;
      
      -- Alocar custos proporcionalmente
      NEW.allocated_feed_cost := total_feed_cost * proportion_harvested;
      NEW.allocated_input_cost := total_input_cost * proportion_harvested;
      NEW.allocated_pl_cost := pl_cost * proportion_harvested;
      NEW.allocated_preparation_cost := preparation_cost * proportion_harvested;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public';

-- 2. Corrigir função update_remaining_cycle_metrics
CREATE OR REPLACE FUNCTION update_remaining_cycle_metrics()
RETURNS TRIGGER AS $$
DECLARE
  remaining_population integer;
  total_harvested_biomass numeric;
  total_allocated_feed_cost numeric;
  total_allocated_input_cost numeric;
  total_allocated_pl_cost numeric;
  total_allocated_preparation_cost numeric;
BEGIN
  -- Só executar para despescas parciais
  IF NEW.harvest_type = 'partial' THEN
    -- Calcular totais já despescados
    SELECT 
      COALESCE(SUM(biomass_harvested), 0),
      COALESCE(SUM(allocated_feed_cost), 0),
      COALESCE(SUM(allocated_input_cost), 0),
      COALESCE(SUM(allocated_pl_cost), 0),
      COALESCE(SUM(allocated_preparation_cost), 0)
    INTO 
      total_harvested_biomass,
      total_allocated_feed_cost,
      total_allocated_input_cost,
      total_allocated_pl_cost,
      total_allocated_preparation_cost
    FROM harvest_records 
    WHERE pond_batch_id = NEW.pond_batch_id;
    
    -- Atualizar população restante
    SELECT current_population INTO remaining_population
    FROM pond_batches WHERE id = NEW.pond_batch_id;
    
    remaining_population := remaining_population - NEW.population_harvested;
    
    -- Atualizar pond_batch com nova população
    UPDATE pond_batches 
    SET current_population = remaining_population
    WHERE id = NEW.pond_batch_id;
    
    -- Note: Os custos restantes serão calculados dinamicamente no frontend
    -- subtraindo os custos já alocados dos custos totais
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public';