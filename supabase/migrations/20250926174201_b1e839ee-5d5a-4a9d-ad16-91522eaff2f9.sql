-- Fix security issues: Add search_path to functions
CREATE OR REPLACE FUNCTION public.calculate_feeding_adjustment(
  pond_batch_id_param uuid,
  current_amount integer,
  consumption_eval text
)
RETURNS TABLE(
  suggested_amount integer,
  adjustment_percentage numeric,
  should_suspend boolean,
  reason text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  config_record public.feeding_sensitivity_config%ROWTYPE;
  recent_evaluations text[];
  suspension_count integer := 0;
  farm_id_val uuid;
  adjustment_pct numeric := 0;
  new_amount integer;
BEGIN
  -- Get farm_id from pond_batch
  SELECT f.id INTO farm_id_val
  FROM farms f
  JOIN ponds p ON p.farm_id = f.id
  JOIN pond_batches pb ON pb.pond_id = p.id
  WHERE pb.id = pond_batch_id_param;
  
  -- Get sensitivity config
  SELECT * INTO config_record
  FROM public.feeding_sensitivity_config
  WHERE feeding_sensitivity_config.farm_id = farm_id_val;
  
  -- Use default values if no config found
  IF config_record IS NULL THEN
    config_record.consumed_all_adjustment := 5.0;
    config_record.left_little_adjustment := 2.0;
    config_record.partial_consumption_adjustment := -10.0;
    config_record.no_consumption_adjustment := -25.0;
    config_record.excess_leftover_adjustment := -15.0;
    config_record.suspension_threshold := 2;
    config_record.auto_adjustment_enabled := true;
  END IF;
  
  -- Get recent evaluations
  SELECT array_agg(fr.consumption_evaluation ORDER BY fr.feeding_date DESC, fr.feeding_time DESC)
  INTO recent_evaluations
  FROM feeding_records fr
  WHERE fr.pond_batch_id = pond_batch_id_param
    AND fr.consumption_evaluation IS NOT NULL
  LIMIT COALESCE(config_record.evaluation_history_count, 3);
  
  -- Count consecutive no_consumption evaluations
  FOR i IN 1..array_length(recent_evaluations, 1) LOOP
    IF recent_evaluations[i] = 'no_consumption' THEN
      suspension_count := suspension_count + 1;
    ELSE
      EXIT;
    END IF;
  END LOOP;
  
  -- Determine adjustment based on current evaluation
  CASE consumption_eval
    WHEN 'consumed_all' THEN
      adjustment_pct := config_record.consumed_all_adjustment;
      reason := 'Consumiu tudo - aumentando quantidade';
    WHEN 'left_little' THEN
      adjustment_pct := config_record.left_little_adjustment;
      reason := 'Sobrou pouco - ajuste leve';
    WHEN 'partial_consumption' THEN
      adjustment_pct := config_record.partial_consumption_adjustment;
      reason := 'Consumo parcial - reduzindo quantidade';
    WHEN 'no_consumption' THEN
      adjustment_pct := config_record.no_consumption_adjustment;
      reason := 'Não consumiu - redução significativa';
    WHEN 'excess_leftover' THEN
      adjustment_pct := config_record.excess_leftover_adjustment;
      reason := 'Muita sobra - reduzindo quantidade';
    ELSE
      adjustment_pct := 0;
      reason := 'Avaliação não reconhecida';
  END CASE;
  
  -- Check if suspension is needed
  IF suspension_count >= config_record.suspension_threshold THEN
    RETURN QUERY SELECT 
      0::integer,
      0::numeric,
      true::boolean,
      'Suspender alimentação - ' || suspension_count || ' alimentações consecutivas sem consumo'::text;
    RETURN;
  END IF;
  
  -- Calculate new amount
  new_amount := GREATEST(0, ROUND(current_amount * (1 + adjustment_pct / 100.0)));
  
  RETURN QUERY SELECT 
    new_amount,
    adjustment_pct,
    false::boolean,
    reason;
END;
$$;