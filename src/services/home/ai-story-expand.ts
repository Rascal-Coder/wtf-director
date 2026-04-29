interface ApiFetchLike {
  (input: string, init?: RequestInit): Promise<Response>
}

interface ExpandOkBody {
  expandedText?: string
}

interface ErrorBody {
  error?: string
  message?: string
}

export interface ExpandHomeStoryParams {
  apiFetch: ApiFetchLike
  prompt: string
  locale?: 'zh' | 'en'
}

export interface ExpandHomeStoryResult {
  expandedText: string
}

export async function expandHomeStory({
  apiFetch,
  prompt,
  locale,
}: ExpandHomeStoryParams): Promise<ExpandHomeStoryResult> {
  const response = await apiFetch('/api/user/ai-story-expand', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      locale,
    }),
  })

  const data = (await response.json().catch(() => ({}))) as ExpandOkBody & ErrorBody

  if (!response.ok) {
    const detail = typeof data.message === 'string' ? data.message : response.statusText
    throw new Error(data.error ? `${data.error}: ${detail}` : detail || 'Request failed')
  }

  const expandedText =
    typeof data.expandedText === 'string' ? data.expandedText.trim() : ''
  if (!expandedText) {
    throw new Error('AI story expand response missing expandedText')
  }

  return {
    expandedText,
  }
}
