-- Fix security warnings: Add search_path to functions and secure materialized view
-- Fix function search path mutable
SET search_path = public;

-- Update function with proper search path
CREATE OR REPLACE FUNCTION public.calculate_feeding_metrics(
  farm_id_param UUID,
  calculation_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  pond_batch_id UUID,
  pond_name TEXT,
  batch_name TEXT,
  current_population INTEGER,
  latest_weight NUMERIC,
  current_biomass NUMERIC,
  feeding_percentage NUMERIC,
  meals_per_day INTEGER,
  daily_feed_kg NUMERIC,
  feed_per_meal_g INTEGER,
  total_consumed_kg NUMERIC,
  doc INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH feeding_consumed AS (
    SELECT 
      fr.pond_batch_id as pb_id,
      SUM(fr.actual_amount / 1000.0) as total_kg
    FROM feeding_records fr
    JOIN public.active_pond_summary aps ON fr.pond_batch_id = aps.pond_batch_id
    WHERE aps.farm_id = farm_id_param
    GROUP BY fr.pond_batch_id
  )
  SELECT 
    aps.pond_batch_id,
    aps.pond_name,
    aps.batch_name,
    aps.current_population,
    COALESCE(aps.latest_weight, 1.0) as latest_weight,
    aps.current_biomass,
    -- Default feeding percentage based on weight
    CASE 
      WHEN COALESCE(aps.latest_weight, 1.0) < 1 THEN 10
      WHEN COALESCE(aps.latest_weight, 1.0) < 3 THEN 8
      WHEN COALESCE(aps.latest_weight, 1.0) < 5 THEN 6
      WHEN COALESCE(aps.latest_weight, 1.0) < 10 THEN 4
      WHEN COALESCE(aps.latest_weight, 1.0) < 15 THEN 2.5
      ELSE 2
    END as feeding_percentage,
    -- Default meals per day based on weight
    CASE 
      WHEN COALESCE(aps.latest_weight, 1.0) < 1 THEN 5
      WHEN COALESCE(aps.latest_weight, 1.0) < 3 THEN 4
      WHEN COALESCE(aps.latest_weight, 1.0) < 10 THEN 3
      ELSE 2
    END as meals_per_day,
    -- Daily feed calculation
    (aps.current_biomass * CASE 
      WHEN COALESCE(aps.latest_weight, 1.0) < 1 THEN 10
      WHEN COALESCE(aps.latest_weight, 1.0) < 3 THEN 8
      WHEN COALESCE(aps.latest_weight, 1.0) < 5 THEN 6
      WHEN COALESCE(aps.latest_weight, 1.0) < 10 THEN 4
      WHEN COALESCE(aps.latest_weight, 1.0) < 15 THEN 2.5
      ELSE 2
    END / 100.0) as daily_feed_kg,
    -- Feed per meal in grams
    ROUND((aps.current_biomass * CASE 
      WHEN COALESCE(aps.latest_weight, 1.0) < 1 THEN 10
      WHEN COALESCE(aps.latest_weight, 1.0) < 3 THEN 8
      WHEN COALESCE(aps.latest_weight, 1.0) < 5 THEN 6
      WHEN COALESCE(aps.latest_weight, 1.0) < 10 THEN 4
      WHEN COALESCE(aps.latest_weight, 1.0) < 15 THEN 2.5
      ELSE 2
    END * 1000.0 / 100.0) / CASE 
      WHEN COALESCE(aps.latest_weight, 1.0) < 1 THEN 5
      WHEN COALESCE(aps.latest_weight, 1.0) < 3 THEN 4
      WHEN COALESCE(aps.latest_weight, 1.0) < 10 THEN 3
      ELSE 2
    END)::INTEGER as feed_per_meal_g,
    COALESCE(fc.total_kg, 0) as total_consumed_kg,
    aps.doc::INTEGER
  FROM public.active_pond_summary aps
  LEFT JOIN feeding_consumed fc ON fc.pb_id = aps.pond_batch_id
  WHERE aps.farm_id = farm_id_param
  ORDER BY aps.pond_name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Remove public access to materialized view
REVOKE ALL ON public.active_pond_summary FROM PUBLIC;
REVOKE ALL ON public.active_pond_summary FROM anon;
REVOKE ALL ON public.active_pond_summary FROM authenticated;

-- Only allow specific usage through functions if needed
-- This addresses the security warning about materialized views in API