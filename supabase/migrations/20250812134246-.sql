-- Add feed type tracking to feeding records
ALTER TABLE feeding_records 
ADD COLUMN feed_type_id UUID REFERENCES inventory(id),
ADD COLUMN feed_type_name TEXT,
ADD COLUMN unit_cost NUMERIC DEFAULT 0;

-- Add comments for clarity
COMMENT ON COLUMN feeding_records.feed_type_id IS 'Reference to inventory item used for feeding';
COMMENT ON COLUMN feeding_records.feed_type_name IS 'Name of the feed type for historical tracking';
COMMENT ON COLUMN feeding_records.unit_cost IS 'Cost per kg at time of feeding for historical tracking';