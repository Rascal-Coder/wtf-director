/**
 * 通过 Vercel AI SDK 调用 OpenAI 兼容的 Chat Completions 接口
 * （OpenAI、Azure、多数国内中转网关等）。
 *
 * 仅依赖 `ai` 与 `@ai-sdk/openai`，通过环境变量配置：
 * - OPENAI_API_KEY  必填
 * - OPENAI_BASE_URL 可选，默认 https://api.openai.com/v1
 * - OPENAI_MODEL    可选，默认 gpt-4o-mini
 *
 * 使用 `provider.chat(modelId)` 而不是默认的 `provider(modelId)`，
 * 因为大量第三方 OpenAI 兼容服务只实现了 `/chat/completions`，
 * 不支持新的 `/responses` 端点。
 */

import { createOpenAI } from '@ai-sdk/openai'
import { generateText, streamText } from 'ai'

export interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type ChatStreamHandler = (delta: string) => void | Promise<void>

function resolveBaseUrl(): string {
  const raw = process.env.OPENAI_BASE_URL?.trim()
  if (raw) return raw.replace(/\/$/, '')
  return 'https://api.openai.com/v1'
}

function getProvider() {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }
  return createOpenAI({
    apiKey,
    baseURL: resolveBaseUrl(),
  })
}

function getModelId(): string {
  return process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini'
}

export async function completeChat(messages: ChatCompletionMessage[]): Promise<string> {
  const provider = getProvider()

  const { text } = await generateText({
    model: provider.chat(getModelId()),
    messages,
    temperature: 0.7,
  })

  const trimmed = text?.trim() ?? ''
  if (!trimmed) {
    throw new Error('Empty model response')
  }

  return trimmed
}

/**
 * 流式调用，每收到一段 delta 就回调 onDelta。
 * 等流读完后返回完整文本。
 */
export async function streamChat(
  messages: ChatCompletionMessage[],
  onDelta: ChatStreamHandler,
): Promise<string> {
  const provider = getProvider()

  const result = streamText({
    model: provider.chat(getModelId()),
    messages,
    temperature: 0.7,
  })

  let accumulated = ''
  for await (const delta of result.textStream) {
    if (!delta) continue
    accumulated += delta
    try {
      await onDelta(delta)
    } catch {
      // onDelta 异常不阻塞
    }
  }

  const trimmed = accumulated.trim()
  if (!trimmed) {
    throw new Error('Empty model response')
  }
  return trimmed
}
