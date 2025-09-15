-- Create inventory_movements table to track all inventory changes
CREATE TABLE public.inventory_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_item_id UUID NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('entrada', 'saida', 'ajuste')),
  quantity_change INTEGER NOT NULL, -- positive for entrada/ajuste up, negative for saida/ajuste down
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  reference_id UUID, -- ID of feeding_record, input_application, or other related record
  reference_type TEXT, -- 'feeding', 'input_application', 'manual', etc.
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  farm_id UUID NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- Create policies for inventory_movements
CREATE POLICY "Users can view movements from own farms" 
ON public.inventory_movements 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM farms 
  WHERE farms.id = inventory_movements.farm_id 
  AND farms.user_id = auth.uid()
));

CREATE POLICY "Users can insert movements to own farms" 
ON public.inventory_movements 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM farms 
  WHERE farms.id = inventory_movements.farm_id 
  AND farms.user_id = auth.uid()
));

CREATE POLICY "Users can update movements from own farms" 
ON public.inventory_movements 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM farms 
  WHERE farms.id = inventory_movements.farm_id 
  AND farms.user_id = auth.uid()
));

CREATE POLICY "Users can delete movements from own farms" 
ON public.inventory_movements 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM farms 
  WHERE farms.id = inventory_movements.farm_id 
  AND farms.user_id = auth.uid()
));

-- Create function to automatically log inventory movements
CREATE OR REPLACE FUNCTION public.log_inventory_movement()
RETURNS TRIGGER AS $$
DECLARE
  movement_type TEXT;
  quantity_change INTEGER;
  farm_id_val UUID;
BEGIN
  -- Get farm_id from inventory item
  SELECT farm_id INTO farm_id_val FROM inventory WHERE id = COALESCE(NEW.id, OLD.id);
  
  IF TG_OP = 'INSERT' THEN
    movement_type := 'entrada';
    quantity_change := NEW.quantity;
    
    INSERT INTO public.inventory_movements (
      inventory_item_id,
      movement_type,
      quantity_change,
      previous_quantity,
      new_quantity,
      reason,
      created_by,
      farm_id
    ) VALUES (
      NEW.id,
      movement_type,
      quantity_change,
      0,
      NEW.quantity,
      'Entrada inicial de estoque',
      auth.uid(),
      farm_id_val
    );
  ELSIF TG_OP = 'UPDATE' THEN
    quantity_change := NEW.quantity - OLD.quantity;
    
    IF quantity_change != 0 THEN
      IF quantity_change > 0 THEN
        movement_type := 'entrada';
      ELSE
        movement_type := 'saida';
      END IF;
      
      INSERT INTO public.inventory_movements (
        inventory_item_id,
        movement_type,
        quantity_change,
        previous_quantity,
        new_quantity,
        reason,
        created_by,
        farm_id
      ) VALUES (
        NEW.id,
        movement_type,
        quantity_change,
        OLD.quantity,
        NEW.quantity,
        CASE 
          WHEN quantity_change > 0 THEN 'Entrada de estoque'
          ELSE 'Saída de estoque'
        END,
        auth.uid(),
        farm_id_val
      );
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic inventory movement logging
CREATE TRIGGER inventory_movement_log
  AFTER INSERT OR UPDATE ON public.inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.log_inventory_movement();