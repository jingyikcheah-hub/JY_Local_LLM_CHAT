export type Role = 'system' | 'user' | 'assistant'

export interface ChatMessage {
  id: string
  role: Exclude<Role, 'system'>
  content: string
  status?: 'streaming' | 'complete' | 'error' | 'stopped'
}

export interface Conversation {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messages: ChatMessage[]
}

export type RuntimeState = 'offline' | 'unloaded' | 'loading' | 'ready' | 'error'

export interface RuntimeStatus {
  state: RuntimeState
  model_id?: string | null
  model_name?: string | null
  error?: string | null
}

export interface HealthResponse {
  status: 'ok'
  version: string
  model: RuntimeStatus
}

export interface ModelInfo {
  id: string
  name: string
  size_bytes: number
  size_label: string
  loaded: boolean
}

export interface GenerationSettings {
  temperature: number
  maxTokens: number
  systemPrompt: string
}
