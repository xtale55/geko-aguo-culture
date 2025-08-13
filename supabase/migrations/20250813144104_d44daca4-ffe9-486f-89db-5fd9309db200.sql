-- Add average weight at harvest field to harvest_records table
ALTER TABLE harvest_records 
ADD COLUMN average_weight_at_harvest numeric;