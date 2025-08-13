-- Fix security issue: Set search_path for the function
DROP FUNCTION IF EXISTS public.complete_pond_cycle();

CREATE OR REPLACE FUNCTION public.complete_pond_cycle()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only execute for total harvests
  IF NEW.harvest_type = 'total' THEN
    -- Update pond_batches with final cycle data
    UPDATE public.pond_batches 
    SET 
      cycle_status = 'completed',
      final_population = NEW.population_harvested,
      final_biomass = NEW.biomass_harvested,
      final_average_weight = NEW.average_weight_at_harvest,
      final_survival_rate = (NEW.population_harvested::numeric / pl_quantity::numeric) * 100,
      actual_mortality_total = pl_quantity - NEW.population_harvested,
      current_population = 0
    WHERE id = NEW.pond_batch_id;
    
    -- Update pond status to free
    UPDATE public.ponds 
    SET status = 'free'
    WHERE id = (
      SELECT pond_id 
      FROM public.pond_batches 
      WHERE id = NEW.pond_batch_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;