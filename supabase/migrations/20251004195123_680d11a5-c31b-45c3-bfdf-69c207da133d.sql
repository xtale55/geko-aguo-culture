-- Adicionar coluna measurement_time à tabela water_quality
ALTER TABLE public.water_quality 
ADD COLUMN IF NOT EXISTS measurement_time time without time zone DEFAULT '06:00:00';