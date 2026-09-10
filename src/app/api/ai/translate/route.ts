import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/account';
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';
import { loadAiConfig } from '@/lib/ai/config';
import { generateGemini } from '@/lib/ai/providers/gemini';
import { generateOpenAi } from '@/lib/ai/providers/openai';
import { generateAnthropic } from '@/lib/ai/providers/anthropic';
import { generateDeepSeek } from '@/lib/ai/providers/deepseek';
import { buildConversationContext } from '@/lib/ai/context';

/**
 * POST /api/ai/translate
 *
 * Body: {
 *   text: string,
 *   conversationId?: string,
 *   targetLang?: 'es' | 'buyer' | string
 * }
 *
 * Translates either:
 *  1. An incoming foreign message -> Spanish (for the Venezuelan export manager).
 *  2. An agent's Spanish response -> Buyer's language (English, Mandarin, Arabic, French, etc.).
 */
export async function POST(request: Request) {
  try {
    const { supabase, accountId, userId } = await requireRole('agent');

    const userLimit = checkRateLimit(`ai-trans:${userId}`, RATE_LIMITS.aiDraft);
    if (!userLimit.success) return rateLimitResponse(userLimit);

    const body = await request.json().catch(() => null);
    const text = typeof body?.text === 'string' ? body.text.trim() : '';
    const conversationId = typeof body?.conversationId === 'string' ? body.conversationId : null;
    const targetLang = typeof body?.targetLang === 'string' ? body.targetLang : 'es';

    if (!text) {
      return NextResponse.json({ error: 'Text to translate is required' }, { status: 400 });
    }

    // Load account config or fallback to system Gemini
    const config = await loadAiConfig(supabase, accountId, { requireActive: false });
    const apiKey = config?.apiKey || process.env.GEMINI_API_KEY;
    const provider = config?.provider || 'gemini';
    const model = config?.model || 'gemini-2.0-flash';

    if (!apiKey) {
      return NextResponse.json(
        { error: 'No AI provider or API key configured for translation.' },
        { status: 400 }
      );
    }

    let detectedBuyerLangContext = '';
    if (targetLang === 'buyer' && conversationId) {
      // Look at recent inbound messages to detect customer language
      const recentMessages = await buildConversationContext(supabase, conversationId);
      const userTurns = recentMessages.filter((m) => m.role === 'user');
      if (userTurns.length > 0) {
        const samples = userTurns.slice(-3).map((m) => m.content).join('\n---\n');
        detectedBuyerLangContext = `\nContext of recent messages written by the buyer:\n"""\n${samples}\n"""\nTranslate the agent's message into the EXACT SAME language the buyer used above.`;
      }
    }

    let systemPrompt = '';
    if (targetLang === 'es') {
      systemPrompt =
        'You are a professional B2B trade translator. Translate the text into clear, natural Spanish (Español) for a Venezuelan export manager. ' +
        'Preserve all commercial abbreviations, specifications (e.g. FOB, CIF, FCL, MT, %, kg, bag types), names, numbers, and technical terms. ' +
        'Output ONLY the translated Spanish text without notes, quotes, or preambles.';
    } else {
      systemPrompt =
        'You are an executive international B2B trade assistant. Translate the following message (written in Spanish by an exporter) into the language spoken by the international buyer. ' +
        (detectedBuyerLangContext || 'If target language is specified, use that language; otherwise translate into standard business English.') +
        '\nMaintain courteous corporate B2B etiquette, proper export conventions, and precision. ' +
        'Output ONLY the translated message text without quotes, explanations, or labels.';
    }

    const providerArgs = {
      apiKey,
      model,
      systemPrompt,
      messages: [{ role: 'user' as const, content: text }],
      timeoutMs: 20_000,
    };

    let translatedText = '';
    if (provider === 'gemini' || !config) {
      const res = await generateGemini(providerArgs);
      translatedText = res.text.trim();
    } else if (provider === 'openai') {
      const res = await generateOpenAi(providerArgs);
      translatedText = res.text.trim();
    } else if (provider === 'anthropic') {
      const res = await generateAnthropic(providerArgs);
      translatedText = res.text.trim();
    } else if (provider === 'deepseek') {
      const res = await generateDeepSeek(providerArgs);
      translatedText = res.text.trim();
    }

    return NextResponse.json({
      translatedText: translatedText || text,
    });
  } catch (error: any) {
    console.error('[POST /api/ai/translate] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Translation failed' },
      { status: 500 }
    );
  }
}
