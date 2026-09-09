-- Migration 041: Add 'deepseek' provider support to ai_configs and ai_usage_log

ALTER TABLE public.ai_configs DROP CONSTRAINT IF EXISTS ai_configs_provider_check;
ALTER TABLE public.ai_configs ADD CONSTRAINT ai_configs_provider_check 
  CHECK (provider = ANY (ARRAY['openai'::text, 'anthropic'::text, 'deepseek'::text]));

ALTER TABLE public.ai_usage_log DROP CONSTRAINT IF EXISTS ai_usage_log_provider_check;
ALTER TABLE public.ai_usage_log ADD CONSTRAINT ai_usage_log_provider_check 
  CHECK (provider = ANY (ARRAY['openai'::text, 'anthropic'::text, 'deepseek'::text]));
