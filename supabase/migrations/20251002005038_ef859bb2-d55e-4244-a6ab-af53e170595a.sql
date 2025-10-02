-- Create feeding_evaluations table for independent evaluations
CREATE TABLE IF NOT EXISTS public.feeding_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pond_batch_id UUID NOT NULL,
  evaluation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  evaluation_time TIME NOT NULL DEFAULT CURRENT_TIME,
  amount_offered INTEGER NOT NULL, -- Amount in grams that was actually offered in this specific feeding
  consumption_evaluation TEXT NOT NULL CHECK (consumption_evaluation IN ('consumed_all', 'left_little', 'partial_consumption', 'no_consumption', 'excess_leftover')),
  leftover_percentage NUMERIC,
  adjustment_amount INTEGER NOT NULL DEFAULT 0, -- Adjustment in grams (can be negative)
  adjustment_percentage NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  evaluated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create feeding_base_amounts table to track the current base amount per pond_batch
CREATE TABLE IF NOT EXISTS public.feeding_base_amounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pond_batch_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  base_amount_per_meal INTEGER NOT NULL, -- Base amount in grams for next feeding
  last_evaluation_id UUID, -- Reference to the last evaluation that updated this base
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(pond_batch_id, date)
);

-- Enable RLS
ALTER TABLE public.feeding_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feeding_base_amounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for feeding_evaluations
CREATE POLICY "Users can view evaluations from own farms"
  ON public.feeding_evaluations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pond_batches pb
      JOIN ponds p ON pb.pond_id = p.id
      JOIN farms f ON p.farm_id = f.id
      WHERE pb.id = feeding_evaluations.pond_batch_id
        AND f.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert evaluations to own farms"
  ON public.feeding_evaluations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pond_batches pb
      JOIN ponds p ON pb.pond_id = p.id
      JOIN farms f ON p.farm_id = f.id
      WHERE pb.id = feeding_evaluations.pond_batch_id
        AND f.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update evaluations from own farms"
  ON public.feeding_evaluations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pond_batches pb
      JOIN ponds p ON pb.pond_id = p.id
      JOIN farms f ON p.farm_id = f.id
      WHERE pb.id = feeding_evaluations.pond_batch_id
        AND f.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete evaluations from own farms"
  ON public.feeding_evaluations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM pond_batches pb
      JOIN ponds p ON pb.pond_id = p.id
      JOIN farms f ON p.farm_id = f.id
      WHERE pb.id = feeding_evaluations.pond_batch_id
        AND f.user_id = auth.uid()
    )
  );

-- RLS Policies for feeding_base_amounts
CREATE POLICY "Users can view base amounts from own farms"
  ON public.feeding_base_amounts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pond_batches pb
      JOIN ponds p ON pb.pond_id = p.id
      JOIN farms f ON p.farm_id = f.id
      WHERE pb.id = feeding_base_amounts.pond_batch_id
        AND f.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert base amounts to own farms"
  ON public.feeding_base_amounts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pond_batches pb
      JOIN ponds p ON pb.pond_id = p.id
      JOIN farms f ON p.farm_id = f.id
      WHERE pb.id = feeding_base_amounts.pond_batch_id
        AND f.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update base amounts from own farms"
  ON public.feeding_base_amounts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pond_batches pb
      JOIN ponds p ON pb.pond_id = p.id
      JOIN farms f ON p.farm_id = f.id
      WHERE pb.id = feeding_base_amounts.pond_batch_id
        AND f.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete base amounts from own farms"
  ON public.feeding_base_amounts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM pond_batches pb
      JOIN ponds p ON pb.pond_id = p.id
      JOIN farms f ON p.farm_id = f.id
      WHERE pb.id = feeding_base_amounts.pond_batch_id
        AND f.user_id = auth.uid()
    )
  );

-- Create index for faster lookups
CREATE INDEX idx_feeding_evaluations_pond_batch ON public.feeding_evaluations(pond_batch_id, evaluation_date DESC);
CREATE INDEX idx_feeding_base_amounts_pond_batch ON public.feeding_base_amounts(pond_batch_id, date DESC);

-- Create updated_at trigger for feeding_evaluations
CREATE TRIGGER update_feeding_evaluations_updated_at
  BEFORE UPDATE ON public.feeding_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for feeding_base_amounts
CREATE TRIGGER update_feeding_base_amounts_updated_at
  BEFORE UPDATE ON public.feeding_base_amounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();