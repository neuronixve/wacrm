import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/flows/admin-client';
import { sanitizePhoneForMeta, isValidE164 } from '@/lib/whatsapp/phone-utils';

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
        mediaUrl = msg.imageMessage.url || null;
        contentText = msg.imageMessage.caption || '';
      } else if (msg?.videoMessage) {
        contentType = 'video';
        mediaType = msg.videoMessage.mimetype || 'video/mp4';
        mediaUrl = msg.videoMessage.url || null;
        contentText = msg.videoMessage.caption || '';
      } else if (msg?.audioMessage) {
        contentType = 'audio';
        mediaType = msg.audioMessage.mimetype || 'audio/ogg';
        mediaUrl = msg.audioMessage.url || null;
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

      // Bump conversation
      if (!isFromMe) {
        await supabaseAdmin().rpc('bump_conversation_on_inbound', {
          p_conversation_id: conversationId,
          p_last_message_text: contentText || `[${contentType}]`,
        });
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
