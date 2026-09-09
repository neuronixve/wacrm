-- Migration 042: SaaS Plan Tiers, Quotas, and Gemini AI Provider Support

-- 1. Update AI providers check constraint
ALTER TABLE public.ai_configs DROP CONSTRAINT IF EXISTS ai_configs_provider_check;
ALTER TABLE public.ai_configs ADD CONSTRAINT ai_configs_provider_check 
  CHECK (provider = ANY (ARRAY['openai'::text, 'anthropic'::text, 'deepseek'::text, 'gemini'::text]));

ALTER TABLE public.ai_usage_log DROP CONSTRAINT IF EXISTS ai_usage_log_provider_check;
ALTER TABLE public.ai_usage_log ADD CONSTRAINT ai_usage_log_provider_check 
  CHECK (provider = ANY (ARRAY['openai'::text, 'anthropic'::text, 'deepseek'::text, 'gemini'::text]));

-- 2. Add SaaS Plan & Quota columns to accounts table
ALTER TABLE public.accounts 
  ADD COLUMN IF NOT EXISTS plan_tier text NOT NULL DEFAULT 'basic' CHECK (plan_tier IN ('basic', 'standard', 'pro')),
  ADD COLUMN IF NOT EXISTS max_agents integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS monthly_message_limit integer NOT NULL DEFAULT 1500,
  ADD COLUMN IF NOT EXISTS monthly_audio_limit integer NOT NULL DEFAULT 200,
  ADD COLUMN IF NOT EXISTS monthly_ocr_limit integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS messages_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS audios_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ocr_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extra_messages_balance integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cycle_reset_at timestamptz NOT NULL DEFAULT (now() + interval '30 days');

-- Function to set plan defaults on account update
CREATE OR REPLACE FUNCTION public.sync_account_plan_limits()
RETURNS trigger AS $$
BEGIN
  IF NEW.plan_tier IS DISTINCT FROM OLD.plan_tier THEN
    IF NEW.plan_tier = 'basic' THEN
      NEW.max_agents := 1;
      NEW.monthly_message_limit := 1500;
      NEW.monthly_audio_limit := 200;
      NEW.monthly_ocr_limit := 50;
    ELSIF NEW.plan_tier = 'standard' THEN
      NEW.max_agents := 3;
      NEW.monthly_message_limit := 4500;
      NEW.monthly_audio_limit := 800;
      NEW.monthly_ocr_limit := 200;
    ELSIF NEW.plan_tier = 'pro' THEN
      NEW.max_agents := 10;
      NEW.monthly_message_limit := 12000;
      NEW.monthly_audio_limit := 2500;
      NEW.monthly_ocr_limit := 999999; -- Unlimited
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_account_plan_limits ON public.accounts;
CREATE TRIGGER trg_sync_account_plan_limits
  BEFORE UPDATE OF plan_tier ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_account_plan_limits();
