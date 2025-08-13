-- Add missing foreign key constraint for harvest_records
ALTER TABLE public.harvest_records
ADD CONSTRAINT harvest_records_pond_batch_id_fkey 
FOREIGN KEY (pond_batch_id) REFERENCES public.pond_batches(id);