import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'
import { loadEmbeddingsKey } from '@/lib/ai/config'
import { ingestDocument } from '@/lib/ai/knowledge'
import { PDFParse } from 'pdf-parse'

export const runtime = 'nodejs'

/**
 * POST /api/ai/knowledge/upload-pdf (admin+)
 *
 * Upload one or multiple PDF documents (e.g. price lists, product catalogs),
 * extract text server-side using pdf-parse, create ai_knowledge_documents rows,
 * and chunk + index them for semantic and lexical search.
 */
export async function POST(request: Request) {
  try {
    const { supabase, accountId, userId } = await requireRole('admin')
    const limit = checkRateLimit(`ai-kb-pdf:${userId}`, RATE_LIMITS.adminAction)
    if (!limit.success) return rateLimitResponse(limit)

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No se enviaron archivos PDF' },
        { status: 400 }
      )
    }

    const { key: embeddingsApiKey } = await loadEmbeddingsKey(
      supabase,
      accountId,
    )

    const processedDocs: { id: string; title: string; pages: number }[] = []

    for (const file of files) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        continue
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      const parser = new PDFParse({ data: buffer })
      const pdfData = await parser.getText()
      const cleanText = (pdfData.text || '')
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()

      if (!cleanText || cleanText.length < 20) {
        continue
      }

      const title = file.name.replace(/\.[^/.]+$/, '').trim() || 'Catálogo PDF'

      // Insert document
      const { data: doc, error: docErr } = await supabase
        .from('ai_knowledge_documents')
        .insert({
          account_id: accountId,
          created_by: userId,
          title,
          content: cleanText,
        })
        .select('id')
        .single()

      if (docErr || !doc) {
        console.error('[ai/knowledge/upload-pdf] insert error:', docErr)
        continue
      }

      // Chunk and index
      try {
        await ingestDocument(
          supabase,
          accountId,
          { embeddingsApiKey },
          doc.id,
          cleanText,
        )
        processedDocs.push({
          id: doc.id,
          title,
          pages: (pdfData as any).total || 1,
        })
      } catch (ingestErr) {
        console.error('[ai/knowledge/upload-pdf] ingest error:', ingestErr)
        processedDocs.push({
          id: doc.id,
          title,
          pages: (pdfData as any).total || 1,
        })
      }
    }

    if (processedDocs.length === 0) {
      return NextResponse.json(
        { error: 'No se pudo extraer texto válido de los archivos PDF suministrados.' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      count: processedDocs.length,
      documents: processedDocs,
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}
