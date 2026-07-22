import type { GenerationSettings, HealthResponse, ModelInfo, Role, RuntimeStatus } from '../types'

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

async function requestJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  if (!response.ok) {
    let message = 'The local service could not complete that request.'
    try {
      const body = (await response.json()) as { detail?: string }
      if (body.detail) message = body.detail
    } catch {
      // Retain the safe default when an upstream response is not JSON.
    }
    throw new ApiError(message, response.status)
  }
  return (await response.json()) as T
}

export const api = {
  health: () => requestJson<HealthResponse>('/api/v1/health'),
  models: () => requestJson<ModelInfo[]>('/api/v1/models'),
  loadModel: (modelId: string) =>
    requestJson<RuntimeStatus>('/api/v1/models/load', {
      method: 'POST',
      body: JSON.stringify({ model_id: modelId }),
    }),
}

interface StreamMessage {
  role: Role
  content: string
}

interface StreamOptions {
  messages: StreamMessage[]
  settings: GenerationSettings
  signal: AbortSignal
  onToken: (text: string) => void
}

export async function streamChat({ messages, settings, signal, onToken }: StreamOptions): Promise<void> {
  const response = await fetch('/api/v1/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({
      messages,
      temperature: settings.temperature,
      max_tokens: settings.maxTokens,
    }),
    signal,
  })

  if (!response.ok) {
    let message = 'The local model could not start a response.'
    try {
      const body = (await response.json()) as { detail?: string }
      if (body.detail) message = body.detail
    } catch {
      // Use the user-safe fallback above.
    }
    throw new ApiError(message, response.status)
  }
  if (!response.body) throw new ApiError('Streaming is not supported by this browser.', 500)

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    buffer += decoder.decode(value, { stream: !done })
    const events = buffer.split('\n\n')
    buffer = events.pop() ?? ''

    for (const event of events) {
      const eventName = event.match(/^event:\s*(.+)$/m)?.[1]
      const rawData = event.match(/^data:\s*(.+)$/m)?.[1]
      if (!rawData) continue
      const data = JSON.parse(rawData) as { text?: string; message?: string }
      if (eventName === 'token' && data.text) onToken(data.text)
      if (eventName === 'error') throw new ApiError(data.message ?? 'Generation failed.', 500)
    }
    if (done) break
  }
}
