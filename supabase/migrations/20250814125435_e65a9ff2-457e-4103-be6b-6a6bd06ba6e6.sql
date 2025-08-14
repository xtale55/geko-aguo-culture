-- Migração para Sistema Anti-Drift: Conversão para Gramas (Inteiros)

-- 1. Backup das colunas atuais (segurança)
ALTER TABLE inventory ADD COLUMN quantity_backup NUMERIC;
ALTER TABLE feeding_records ADD COLUMN actual_amount_backup NUMERIC;
ALTER TABLE feeding_records ADD COLUMN planned_amount_backup NUMERIC;
ALTER TABLE input_applications ADD COLUMN quantity_applied_backup NUMERIC;

-- 2. Backup dos dados existentes
UPDATE inventory SET quantity_backup = quantity;
UPDATE feeding_records SET actual_amount_backup = actual_amount;
UPDATE feeding_records SET planned_amount_backup = planned_amount;
UPDATE input_applications SET quantity_applied_backup = quantity_applied;

-- 3. Conversão: kg → gramas (multiplicar por 1000)
UPDATE inventory SET quantity = ROUND(quantity * 1000);
UPDATE feeding_records SET actual_amount = ROUND(actual_amount * 1000);
UPDATE feeding_records SET planned_amount = ROUND(planned_amount * 1000);
UPDATE input_applications SET quantity_applied = ROUND(quantity_applied * 1000);

-- 4. Alteração dos tipos para INTEGER (precisão exata)
ALTER TABLE inventory ALTER COLUMN quantity TYPE INTEGER USING quantity::INTEGER;
ALTER TABLE feeding_records ALTER COLUMN actual_amount TYPE INTEGER USING actual_amount::INTEGER;
ALTER TABLE feeding_records ALTER COLUMN planned_amount TYPE INTEGER USING planned_amount::INTEGER;
ALTER TABLE input_applications ALTER COLUMN quantity_applied TYPE INTEGER USING quantity_applied::INTEGER;

-- 5. Adicionar constraints para evitar valores negativos
ALTER TABLE inventory ADD CONSTRAINT inventory_quantity_non_negative CHECK (quantity >= 0);
ALTER TABLE feeding_records ADD CONSTRAINT feeding_records_actual_amount_non_negative CHECK (actual_amount >= 0);
ALTER TABLE feeding_records ADD CONSTRAINT feeding_records_planned_amount_non_negative CHECK (planned_amount >= 0);
ALTER TABLE input_applications ADD CONSTRAINT input_applications_quantity_applied_non_negative CHECK (quantity_applied >= 0);