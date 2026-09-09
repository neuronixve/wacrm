import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/flows/admin-client';
import {
  createEvolutionInstance,
  getEvolutionQrCode,
  getEvolutionConnectionState,
  configureEvolutionWebhook,
  logoutEvolutionInstance,
  deleteEvolutionInstance,
} from '@/lib/whatsapp/evolution-api';

async function resolveAccountId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('account_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data?.account_id) return null;
  return data.account_id as string;
}

/**
 * GET /api/whatsapp/evolution/instance
 * Returns the QR code and current connection state for this account's WhatsApp instance.
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accountId = await resolveAccountId(supabase, user.id);
    if (!accountId) {
      return NextResponse.json({ error: 'No account found' }, { status: 400 });
    }

    // 1. Get or initialize whatsapp_config row
    let { data: config } = await supabaseAdmin()
      .from('whatsapp_config')
      .select('*')
      .eq('account_id', accountId)
      .maybeSingle();

    const instanceName = config?.instance_name || `wacrm_${accountId.replace(/-/g, '').slice(0, 10)}`;

    if (!config) {
      const { data: newConfig, error: insertErr } = await supabaseAdmin()
        .from('whatsapp_config')
        .insert({
          account_id: accountId,
          user_id: user.id,
          provider: 'evolution',
          status: 'connecting',
          instance_name: instanceName,
          antiban_delay_min: 5,
          antiban_delay_max: 12,
        })
        .select('*')
        .single();

      if (insertErr) {
        console.error('[evolution/instance] Error creating initial config:', insertErr);
        return NextResponse.json({ error: 'Failed to initialize config' }, { status: 500 });
      }
      config = newConfig;
    } else if (!config.instance_name) {
      await supabaseAdmin()
        .from('whatsapp_config')
        .update({ instance_name: instanceName })
        .eq('id', config.id);
      config.instance_name = instanceName;
    }

    // 2. Check connection state first
    let connectionState = 'close';
    try {
      const stateRes = await getEvolutionConnectionState(instanceName);
      connectionState = stateRes.instance?.state || stateRes.state || 'close';
    } catch (e: any) {
      // Instance might not exist yet on Evolution API
      connectionState = 'close';
    }

    // Configure webhook with canonical public site URL
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    const webhookUrl = `${siteUrl.replace(/\/$/, '')}/api/whatsapp/evolution-webhook`;
    configureEvolutionWebhook(instanceName, webhookUrl).catch(() => {});

    if (connectionState === 'open') {
      if (config.status !== 'connected') {
        await supabaseAdmin()
          .from('whatsapp_config')
          .update({
            status: 'connected',
            connected_at: new Date().toISOString(),
            qr_code: null,
          })
          .eq('id', config.id);
      }
      return NextResponse.json({
        connected: true,
        state: 'open',
        instanceName,
        provider: config.provider,
        antiban_delay_min: config.antiban_delay_min ?? 5,
        antiban_delay_max: config.antiban_delay_max ?? 12,
      });
    }

    // 3. If not open, ensure instance exists and fetch QR
    let qrcode = config.qr_code || null;
    try {
      const createRes = await createEvolutionInstance(instanceName);
      if (createRes?.qrcode?.base64) {
        qrcode = createRes.qrcode.base64;
      }
    } catch (err: any) {
      console.warn('[evolution/instance] Instance note:', err.message);
    }

    if (!qrcode) {
      try {
        const qrRes = await getEvolutionQrCode(instanceName);
        qrcode = qrRes.base64 || qrRes.code || null;
      } catch (qrErr: any) {
        console.warn('[evolution/instance] QR fetch note:', qrErr.message);
      }
    }

    if (qrcode && qrcode !== config.qr_code) {
      await supabaseAdmin()
        .from('whatsapp_config')
        .update({ qr_code: qrcode, status: 'connecting' })
        .eq('id', config.id);
    }

    return NextResponse.json({
      connected: false,
      state: connectionState,
      instanceName,
      qrcode,
      provider: config.provider,
      antiban_delay_min: config.antiban_delay_min ?? 5,
      antiban_delay_max: config.antiban_delay_max ?? 12,
    });
  } catch (error: any) {
    console.error('[evolution/instance] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/whatsapp/evolution/instance
 * Updates provider or anti-ban delay configuration.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accountId = await resolveAccountId(supabase, user.id);
    if (!accountId) {
      return NextResponse.json({ error: 'No account found' }, { status: 400 });
    }

    const body = await request.json();
    const { provider, antiban_delay_min, antiban_delay_max } = body;

    const updates: Record<string, any> = {};
    if (provider && (provider === 'meta' || provider === 'evolution')) {
      updates.provider = provider;
    }
    if (typeof antiban_delay_min === 'number') {
      updates.antiban_delay_min = Math.max(1, antiban_delay_min);
    }
    if (typeof antiban_delay_max === 'number') {
      updates.antiban_delay_max = Math.max(updates.antiban_delay_min || 1, antiban_delay_max);
    }

    const { data: updated, error: updateErr } = await supabaseAdmin()
      .from('whatsapp_config')
      .update(updates)
      .eq('account_id', accountId)
      .select('*')
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, config: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/whatsapp/evolution/instance
 * Disconnects and removes instance from Evolution API.
 */
export async function DELETE() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accountId = await resolveAccountId(supabase, user.id);
    if (!accountId) {
      return NextResponse.json({ error: 'No account found' }, { status: 400 });
    }

    const { data: config } = await supabaseAdmin()
      .from('whatsapp_config')
      .select('id, instance_name')
      .eq('account_id', accountId)
      .maybeSingle();

    if (config?.instance_name) {
      try {
        await logoutEvolutionInstance(config.instance_name);
      } catch (e: any) {
        console.warn('[evolution/instance] Logout note:', e.message);
      }
      try {
        await deleteEvolutionInstance(config.instance_name);
      } catch (e: any) {
        console.warn('[evolution/instance] Delete note:', e.message);
      }
    }

    if (config) {
      await supabaseAdmin()
        .from('whatsapp_config')
        .update({
          status: 'disconnected',
          qr_code: null,
          connected_at: null,
        })
        .eq('id', config.id);
    }

    return NextResponse.json({ success: true, disconnected: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
