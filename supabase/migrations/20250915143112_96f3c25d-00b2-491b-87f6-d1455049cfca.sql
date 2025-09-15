-- Criar tabela de receitas de mistura
CREATE TABLE public.mixture_recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  farm_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Mistura',
  description TEXT,
  total_yield_grams INTEGER NOT NULL DEFAULT 0,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de ingredientes das receitas
CREATE TABLE public.mixture_ingredients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL,
  inventory_item_id UUID NOT NULL,
  inventory_item_name TEXT NOT NULL,
  quantity_ratio NUMERIC NOT NULL CHECK (quantity_ratio > 0 AND quantity_ratio <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS nas tabelas
ALTER TABLE public.mixture_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mixture_ingredients ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para mixture_recipes
CREATE POLICY "Users can view recipes from own farms" 
ON public.mixture_recipes 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM farms 
  WHERE farms.id = mixture_recipes.farm_id 
  AND farms.user_id = auth.uid()
));

CREATE POLICY "Users can insert recipes to own farms" 
ON public.mixture_recipes 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM farms 
  WHERE farms.id = mixture_recipes.farm_id 
  AND farms.user_id = auth.uid()
));

CREATE POLICY "Users can update recipes from own farms" 
ON public.mixture_recipes 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM farms 
  WHERE farms.id = mixture_recipes.farm_id 
  AND farms.user_id = auth.uid()
));

CREATE POLICY "Users can delete recipes from own farms" 
ON public.mixture_recipes 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM farms 
  WHERE farms.id = mixture_recipes.farm_id 
  AND farms.user_id = auth.uid()
));

-- Políticas RLS para mixture_ingredients  
CREATE POLICY "Users can view ingredients from own farms" 
ON public.mixture_ingredients 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM mixture_recipes mr
  JOIN farms f ON mr.farm_id = f.id
  WHERE mr.id = mixture_ingredients.recipe_id 
  AND f.user_id = auth.uid()
));

CREATE POLICY "Users can insert ingredients to own farms" 
ON public.mixture_ingredients 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM mixture_recipes mr
  JOIN farms f ON mr.farm_id = f.id
  WHERE mr.id = mixture_ingredients.recipe_id 
  AND f.user_id = auth.uid()
));

CREATE POLICY "Users can update ingredients from own farms" 
ON public.mixture_ingredients 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM mixture_recipes mr
  JOIN farms f ON mr.farm_id = f.id
  WHERE mr.id = mixture_ingredients.recipe_id 
  AND f.user_id = auth.uid()
));

CREATE POLICY "Users can delete ingredients from own farms" 
ON public.mixture_ingredients 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM mixture_recipes mr
  JOIN farms f ON mr.farm_id = f.id
  WHERE mr.id = mixture_ingredients.recipe_id 
  AND f.user_id = auth.uid()
));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_mixture_recipes_updated_at
  BEFORE UPDATE ON public.mixture_recipes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();