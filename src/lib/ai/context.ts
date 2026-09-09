import type { SupabaseClient } from '@supabase/supabase-js'
import type { ChatMessage } from './types'
import { aiContextMessageLimit } from './defaults'

interface DbMessage {
  sender_type: 'customer' | 'agent' | 'bot'
  content_type?: string | null
  content_text: string | null
  media_url?: string | null
  media_type?: string | null
}

/**
 * Fetch the last N messages of a conversation and map them to the
 * provider-neutral chat shape. Supports text, image, and audio messages.
 */
export async function buildConversationContext(
  db: SupabaseClient,
  conversationId: string,
  limit: number = aiContextMessageLimit(),
): Promise<ChatMessage[]> {
  const { data, error } = await db
    .from('messages')
    .select('sender_type, content_type, content_text, media_url, media_type')
    .eq('conversation_id', conversationId)
    .in('content_type', ['text', 'image', 'audio'])
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error

  const rows = ((data ?? []) as DbMessage[]).reverse()
  return rows.map((m) => {
    let content = (m.content_text || '').trim()
    let media = undefined

    if (m.content_type === 'audio') {
      if (!content) content = '[Nota de voz]'
      if (m.media_url && m.media_url.startsWith('data:')) {
        const parts = m.media_url.split(',')
        const mime = parts[0].split(';')[0].replace('data:', '')
        media = {
          type: 'audio' as const,
          mimeType: mime || m.media_type || 'audio/ogg',
          base64: parts[1] || '',
        }
      }
    } else if (m.content_type === 'image') {
      if (!content) content = '[Comprobante de pago / Imagen]'
      if (m.media_url && m.media_url.startsWith('data:')) {
        const parts = m.media_url.split(',')
        const mime = parts[0].split(';')[0].replace('data:', '')
        media = {
          type: 'image' as const,
          mimeType: mime || m.media_type || 'image/jpeg',
          base64: parts[1] || '',
        }
      }
    }

    return {
      role: m.sender_type === 'customer' ? ('user' as const) : ('assistant' as const),
      content,
      ...(media ? { media } : {}),
    }
  })
}
