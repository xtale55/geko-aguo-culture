-- Atualizar a função complete_pond_cycle para permitir sobrevivência > 100%
-- e melhorar os cálculos baseados nos dados reais de despesca

CREATE OR REPLACE FUNCTION public.complete_pond_cycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  sum_population integer;
  sum_biomass numeric;
  original_pl_quantity integer;
  real_survival_rate numeric;
  reproduction_detected boolean := false;
BEGIN
  -- Only execute for total harvests
  IF NEW.harvest_type = 'total' THEN
    -- Get original PL quantity for accurate survival calculation
    SELECT pl_quantity INTO original_pl_quantity
    FROM public.pond_batches
    WHERE id = NEW.pond_batch_id;

    -- Cumulative harvested values in this cycle
    SELECT 
      COALESCE(SUM(population_harvested), 0),
      COALESCE(SUM(biomass_harvested), 0)
    INTO sum_population, sum_biomass
    FROM harvest_records
    WHERE pond_batch_id = NEW.pond_batch_id;

    -- Calculate real survival rate based on original PL quantity
    IF original_pl_quantity > 0 THEN
      real_survival_rate := (sum_population::numeric / original_pl_quantity::numeric) * 100;
      
      -- Detect possible reproduction if survival > 100%
      IF real_survival_rate > 100 THEN
        reproduction_detected := true;
      END IF;
    ELSE
      real_survival_rate := 0;
    END IF;

    -- Update pond_batches with final cumulative data and real survival rate
    UPDATE public.pond_batches 
    SET 
      cycle_status = 'completed',
      final_population = sum_population,
      final_biomass = sum_biomass,
      final_average_weight = NEW.average_weight_at_harvest,
      final_survival_rate = real_survival_rate, -- Real survival rate, can be > 100%
      actual_mortality_total = CASE 
        WHEN reproduction_detected THEN 0 -- No mortality if reproduction occurred
        ELSE GREATEST(0, original_pl_quantity - sum_population) 
      END,
      current_population = 0
    WHERE id = NEW.pond_batch_id;

    -- Free pond
    UPDATE public.ponds 
    SET status = 'free'
    WHERE id = (
      SELECT pond_id 
      FROM public.pond_batches 
      WHERE id = NEW.pond_batch_id
    );

    -- Add reproduction note to harvest record if detected
    IF reproduction_detected THEN
      UPDATE public.harvest_records
      SET reconciliation_notes = COALESCE(reconciliation_notes, '') || 
        CASE 
          WHEN COALESCE(reconciliation_notes, '') = '' THEN ''
          ELSE ' '
        END ||
        'REPRODUÇÃO DETECTADA: Taxa de sobrevivência ' || ROUND(real_survival_rate, 1) || '% indica reprodução durante o cultivo.'
      WHERE id = NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;