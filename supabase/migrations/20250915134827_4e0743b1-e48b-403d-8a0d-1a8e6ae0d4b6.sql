-- Ensure minimum_stock_threshold column exists in inventory table
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory' 
        AND column_name = 'minimum_stock_threshold'
    ) THEN
        ALTER TABLE public.inventory 
        ADD COLUMN minimum_stock_threshold integer DEFAULT NULL;
    END IF;
END $$;