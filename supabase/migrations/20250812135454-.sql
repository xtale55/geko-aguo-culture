-- Add default feed type to feeding rates
ALTER TABLE feeding_rates 
ADD COLUMN default_feed_type_id UUID REFERENCES inventory(id),
ADD COLUMN default_feed_type_name TEXT;

-- Add comments for clarity
COMMENT ON COLUMN feeding_rates.default_feed_type_id IS 'Default feed type for this weight range';
COMMENT ON COLUMN feeding_rates.default_feed_type_name IS 'Default feed type name for historical tracking';