-- Adicionar campo para limite mínimo personalizado por item de inventário
ALTER TABLE public.inventory 
ADD COLUMN minimum_stock_threshold INTEGER;

-- Comentário explicativo da coluna
COMMENT ON COLUMN public.inventory.minimum_stock_threshold IS 'Limite mínimo personalizado para alertas de estoque (em gramas). Se NULL, usa o padrão da categoria.';