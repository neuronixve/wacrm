-- 040_evolution_api_qr.sql
-- Support Hybrid WhatsApp: Official Meta Cloud API or WhatsApp QR (Evolution API)

-- 1. Add provider column ('meta' or 'evolution')
ALTER TABLE whatsapp_config 
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'meta'
  CHECK (provider IN ('meta', 'evolution'));

-- 2. Make phone_number_id and access_token nullable
ALTER TABLE whatsapp_config 
  ALTER COLUMN phone_number_id DROP NOT NULL,
  ALTER COLUMN access_token DROP NOT NULL;

-- 3. Add Evolution API & Anti-ban columns
ALTER TABLE whatsapp_config
  ADD COLUMN IF NOT EXISTS instance_name TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS instance_token TEXT,
  ADD COLUMN IF NOT EXISTS qr_code TEXT,
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS battery_level INTEGER,
  ADD COLUMN IF NOT EXISTS antiban_delay_min INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS antiban_delay_max INTEGER NOT NULL DEFAULT 12;

-- 4. Update status check to include 'connecting'
ALTER TABLE whatsapp_config DROP CONSTRAINT IF EXISTS whatsapp_config_status_check;
ALTER TABLE whatsapp_config ADD CONSTRAINT whatsapp_config_status_check 
  CHECK (status IN ('connected', 'disconnected', 'connecting'));

CREATE INDEX IF NOT EXISTS idx_whatsapp_config_instance_name ON whatsapp_config(instance_name);
