-- Add missing foreign key constraint to survival_adjustments table
ALTER TABLE public.survival_adjustments 
ADD CONSTRAINT survival_adjustments_pond_batch_id_fkey 
FOREIGN KEY (pond_batch_id) REFERENCES public.pond_batches(id) ON DELETE CASCADE;