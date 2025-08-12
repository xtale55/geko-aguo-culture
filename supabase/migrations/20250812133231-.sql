-- Allow null values for pond_batch_id to support farm templates
ALTER TABLE feeding_rates ALTER COLUMN pond_batch_id DROP NOT NULL;