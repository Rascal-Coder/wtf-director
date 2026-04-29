import { NextRequest, NextResponse } from 'next/server'

import { completeChat } from '@/lib/ai/openai-compatible'
import { normalizeLocale, renderChatPrompt } from '@/lib/ai/prompts'

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
  const locale = normalizeLocale(body.locale)

  if (!prompt) {
    return NextResponse.json(
      { error: 'INVALID_PARAMS', message: 'prompt is required' },
      { status: 400 },
    )
  }

  try {
    const { system, user } = await renderChatPrompt(
      'novel-promotion',
      'ai_story_expand',
      locale,
      prompt,
    )

    const expandedText = await completeChat([
      { role: 'system', content: system },
      { role: 'user', content: user },
    ])

    return NextResponse.json({ expandedText })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Expansion failed'
    const isConfig = message.includes('OPENAI_API_KEY')
    return NextResponse.json(
      { error: isConfig ? 'MISSING_CONFIG' : 'EXPANSION_FAILED', message },
      { status: isConfig ? 503 : 502 },
    )
  }
}
