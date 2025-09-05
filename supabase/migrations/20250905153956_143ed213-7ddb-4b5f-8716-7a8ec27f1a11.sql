-- Fix cost allocation and survival calculations for harvests
-- 1) Allocate only remaining costs proportionally at each harvest (partial or total)
CREATE OR REPLACE FUNCTION public.allocate_partial_harvest_costs()
RETURNS trigger AS $$
DECLARE
  current_population integer;
  current_avg_weight numeric;
  current_biomass_estimate numeric;
  total_feed_cost numeric;
  total_input_cost numeric;
  pl_cost_total numeric;
  preparation_cost_total numeric;
  already_allocated_feed numeric;
  already_allocated_inputs numeric;
  already_allocated_pl numeric;
  already_allocated_prep numeric;
  remaining_feed_cost numeric;
  remaining_input_cost numeric;
  remaining_pl_cost numeric;
  remaining_preparation_cost numeric;
  proportion_harvested numeric;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Current cycle status
    SELECT 
      pb.current_population,
      COALESCE(
        (SELECT average_weight 
         FROM biometrics 
         WHERE pond_batch_id = pb.id 
         ORDER BY measurement_date DESC 
         LIMIT 1), 
        1.0
      )
    INTO current_population, current_avg_weight
    FROM pond_batches pb
    WHERE pb.id = NEW.pond_batch_id;

    -- Biomass before this harvest
    current_biomass_estimate := (current_population * current_avg_weight) / 1000.0;
    IF current_biomass_estimate < NEW.biomass_harvested THEN
      current_biomass_estimate := NEW.biomass_harvested;
    END IF;

    -- Total accumulated costs so far in the cycle
    SELECT COALESCE(SUM((actual_amount / 1000.0) * COALESCE(unit_cost, 0)), 0)
    INTO total_feed_cost
    FROM feeding_records 
    WHERE pond_batch_id = NEW.pond_batch_id;

    SELECT COALESCE(SUM(total_cost), 0)
    INTO total_input_cost
    FROM input_applications 
    WHERE pond_batch_id = NEW.pond_batch_id;

    SELECT 
      (pb.pl_quantity / 1000.0) * b.pl_cost,
      COALESCE(pb.preparation_cost, 0)
    INTO pl_cost_total, preparation_cost_total
    FROM pond_batches pb
    JOIN batches b ON pb.batch_id = b.id
    WHERE pb.id = NEW.pond_batch_id;

    -- Costs already allocated to previous harvests
    SELECT 
      COALESCE(SUM(allocated_feed_cost), 0),
      COALESCE(SUM(allocated_input_cost), 0),
      COALESCE(SUM(allocated_pl_cost), 0),
      COALESCE(SUM(allocated_preparation_cost), 0)
    INTO 
      already_allocated_feed, already_allocated_inputs, already_allocated_pl, already_allocated_prep
    FROM harvest_records
    WHERE pond_batch_id = NEW.pond_batch_id;

    -- Remaining costs to allocate in the cycle
    remaining_feed_cost := GREATEST(0, total_feed_cost - already_allocated_feed);
    remaining_input_cost := GREATEST(0, total_input_cost - already_allocated_inputs);
    remaining_pl_cost := GREATEST(0, pl_cost_total - already_allocated_pl);
    remaining_preparation_cost := GREATEST(0, preparation_cost_total - already_allocated_prep);

    -- Proportion of this harvest relative to biomass before the harvest
    IF current_biomass_estimate > 0 THEN
      proportion_harvested := LEAST(1.0, NEW.biomass_harvested / current_biomass_estimate);

      NEW.allocated_feed_cost := remaining_feed_cost * proportion_harvested;
      NEW.allocated_input_cost := remaining_input_cost * proportion_harvested;
      NEW.allocated_pl_cost := remaining_pl_cost * proportion_harvested;
      NEW.allocated_preparation_cost := remaining_preparation_cost * proportion_harvested;
    ELSE
      NEW.allocated_feed_cost := 0;
      NEW.allocated_input_cost := 0;
      NEW.allocated_pl_cost := 0;
      NEW.allocated_preparation_cost := 0;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2) On total harvest, finalize cycle using cumulative harvested population (partial + total)
CREATE OR REPLACE FUNCTION public.complete_pond_cycle()
RETURNS trigger AS $$
DECLARE
  sum_population integer;
  sum_biomass numeric;
BEGIN
  -- Only execute for total harvests
  IF NEW.harvest_type = 'total' THEN
    -- Cumulative harvested values in this cycle
    SELECT 
      COALESCE(SUM(population_harvested), 0),
      COALESCE(SUM(biomass_harvested), 0)
    INTO sum_population, sum_biomass
    FROM harvest_records
    WHERE pond_batch_id = NEW.pond_batch_id;

    -- Update pond_batches with final cumulative data
    UPDATE public.pond_batches 
    SET 
      cycle_status = 'completed',
      final_population = sum_population,
      final_biomass = sum_biomass,
      final_average_weight = NEW.average_weight_at_harvest,
      final_survival_rate = CASE WHEN pl_quantity > 0 THEN (sum_population::numeric / pl_quantity::numeric) * 100 ELSE 0 END,
      actual_mortality_total = GREATEST(0, pl_quantity - sum_population),
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
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;