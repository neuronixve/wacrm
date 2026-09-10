-- Migration 044: Meta 24-hour Conversation Session Windows, Support Role, and Company Phone

-- 1. Add session window columns to conversations
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS session_window_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS current_session_started_at timestamptz;

-- 2. Add daily and monthly conversation limits to accounts
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS daily_conversation_limit integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS daily_conversations_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_conversations_date date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS monthly_conversations_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_conversation_limit integer NOT NULL DEFAULT 1500,
  ADD COLUMN IF NOT EXISTS phone text;

-- 3. Update sync_account_plan_limits function to configure conversation limits
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
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. RPC function to evaluate and open 24h Meta conversation sessions atomically
CREATE OR REPLACE FUNCTION public.track_conversation_session(p_account_id uuid, p_conversation_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_conv public.conversations%ROWTYPE;
  v_acc public.accounts%ROWTYPE;
  v_now timestamptz := now();
  v_today date := CURRENT_DATE;
  v_session_expires timestamptz;
BEGIN
  -- Lock conversation row
  SELECT * INTO v_conv FROM public.conversations WHERE id = p_conversation_id AND account_id = p_account_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'conversation_not_found');
  END IF;

  -- If session is already open and active within the 24-hour window, allow with 0 credit deduction
  IF v_conv.session_window_expires_at IS NOT NULL AND v_conv.session_window_expires_at > v_now THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'new_session', false,
      'expires_at', v_conv.session_window_expires_at
    );
  END IF;

  -- Window expired or non-existent: Need to open a NEW 24-hour conversation session
  SELECT * INTO v_acc FROM public.accounts WHERE id = p_account_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'account_not_found');
  END IF;

  -- Check if account is suspended
  IF v_acc.is_active = false THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'account_suspended');
  END IF;

  -- Daily counter rollover check
  IF v_acc.daily_conversations_date IS DISTINCT FROM v_today THEN
    v_acc.daily_conversations_count := 0;
    v_acc.daily_conversations_date := v_today;
  END IF;

  -- Check daily limit & extra balance
  IF v_acc.daily_conversations_count >= v_acc.daily_conversation_limit THEN
    IF v_acc.extra_messages_balance > 0 THEN
      v_acc.extra_messages_balance := v_acc.extra_messages_balance - 1;
    ELSE
      RETURN jsonb_build_object(
        'allowed', false,
        'error', 'daily_limit_reached',
        'limit', v_acc.daily_conversation_limit,
        'count', v_acc.daily_conversations_count
      );
    END IF;
  ELSE
    v_acc.daily_conversations_count := v_acc.daily_conversations_count + 1;
  END IF;

  v_acc.monthly_conversations_count := v_acc.monthly_conversations_count + 1;
  v_session_expires := v_now + interval '24 hours';

  -- Update account counters
  UPDATE public.accounts
  SET daily_conversations_count = v_acc.daily_conversations_count,
      daily_conversations_date = v_acc.daily_conversations_date,
      monthly_conversations_count = v_acc.monthly_conversations_count,
      extra_messages_balance = v_acc.extra_messages_balance
  WHERE id = p_account_id;

  -- Update conversation 24-hour session window
  UPDATE public.conversations
  SET session_window_expires_at = v_session_expires,
      current_session_started_at = v_now
  WHERE id = p_conversation_id;

  RETURN jsonb_build_object(
    'allowed', true,
    'new_session', true,
    'expires_at', v_session_expires,
    'daily_count', v_acc.daily_conversations_count,
    'daily_limit', v_acc.daily_conversation_limit
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
