-- Migration 047: AI Auto-Reply filters for new contacts only

ALTER TABLE public.ai_configs
  ADD COLUMN IF NOT EXISTS auto_reply_only_new_contacts boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_reply_ignore_saved_contacts boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_reply_ignore_existing_conversations boolean NOT NULL DEFAULT true;
