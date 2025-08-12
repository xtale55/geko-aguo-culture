-- Enable leaked password protection in Supabase Auth
UPDATE auth.config 
SET leaked_password_protection = true
WHERE parameter = 'leaked_password_protection';

-- If the setting doesn't exist, insert it
INSERT INTO auth.config (parameter, value)
SELECT 'leaked_password_protection', 'true'
WHERE NOT EXISTS (
    SELECT 1 FROM auth.config WHERE parameter = 'leaked_password_protection'
);