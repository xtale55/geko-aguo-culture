-- Criar enum para tipos de usuário
CREATE TYPE public.user_type AS ENUM ('farm_owner', 'technician');

-- Adicionar coluna user_type à tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN user_type public.user_type NOT NULL DEFAULT 'farm_owner';

-- Atualizar função handle_new_user para incluir user_type
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public 
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, user_type)
  VALUES (
    new.id, 
    new.raw_user_meta_data ->> 'full_name',
    COALESCE(new.raw_user_meta_data ->> 'user_type', 'farm_owner')::public.user_type
  );
  RETURN new;
END;
$$;