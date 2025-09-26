-- Create materialized views for performance optimization
CREATE MATERIALIZED VIEW public.active_pond_summary AS
SELECT 
  pb.id as pond_batch_id,
  p.id as pond_id,
  p.name as pond_name,
  p.area as pond_area,
  p.farm_id,
  pb.current_population,
  pb.stocking_date,
  pb.cycle_status,
  b.name as batch_name,
  b.pl_size,
  pb.pl_quantity,
  pb.preparation_cost,
  -- Latest biometry
  (SELECT average_weight FROM biometrics WHERE pond_batch_id = pb.id ORDER BY measurement_date DESC LIMIT 1) as latest_weight,
  (SELECT measurement_date FROM biometrics WHERE pond_batch_id = pb.id ORDER BY measurement_date DESC LIMIT 1) as latest_biometry_date,
  -- Days of culture
  (CURRENT_DATE - pb.stocking_date) as doc,
  -- Biomass calculation
  COALESCE(
    (pb.current_population * (SELECT average_weight FROM biometrics WHERE pond_batch_id = pb.id ORDER BY measurement_date DESC LIMIT 1)) / 1000.0,
    0
  ) as current_biomass
FROM pond_batches pb
JOIN ponds p ON pb.pond_id = p.id
JOIN batches b ON pb.batch_id = b.id
WHERE pb.cycle_status = 'active' AND pb.current_population > 0;

-- Create index for fast lookups
CREATE INDEX idx_active_pond_summary_farm_id ON public.active_pond_summary(farm_id);
CREATE INDEX idx_active_pond_summary_pond_batch_id ON public.active_pond_summary(pond_batch_id);

-- Create function for efficient feeding calculations
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
$$ LANGUAGE plpgsql STABLE;

-- Refresh the materialized view
REFRESH MATERIALIZED VIEW public.active_pond_summary;