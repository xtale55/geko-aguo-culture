-- Criar tabela para funcionários da fazenda
CREATE TABLE public.farm_employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  farm_id UUID NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT 'produção',
  phone TEXT,
  email TEXT,
  hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
  salary NUMERIC,
  status TEXT NOT NULL DEFAULT 'ativo',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.farm_employees ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view employees from own farms" 
ON public.farm_employees 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM farms 
  WHERE farms.id = farm_employees.farm_id 
  AND farms.user_id = auth.uid()
));

CREATE POLICY "Users can create employees in own farms" 
ON public.farm_employees 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM farms 
  WHERE farms.id = farm_employees.farm_id 
  AND farms.user_id = auth.uid()
));

CREATE POLICY "Users can update employees from own farms" 
ON public.farm_employees 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM farms 
  WHERE farms.id = farm_employees.farm_id 
  AND farms.user_id = auth.uid()
));

CREATE POLICY "Users can delete employees from own farms" 
ON public.farm_employees 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM farms 
  WHERE farms.id = farm_employees.farm_id 
  AND farms.user_id = auth.uid()
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_farm_employees_updated_at
BEFORE UPDATE ON public.farm_employees
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();