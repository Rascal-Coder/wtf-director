import { readFile } from 'node:fs/promises'
import path from 'node:path'

export type PromptLocale = 'zh' | 'en'

const PROMPTS_ROOT = path.join(process.cwd(), 'ai-temp', 'prompts')

const cache = new Map<string, string>()

async function loadTemplate(category: string, name: string, locale: PromptLocale): Promise<string> {
  const key = `${category}/${name}.${locale}`
  const cached = cache.get(key)
  if (cached) return cached

  const filePath = path.join(PROMPTS_ROOT, category, `${name}.${locale}.txt`)
  const text = await readFile(filePath, 'utf-8')
  cache.set(key, text)
  return text
}

export function normalizeLocale(input: unknown): PromptLocale {
  return input === 'en' ? 'en' : 'zh'
}

export interface RenderedPrompt {
  system: string
  user: string
}

/**
 * 读取模板并以 `{input}` 处切分：
 * - `{input}` 之前的部分作为 system prompt（指令）
 * - 用户输入作为 user 消息单独传入
 *
 * 这样既保留了模板里所有写作要求，又避免把用户输入混入 system 中。
 */
export async function renderChatPrompt(
  category: string,
  name: string,
  locale: PromptLocale,
  input: string,
): Promise<RenderedPrompt> {
  const template = await loadTemplate(category, name, locale)
  const placeholder = '{input}'
  const idx = template.indexOf(placeholder)

  if (idx === -1) {
    return { system: template.trim(), user: input.trim() }
  }

  const before = template.slice(0, idx).trimEnd()
  return {
    system: before,
    user: input.trim(),
  }
}

/**
 * 像 renderChatPrompt，但允许在 system 段落里替换额外的占位符（不是 {input}）。
 * 例如 split_clips.zh.txt 里有 {libs}，先在这里用 vars 渲染，再把 {input} 切到 user 段。
 */
export async function renderChatPromptWithVars(
  category: string,
  name: string,
  locale: PromptLocale,
  input: string,
  vars: Record<string, string> = {},
): Promise<RenderedPrompt> {
  const template = await loadTemplate(category, name, locale)

  let rendered = template
  for (const [key, value] of Object.entries(vars)) {
    if (key === 'input') continue
    rendered = rendered.split(`{${key}}`).join(value)
  }

  const placeholder = '{input}'
  const idx = rendered.indexOf(placeholder)
  if (idx === -1) {
    return { system: rendered.trim(), user: input.trim() }
  }
  const before = rendered.slice(0, idx).trimEnd()
  return { system: before, user: input.trim() }
}
