import { AiError, type ProviderResult } from '../types'
import { MAX_OUTPUT_TOKENS } from '../defaults'
import {
  normalizeUsage,
  providerHttpError,
  toNetworkError,
  type ProviderArgs,
} from './shared'

interface GeminiResponse {
  candidates?: {
    content?: {
      parts?: { text?: string }[]
      role?: string
    }
    finishReason?: string
  }[]
  usageMetadata?: {
    promptTokenCount?: number
    candidatesTokenCount?: number
    totalTokenCount?: number
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Call Google Gemini API with text, audio, or images.
 * Includes automatic model fallback and retry for 503/429/404 errors.
 */
export async function generateGemini(args: ProviderArgs): Promise<ProviderResult> {
  const { apiKey, model, systemPrompt, messages, timeoutMs } = args
  const requestedModel = model || 'gemini-flash-latest'

  // Standard production fallback list if the requested model returns 404, 503, or 429
  const candidateModels = [
    requestedModel,
    'gemini-flash-latest',
    'gemini-2.5-flash',
  ].filter((m, i, arr) => m && arr.indexOf(m) === i)

  // Consolidate consecutive messages with the same role into a single turn,
  // ensuring Gemini API requirements (strictly alternating user -> model -> user)
  const rawTurns: { role: string; parts: any[] }[] = []
  for (const m of messages) {
    const role = m.role === 'assistant' ? 'model' : 'user'
    const parts: any[] = []

    if (m.media) {
      parts.push({
        inlineData: {
          mimeType: m.media.mimeType,
          data: m.media.base64,
        },
      })
    }
    if (m.content) {
      parts.push({ text: m.content })
    }
    if (parts.length === 0) {
      parts.push({ text: ' ' })
    }

    const prev = rawTurns[rawTurns.length - 1]
    if (prev && prev.role === role) {
      prev.parts.push(...parts)
    } else {
      rawTurns.push({ role, parts })
    }
  }

  // Ensure first turn has role 'user'
  if (rawTurns.length > 0 && rawTurns[0].role === 'model') {
    rawTurns.unshift({ role: 'user', parts: [{ text: 'Hola' }] })
  }

  const contents = rawTurns.length > 0 ? rawTurns : [{ role: 'user', parts: [{ text: ' ' }] }]

  let lastError: unknown = null

  for (const currentModel of candidateModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(currentModel)}:generateContent?key=${apiKey}`

    // Up to 2 attempts per model (for transient 503 high demand or 429)
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemPrompt }],
            },
            contents,
            generationConfig: {
              maxOutputTokens: MAX_OUTPUT_TOKENS,
              temperature: 0.7,
            },
          }),
          signal: AbortSignal.timeout(timeoutMs),
        })

        if (!res.ok) {
          const err = await providerHttpError('Gemini', res)
          lastError = err

          // If 503 (high demand) or 429 (rate limit), sleep briefly and retry
          if (res.status === 503 || res.status === 429) {
            console.warn(`[Gemini] model ${currentModel} returned ${res.status}, retrying in 1.2s...`)
            await sleep(1200)
            continue
          }

          // If 404 (model not found / deprecated), break to next candidate model immediately
          if (res.status === 404) {
            console.warn(`[Gemini] model ${currentModel} not found (404), trying fallback model...`)
            break
          }

          throw err
        }

        const data = (await res.json().catch(() => null)) as GeminiResponse | null
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
        if (!text || typeof text !== 'string' || !text.trim()) {
          throw new AiError('Gemini returned an empty response.', {
            code: 'empty_response',
          })
        }

        const usage = normalizeUsage({
          prompt: data?.usageMetadata?.promptTokenCount,
          completion: data?.usageMetadata?.candidatesTokenCount,
          total: data?.usageMetadata?.totalTokenCount,
        })

        return { text, usage }
      } catch (err) {
        lastError = err
        const isAbort = err instanceof Error && err.name === 'AbortError'
        if (isAbort) {
          throw toNetworkError(err)
        }
      }
    }
  }

  if (lastError) {
    throw lastError instanceof AiError ? lastError : toNetworkError(lastError)
  }

  throw new AiError('Failed to generate response with Gemini.', { code: 'provider_error' })
}
