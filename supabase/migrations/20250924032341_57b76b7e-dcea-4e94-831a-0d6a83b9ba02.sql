-- Enable realtime for feeding_records table
ALTER TABLE public.feeding_records REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.feeding_records;

-- Enable realtime for inventory table  
ALTER TABLE public.inventory REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.inventory;