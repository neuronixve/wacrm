import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { supabaseAdmin } from '@/lib/ai/admin-client';
import { toErrorResponse } from '@/lib/auth/account';

export async function GET() {
  try {
    await requireSuperAdmin();
    const admin = supabaseAdmin();

    // 1. Fetch all accounts with owner profile
    const { data: accounts, error: accError } = await admin
      .from('accounts')
      .select(`
        id,
        name,
        created_at,
        plan_tier,
        is_active,
        payment_status,
        payment_notes,
        phone,
        max_agents,
        daily_conversation_limit,
        daily_conversations_count,
        monthly_conversations_count,
        monthly_conversation_limit,
        monthly_message_limit,
        monthly_audio_limit,
        monthly_ocr_limit,
        messages_count,
        audios_count,
        ocr_count,
        extra_messages_balance,
        cycle_reset_at,
        owner_user_id
      `)
      .order('created_at', { ascending: false });

    if (accError) {
      console.error('[GET /api/admin/clients] fetch accounts error:', accError);
      return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
    }

    // 2. Fetch profiles to get owner names/emails and count team members per account
    const { data: profiles, error: profError } = await admin
      .from('profiles')
      .select('id, user_id, full_name, email, account_id, account_role');

    if (profError) {
      console.error('[GET /api/admin/clients] fetch profiles error:', profError);
    }

    const profilesList = profiles || [];

    // Map accounts with owner and member count
    const enrichedAccounts = (accounts || []).map((acc) => {
      const ownerProfile = profilesList.find(
        (p) => p.user_id === acc.owner_user_id || (p.account_id === acc.id && p.account_role === 'owner')
      );
      const memberCount = profilesList.filter((p) => p.account_id === acc.id).length;

      return {
        ...acc,
        owner_name: ownerProfile?.full_name || 'Sin nombre',
        owner_email: ownerProfile?.email || 'Sin correo',
        members_count: memberCount || 1,
      };
    });

    // 3. Calculate Platform Overview KPIs
    const PLAN_PRICES: Record<string, number> = {
      basic: 25,
      standard: 45,
      pro: 85,
      export: 120,
    };

    let totalActive = 0;
    let totalSuspended = 0;
    let estimatedMrr = 0;
    let totalMessagesMonth = 0;
    let totalAudiosMonth = 0;
    let totalOcrMonth = 0;

    for (const acc of enrichedAccounts) {
      if (acc.is_active) {
        totalActive++;
        estimatedMrr += PLAN_PRICES[acc.plan_tier] || 25;
      } else {
        totalSuspended++;
      }
      totalMessagesMonth += acc.messages_count || 0;
      totalAudiosMonth += acc.audios_count || 0;
      totalOcrMonth += acc.ocr_count || 0;
    }

    return NextResponse.json({
      metrics: {
        total_accounts: enrichedAccounts.length,
        total_active: totalActive,
        total_suspended: totalSuspended,
        estimated_mrr: estimatedMrr,
        total_messages_month: totalMessagesMonth,
        total_audios_month: totalAudiosMonth,
        total_ocr_month: totalOcrMonth,
      },
      clients: enrichedAccounts,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    await requireSuperAdmin();
    const admin = supabaseAdmin();

    const body = await request.json().catch(() => null);
    const {
      companyName,
      ownerName,
      ownerEmail,
      phone,
      password,
      planTier = 'basic',
      cycleDays = 30,
      paymentNotes = '',
    } = body || {};

    if (!companyName?.trim() || !ownerEmail?.trim() || !password?.trim()) {
      return NextResponse.json(
        { error: 'Empresa, correo y contraseña son obligatorios' },
        { status: 400 }
      );
    }

    if (!['basic', 'standard', 'pro', 'export'].includes(planTier)) {
      return NextResponse.json({ error: 'Plan inválido' }, { status: 400 });
    }

    // 1. Create auth user in Supabase Auth
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: ownerEmail.trim().toLowerCase(),
      password: password.trim(),
      email_confirm: true,
      user_metadata: {
        full_name: ownerName?.trim() || companyName.trim(),
        phone: phone?.trim() || '',
      },
    });

    if (authError || !authData?.user) {
      console.error('[POST /api/admin/clients] create user error:', authError);
      return NextResponse.json(
        { error: authError?.message || 'Error al crear usuario del cliente' },
        { status: 400 }
      );
    }

    const newUserId = authData.user.id;

    // 2. Wait slightly for handle_new_user trigger to execute if needed, or query account
    let account = null;
    for (let i = 0; i < 5; i++) {
      const { data } = await admin
        .from('accounts')
        .select('*')
        .eq('owner_user_id', newUserId)
        .maybeSingle();

      if (data) {
        account = data;
        break;
      }
      await new Promise((r) => setTimeout(r, 400));
    }

    const resetDate = new Date();
    resetDate.setDate(resetDate.getDate() + Number(cycleDays || 30));

    // If account was created by trigger, update it; otherwise create it explicitly
    if (account) {
      const { data: updatedAcc, error: updateErr } = await admin
        .from('accounts')
        .update({
          name: companyName.trim(),
          phone: phone?.trim() || null,
          plan_tier: planTier,
          cycle_reset_at: resetDate.toISOString(),
          is_active: true,
          payment_status: 'paid',
          payment_notes: paymentNotes || null,
        })
        .eq('id', account.id)
        .select('*')
        .single();

      if (updateErr) {
        console.error('[POST /api/admin/clients] update account error:', updateErr);
      }
      account = updatedAcc || account;
    } else {
      const { data: newAcc, error: accCreateErr } = await admin
        .from('accounts')
        .insert({
          name: companyName.trim(),
          phone: phone?.trim() || null,
          owner_user_id: newUserId,
          plan_tier: planTier,
          cycle_reset_at: resetDate.toISOString(),
          is_active: true,
          payment_status: 'paid',
          payment_notes: paymentNotes || null,
        })
        .select('*')
        .single();

      if (accCreateErr) {
        console.error('[POST /api/admin/clients] create account error:', accCreateErr);
        return NextResponse.json({ error: 'Error al inicializar cuenta de empresa' }, { status: 500 });
      }
      account = newAcc;

      // Ensure profile is created
      await admin.from('profiles').upsert({
        user_id: newUserId,
        full_name: ownerName?.trim() || companyName.trim(),
        email: ownerEmail.trim().toLowerCase(),
        account_id: account.id,
        account_role: 'owner',
      });
    }

    return NextResponse.json({
      success: true,
      client: {
        id: account.id,
        name: account.name,
        plan_tier: account.plan_tier,
        cycle_reset_at: account.cycle_reset_at,
        owner_name: ownerName?.trim() || companyName.trim(),
        owner_email: ownerEmail.trim().toLowerCase(),
      },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
