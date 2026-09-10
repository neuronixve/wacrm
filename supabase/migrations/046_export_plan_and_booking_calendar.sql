-- Migration 046: Export Plan (International Trade) Tier, Booking Calendar URL, and B2B Exporter Mode

-- 1. Update plan_tier check constraint on accounts to include 'export'
ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS accounts_plan_tier_check;
ALTER TABLE public.accounts ADD CONSTRAINT accounts_plan_tier_check 
  CHECK (plan_tier IN ('basic', 'standard', 'pro', 'export'));

-- 2. Add booking_calendar_url and company phone to accounts if not exists
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS booking_calendar_url text;

-- 3. Add booking_calendar_url and is_export_mode to ai_configs
ALTER TABLE public.ai_configs
  ADD COLUMN IF NOT EXISTS booking_calendar_url text,
  ADD COLUMN IF NOT EXISTS is_export_mode boolean NOT NULL DEFAULT false;

-- 4. Update sync_account_plan_limits trigger function to support 'export' plan tier
CREATE OR REPLACE FUNCTION public.sync_account_plan_limits()
RETURNS trigger AS $$
BEGIN
  IF NEW.plan_tier IS DISTINCT FROM OLD.plan_tier OR TG_OP = 'INSERT' THEN
    IF NEW.plan_tier = 'basic' THEN
      NEW.max_agents := 1;
      NEW.daily_conversation_limit := 50;
      NEW.monthly_conversation_limit := 1500;
      NEW.monthly_message_limit := 1500;
      NEW.monthly_audio_limit := 200;
      NEW.monthly_ocr_limit := 50;
    ELSIF NEW.plan_tier = 'standard' THEN
      NEW.max_agents := 3;
      NEW.daily_conversation_limit := 150;
      NEW.monthly_conversation_limit := 4500;
      NEW.monthly_message_limit := 4500;
      NEW.monthly_audio_limit := 800;
      NEW.monthly_ocr_limit := 200;
    ELSIF NEW.plan_tier = 'pro' THEN
      NEW.max_agents := 10;
      NEW.daily_conversation_limit := 400;
      NEW.monthly_conversation_limit := 12000;
      NEW.monthly_message_limit := 12000;
      NEW.monthly_audio_limit := 2500;
      NEW.monthly_ocr_limit := 999999; -- Unlimited
    ELSIF NEW.plan_tier = 'export' THEN
      NEW.max_agents := 5;
      NEW.daily_conversation_limit := 250;
      NEW.monthly_conversation_limit := 7500;
      NEW.monthly_message_limit := 7500;
      NEW.monthly_audio_limit := 1500;
      NEW.monthly_ocr_limit := 999999; -- Unlimited (fichas técnicas e inspecciones)
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
