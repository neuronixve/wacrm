import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/flows/admin-client';
import { sanitizePhoneForMeta, isValidE164 } from '@/lib/whatsapp/phone-utils';
import { dispatchInboundToAiReply } from '@/lib/ai/auto-reply';
import {
  sendEvolutionTextMessage,
  getEvolutionMediaBase64,
  compressImageBase64,
} from '@/lib/whatsapp/evolution-api';

export const runtime = 'nodejs';

// GET verification for healthcheck
export async function GET() {
  return NextResponse.json({ status: 'active', provider: 'evolution' });
}

// POST - Evolution API Webhook
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const event = body.event || body.type;
    const instanceName = body.instance;
    const data = body.data;

    if (!instanceName) {
      return NextResponse.json({ received: true, ignored: 'missing instance' });
    }

    // Lookup config for this instance
    const { data: config, error: configError } = await supabaseAdmin()
      .from('whatsapp_config')
      .select('*')
      .eq('instance_name', instanceName)
      .maybeSingle();

    if (configError || !config) {
      console.warn(`[evolution-webhook] No config found for instance: ${instanceName}`);
      return NextResponse.json({ received: true, ignored: 'unrecognized instance' });
    }

    // Verify account is active (not suspended by Super Admin)
    const { data: account } = await supabaseAdmin()
      .from('accounts')
      .select('is_active')
      .eq('id', config.account_id)
      .maybeSingle();

    if (account && account.is_active === false) {
      console.warn(`[evolution-webhook] Account ${config.account_id} is suspended, ignoring message`);
      return NextResponse.json({ received: true, ignored: 'account_suspended' });
    }

    // 1. Connection update
    if (event === 'connection.update') {
      const state = data?.state;
      let status: 'connected' | 'disconnected' | 'connecting' = 'disconnected';
      if (state === 'open') status = 'connected';
      else if (state === 'connecting') status = 'connecting';

      await supabaseAdmin()
        .from('whatsapp_config')
        .update({
          status,
          connected_at: status === 'connected' ? new Date().toISOString() : null,
          qr_code: status === 'connected' ? null : config.qr_code,
        })
        .eq('id', config.id);

      return NextResponse.json({ received: true, handled: 'connection.update' });
    }

    // 2. QR Code updated
    if (event === 'qrcode.updated') {
      const qrBase64 = data?.qrcode?.base64 || data?.base64 || data?.code;
      if (qrBase64) {
        await supabaseAdmin()
          .from('whatsapp_config')
          .update({
            qr_code: qrBase64,
            status: 'connecting',
          })
          .eq('id', config.id);
      }
      return NextResponse.json({ received: true, handled: 'qrcode.updated' });
    }

    // 3. Inbound message (messages.upsert)
    if (event === 'messages.upsert') {
      const msg = data?.message;
      const key = data?.key;
      const remoteJid = key?.remoteJid || '';

      // Skip status broadcast and groups for now
      if (remoteJid === 'status@broadcast' || remoteJid.endsWith('@g.us')) {
        return NextResponse.json({ received: true, ignored: 'broadcast/group' });
      }

      const isFromMe = key?.fromMe === true;
      const waMessageId = key?.id;
      if (!waMessageId) {
        return NextResponse.json({ received: true, ignored: 'missing message id' });
      }

      // Customer phone
      const rawPhone = remoteJid.replace('@s.whatsapp.net', '');
      const sanitizedPhone = sanitizePhoneForMeta(rawPhone);
      if (!isValidE164(sanitizedPhone)) {
        return NextResponse.json({ received: true, ignored: 'invalid phone' });
      }

      const senderName = data?.pushName || sanitizedPhone;

      // Extract content and type
      let contentType = 'text';
      let contentText = '';
      let mediaUrl: string | null = null;
      let mediaType: string | null = null;

      if (msg?.conversation) {
        contentType = 'text';
        contentText = msg.conversation;
      } else if (msg?.extendedTextMessage?.text) {
        contentType = 'text';
        contentText = msg.extendedTextMessage.text;
      } else if (msg?.imageMessage) {
        contentType = 'image';
        mediaType = msg.imageMessage.mimetype || 'image/jpeg';
        contentText = msg.imageMessage.caption || '';
        // Fetch and compress image base64
        const rawB64 = await getEvolutionMediaBase64(instanceName, waMessageId);
        if (rawB64) {
          const compressed = await compressImageBase64(rawB64);
          mediaUrl = `data:image/jpeg;base64,${compressed}`;
        }
      } else if (msg?.videoMessage) {
        contentType = 'video';
        mediaType = msg.videoMessage.mimetype || 'video/mp4';
        mediaUrl = msg.videoMessage.url || null;
        contentText = msg.videoMessage.caption || '';
      } else if (msg?.audioMessage) {
        contentType = 'audio';
        mediaType = msg.audioMessage.mimetype || 'audio/ogg';
        const seconds = msg.audioMessage.seconds || 0;
        if (seconds <= 90) {
          const rawB64 = await getEvolutionMediaBase64(instanceName, waMessageId);
          if (rawB64) {
            mediaUrl = `data:${mediaType};base64,${rawB64}`;
          }
        }
      } else if (msg?.documentMessage) {
        contentType = 'document';
        mediaType = msg.documentMessage.mimetype || 'application/octet-stream';
        mediaUrl = msg.documentMessage.url || null;
        contentText = msg.documentMessage.fileName || msg.documentMessage.caption || '';
      } else if (msg?.buttonsResponseMessage) {
        contentType = 'interactive';
        contentText = msg.buttonsResponseMessage.selectedDisplayText || msg.buttonsResponseMessage.selectedButtonId || '';
      } else if (msg?.listResponseMessage) {
        contentType = 'interactive';
        contentText = msg.listResponseMessage.title || msg.listResponseMessage.singleSelectReply?.selectedRowId || '';
      }

      const accountId = config.account_id;
      const ownerUserId = config.user_id;

      // Find or create contact
      let contactId: string;
      const { data: existingContact } = await supabaseAdmin()
        .from('contacts')
        .select('id')
        .eq('account_id', accountId)
        .eq('phone', sanitizedPhone)
        .maybeSingle();

      if (existingContact) {
        contactId = existingContact.id;
      } else {
        const { data: newContact, error: createContactErr } = await supabaseAdmin()
          .from('contacts')
          .insert({
            account_id: accountId,
            user_id: ownerUserId,
            name: senderName,
            phone: sanitizedPhone,
          })
          .select('id')
          .single();

        if (createContactErr || !newContact) {
          console.error('[evolution-webhook] Error creating contact:', createContactErr);
          return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 });
        }
        contactId = newContact.id;
      }

      // Find or create conversation
      let conversationId: string;
      const { data: existingConv } = await supabaseAdmin()
        .from('conversations')
        .select('id')
        .eq('account_id', accountId)
        .eq('contact_id', contactId)
        .maybeSingle();

      if (existingConv) {
        conversationId = existingConv.id;
      } else {
        const { data: newConv, error: createConvErr } = await supabaseAdmin()
          .from('conversations')
          .insert({
            account_id: accountId,
            user_id: ownerUserId,
            contact_id: contactId,
            status: 'open',
            unread_count: 0,
          })
          .select('id')
          .single();

        if (createConvErr || !newConv) {
          console.error('[evolution-webhook] Error creating conversation:', createConvErr);
          return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
        }
        conversationId = newConv.id;
      }

      // Insert message idempotently
      const timestamp = data?.messageTimestamp
        ? new Date(Number(data.messageTimestamp) * 1000).toISOString()
        : new Date().toISOString();

      const senderType = isFromMe ? 'agent' : 'customer';

      const { data: insertedRows, error: msgInsertErr } = await supabaseAdmin()
        .from('messages')
        .upsert(
          {
            conversation_id: conversationId,
            sender_type: senderType,
            content_type: contentType,
            content_text: contentText || null,
            media_url: mediaUrl,
            media_type: mediaType,
            message_id: waMessageId,
            status: 'delivered',
            created_at: timestamp,
          },
          { onConflict: 'conversation_id,message_id', ignoreDuplicates: true }
        )
        .select('id');

      if (msgInsertErr) {
        console.error('[evolution-webhook] Error inserting message:', msgInsertErr);
        return NextResponse.json({ error: 'Failed to insert message' }, { status: 500 });
      }

      // If duplicate replay, ignore
      if (!insertedRows || insertedRows.length === 0) {
        return NextResponse.json({ received: true, ignored: 'duplicate replay' });
      }

      // Bump conversation & dispatch AI / SaaS quota checks
      if (!isFromMe) {
        await supabaseAdmin().rpc('bump_conversation_on_inbound', {
          p_conversation_id: conversationId,
          p_last_message_text: contentText || `[${contentType}]`,
        });

        // 1. Guardrail for long audio (>90s)
        const audioSeconds = msg?.audioMessage?.seconds || 0;
        if (contentType === 'audio' && audioSeconds > 90) {
          await sendEvolutionTextMessage(
            instanceName,
            sanitizedPhone,
            'El audio recibido dura más de 90 segundos. Para poder atenderte rápidamente, por favor envíanos un audio más breve (máximo 90 segundos) o tu consulta en texto.'
          );
          return NextResponse.json({ received: true, messageId: insertedRows[0].id, skippedAi: 'audio_too_long' });
        }

        // 2. SaaS Meta 24-Hour Conversation Session Window & Quota Check
        const { data: sessionData } = await supabaseAdmin().rpc('track_conversation_session', {
          p_account_id: accountId,
          p_conversation_id: conversationId,
        });

        if (sessionData && sessionData.allowed === false) {
          if (sessionData.error === 'daily_limit_reached') {
            console.warn(`[evolution-webhook] Account ${accountId} reached daily conversation limit`);
            await sendEvolutionTextMessage(
              instanceName,
              sanitizedPhone,
              'Hemos alcanzado el límite diario de conversaciones disponibles para nuestro servicio de atención. Por favor contáctanos nuevamente el día de mañana.'
            );
            return NextResponse.json({
              received: true,
              messageId: insertedRows[0].id,
              skippedAi: 'daily_conversations_exceeded',
            });
          }
        }

        // Audios and OCR consumption tracking
        const { data: acct } = await supabaseAdmin()
          .from('accounts')
          .select('audios_count, monthly_audio_limit, ocr_count, monthly_ocr_limit')
          .eq('id', accountId)
          .single();

        let quotaExceeded = false;
        if (acct) {
          const isOverAudioLimit = contentType === 'audio' && (acct.audios_count || 0) >= (acct.monthly_audio_limit || 200);
          const isOverOcrLimit = contentType === 'image' && (acct.ocr_count || 0) >= (acct.monthly_ocr_limit || 50);
          quotaExceeded = isOverAudioLimit || isOverOcrLimit;

          const updates: Record<string, number> = {};
          if (contentType === 'audio') {
            updates.audios_count = (acct.audios_count || 0) + 1;
          }
          if (contentType === 'image') {
            updates.ocr_count = (acct.ocr_count || 0) + 1;
          }
          if (Object.keys(updates).length > 0) {
            await supabaseAdmin().from('accounts').update(updates).eq('id', accountId);
          }
        }

        // 3. Dispatch AI Auto-Reply if within quota
        if (!quotaExceeded) {
          try {
            await dispatchInboundToAiReply({
              accountId,
              conversationId,
              contactId,
              configOwnerUserId: ownerUserId,
            });
          } catch (aiErr) {
            console.error('[evolution-webhook] AI reply error:', aiErr);
          }
        }
      } else {
        await supabaseAdmin()
          .from('conversations')
          .update({
            last_message_text: contentText || `[${contentType}]`,
            last_message_at: timestamp,
            updated_at: timestamp,
          })
          .eq('id', conversationId);
      }

      return NextResponse.json({ received: true, messageId: insertedRows[0].id });
    }

    // 4. Message status update
    if (event === 'messages.update') {
      const statusUpdates = Array.isArray(data) ? data : [data];
      for (const item of statusUpdates) {
        const id = item?.key?.id;
        const rawStatus = item?.update?.status;
        let status = 'sent';
        if (rawStatus === 3 || rawStatus === 'DELIVERY_ACK') status = 'delivered';
        else if (rawStatus === 4 || rawStatus === 'READ') status = 'read';

        if (id) {
          await supabaseAdmin()
            .from('messages')
            .update({ status })
            .eq('message_id', id);

          await supabaseAdmin()
            .from('broadcast_recipients')
            .update({ status })
            .eq('whatsapp_message_id', id);
        }
      }
      return NextResponse.json({ received: true, handled: 'messages.update' });
    }

    return NextResponse.json({ received: true, ignored: 'unhandled event' });
  } catch (error: any) {
    console.error('[evolution-webhook] Error processing webhook:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
