-- Criar função otimizada para buscar itens de ração incluindo misturas
CREATE OR REPLACE FUNCTION public.get_feed_items_optimized(farm_id_param UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  quantity INTEGER,
  unit_price NUMERIC,
  category TEXT
) 
LANGUAGE sql
STABLE
AS $$
  WITH feed_items AS (
    -- Buscar rações diretamente
    SELECT i.id, i.name, i.quantity, i.unit_price, i.category
    FROM inventory i
    WHERE i.farm_id = farm_id_param
      AND i.category = 'Ração'
      AND i.quantity > 0
  ),
  feed_mixtures AS (
    -- Buscar misturas que contêm ração
    SELECT DISTINCT i.id, i.name, i.quantity, i.unit_price, i.category
    FROM inventory i
    JOIN mixture_recipes mr ON mr.name = i.name AND mr.farm_id = i.farm_id
    JOIN mixture_ingredients mi ON mi.recipe_id = mr.id
    JOIN inventory ing ON ing.id = mi.inventory_item_id
    WHERE i.farm_id = farm_id_param
      AND i.category = 'Mistura'
      AND i.quantity > 0
      AND ing.category = 'Ração'
  )
  SELECT * FROM feed_items
  UNION ALL
  SELECT * FROM feed_mixtures
  ORDER BY name;
$$;