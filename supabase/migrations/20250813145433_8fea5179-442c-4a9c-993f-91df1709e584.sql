-- Add fields for cycle completion and data reconciliation
ALTER TABLE public.harvest_records 
ADD COLUMN expected_population integer,
ADD COLUMN expected_biomass numeric,
ADD COLUMN actual_mortality_detected integer DEFAULT 0,
ADD COLUMN reconciliation_notes text;

-- Add final cycle data fields to pond_batches
ALTER TABLE public.pond_batches 
ADD COLUMN cycle_status text DEFAULT 'active',
ADD COLUMN final_population integer,
ADD COLUMN final_biomass numeric,
ADD COLUMN final_average_weight numeric,
ADD COLUMN final_survival_rate numeric,
ADD COLUMN actual_mortality_total integer DEFAULT 0;

-- Add constraint for cycle_status
ALTER TABLE public.pond_batches 
ADD CONSTRAINT check_cycle_status 
CHECK (cycle_status IN ('active', 'completed'));

-- Create function to update pond_batches when total harvest is recorded
CREATE OR REPLACE FUNCTION public.complete_pond_cycle()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger for completing pond cycles
CREATE TRIGGER trigger_complete_pond_cycle
  AFTER INSERT ON public.harvest_records
  FOR EACH ROW
  EXECUTE FUNCTION public.complete_pond_cycle();