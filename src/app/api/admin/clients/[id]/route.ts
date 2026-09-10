import { NextResponse } from 'next/server';
import { requireSaasAdmin } from '@/lib/auth/super-admin';
import { supabaseAdmin } from '@/lib/ai/admin-client';
import { toErrorResponse } from '@/lib/auth/account';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSaasAdmin();
    const { id } = await params;
    const admin = supabaseAdmin();

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Cuerpo de solicitud vacío' }, { status: 400 });
    }

    const {
      name,
      phone,
      owner_name,
      owner_email,
      new_password,
      plan_tier,
      is_active,
      payment_status,
      payment_notes,
      add_extra_messages,
      reset_usage,
      extend_days,
      new_cycle_date,
    } = body;

    const updates: Record<string, any> = {};

    if (typeof name === 'string' && name.trim()) {
      updates.name = name.trim();
    }

    if (phone !== undefined) {
      updates.phone = phone ? phone.trim() : null;
    }

    if (['basic', 'standard', 'pro', 'export'].includes(plan_tier)) {
      updates.plan_tier = plan_tier;
    }

    if (typeof is_active === 'boolean') {
      updates.is_active = is_active;
    }

    if (['paid', 'pending', 'overdue', 'cancelled'].includes(payment_status)) {
      updates.payment_status = payment_status;
    }

    if (payment_notes !== undefined) {
      updates.payment_notes = payment_notes;
    }

    if (reset_usage) {
      updates.messages_count = 0;
      updates.audios_count = 0;
      updates.ocr_count = 0;
      updates.daily_conversations_count = 0;
      updates.monthly_conversations_count = 0;
    }

    if (typeof add_extra_messages === 'number' && add_extra_messages !== 0) {
      const { data: currentAcc } = await admin
        .from('accounts')
        .select('extra_messages_balance')
        .eq('id', id)
        .single();

      const currentBalance = currentAcc?.extra_messages_balance || 0;
      updates.extra_messages_balance = Math.max(0, currentBalance + add_extra_messages);
    }

    if (typeof extend_days === 'number' && extend_days > 0) {
      const { data: currentAcc } = await admin
        .from('accounts')
        .select('cycle_reset_at')
        .eq('id', id)
        .single();

      const baseDate = currentAcc?.cycle_reset_at ? new Date(currentAcc.cycle_reset_at) : new Date();
      const start = baseDate.getTime() < Date.now() ? new Date() : baseDate;
      start.setDate(start.getDate() + extend_days);
      updates.cycle_reset_at = start.toISOString();
      updates.payment_status = 'paid';
    } else if (new_cycle_date) {
      updates.cycle_reset_at = new Date(new_cycle_date).toISOString();
    }

    // Handle Password Reset if requested
    if (typeof new_password === 'string' && new_password.trim()) {
      if (new_password.trim().length < 6) {
        return NextResponse.json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' }, { status: 400 });
      }
      const { data: acc } = await admin.from('accounts').select('owner_user_id').eq('id', id).single();
      if (acc?.owner_user_id) {
        const { error: pwdErr } = await admin.auth.admin.updateUserById(acc.owner_user_id, {
          password: new_password.trim(),
        });
        if (pwdErr) {
          console.error('[PATCH /api/admin/clients/[id]] password update error:', pwdErr);
          return NextResponse.json({ error: pwdErr.message || 'Error al restablecer contraseña' }, { status: 400 });
        }
      }
    }

    // Handle Owner Name / Email updates if requested
    if (typeof owner_name === 'string' || typeof owner_email === 'string') {
      const { data: acc } = await admin.from('accounts').select('owner_user_id').eq('id', id).single();
      if (acc?.owner_user_id) {
        const userUpdates: Record<string, any> = {};
        const profileUpdates: Record<string, any> = {};

        if (owner_email && owner_email.trim()) {
          userUpdates.email = owner_email.trim().toLowerCase();
          profileUpdates.email = owner_email.trim().toLowerCase();
        }
        if (owner_name && owner_name.trim()) {
          userUpdates.user_metadata = { full_name: owner_name.trim() };
          profileUpdates.full_name = owner_name.trim();
        }

        if (Object.keys(userUpdates).length > 0) {
          await admin.auth.admin.updateUserById(acc.owner_user_id, userUpdates);
        }
        if (Object.keys(profileUpdates).length > 0) {
          await admin.from('profiles').update(profileUpdates).eq('user_id', acc.owner_user_id);
        }
      }
    }

    if (Object.keys(updates).length > 0) {
      const { data: updated, error } = await admin
        .from('accounts')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error('[PATCH /api/admin/clients/[id]] update error:', error);
        return NextResponse.json({ error: 'Error al actualizar el cliente' }, { status: 500 });
      }

      return NextResponse.json({ success: true, account: updated });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
