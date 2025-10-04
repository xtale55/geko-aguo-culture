-- 1. Adicionar tipo 'operator' ao enum user_type
ALTER TYPE user_type ADD VALUE IF NOT EXISTS 'operator';

-- 2. Adicionar coluna permissions na tabela invitations
ALTER TABLE invitations 
ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '{"manejos": false, "despesca": false, "estoque": false}'::jsonb;

-- 3. Criar tabela operator_permissions
CREATE TABLE IF NOT EXISTS operator_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  farm_id uuid REFERENCES farms(id) ON DELETE CASCADE NOT NULL,
  can_access_manejos boolean DEFAULT false,
  can_access_despesca boolean DEFAULT false,
  can_access_estoque boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, farm_id)
);

-- Enable RLS
ALTER TABLE operator_permissions ENABLE ROW LEVEL SECURITY;

-- 4. Security definer function para verificar permissões
CREATE OR REPLACE FUNCTION has_operator_permission(
  _user_id uuid, 
  _farm_id uuid, 
  _permission text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE _permission
    WHEN 'manejos' THEN can_access_manejos
    WHEN 'despesca' THEN can_access_despesca
    WHEN 'estoque' THEN can_access_estoque
    ELSE false
  END
  FROM operator_permissions
  WHERE user_id = _user_id AND farm_id = _farm_id
$$;

-- 5. RLS Policies para operator_permissions
CREATE POLICY "Users can view own permissions"
ON operator_permissions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Farm owners can manage operator permissions"
ON operator_permissions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM farms 
    WHERE farms.id = operator_permissions.farm_id 
    AND farms.user_id = auth.uid()
  )
);

-- 6. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_operator_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER operator_permissions_updated_at
BEFORE UPDATE ON operator_permissions
FOR EACH ROW
EXECUTE FUNCTION update_operator_permissions_updated_at();