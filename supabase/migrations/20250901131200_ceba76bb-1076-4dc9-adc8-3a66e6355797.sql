-- Attach triggers to harvest_records to enforce allocation and updates
DROP TRIGGER IF EXISTS trg_before_insert_allocate_partial_harvest_costs ON public.harvest_records;
CREATE TRIGGER trg_before_insert_allocate_partial_harvest_costs
BEFORE INSERT ON public.harvest_records
FOR EACH ROW
EXECUTE FUNCTION public.allocate_partial_harvest_costs();

DROP TRIGGER IF EXISTS trg_after_insert_update_remaining_metrics ON public.harvest_records;
CREATE TRIGGER trg_after_insert_update_remaining_metrics
AFTER INSERT ON public.harvest_records
FOR EACH ROW
EXECUTE FUNCTION public.update_remaining_cycle_metrics();

DROP TRIGGER IF EXISTS trg_after_insert_complete_cycle ON public.harvest_records;
CREATE TRIGGER trg_after_insert_complete_cycle
AFTER INSERT ON public.harvest_records
FOR EACH ROW
EXECUTE FUNCTION public.complete_pond_cycle();