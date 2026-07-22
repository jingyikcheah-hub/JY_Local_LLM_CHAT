import { Menu, Plus, Settings2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api, streamChat } from './lib/api'
import { useStoredState } from './lib/storage'
import { Composer } from './components/Composer'
import { EmptyState } from './components/EmptyState'
import { MessageBubble } from './components/MessageBubble'
import { SettingsPanel } from './components/SettingsPanel'
import { Sidebar } from './components/Sidebar'
import type { ChatMessage, Conversation, GenerationSettings, ModelInfo, RuntimeStatus } from './types'

const createId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`

const newConversation = (): Conversation => ({
  id: createId(),
  title: 'New conversation',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  messages: [],
})

const defaultSettings: GenerationSettings = {
  temperature: 0.7,
  maxTokens: 1024,
  systemPrompt: "You are a helpful, thoughtful assistant. Reply in the user's language.",
}

function App() {
  const initialConversation = useMemo(newConversation, [])
  const [conversations, setConversations] = useStoredState<Conversation[]>('localchat:conversations:v2', [
    initialConversation,
  ])
  const [activeId, setActiveId] = useStoredState('localchat:active:v2', initialConversation.id)
  const [generationSettings, setGenerationSettings] = useStoredState<GenerationSettings>(
    'localchat:settings:v2',
    defaultSettings,
  )
  const [runtime, setRuntime] = useState<RuntimeStatus>({ state: 'offline' })
  const [models, setModels] = useState<ModelInfo[]>([])
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loadingModel, setLoadingModel] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [draft, setDraft] = useState('')
  const abortRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const activeConversation =
    conversations.find((conversation) => conversation.id === activeId) ?? conversations[0] ?? initialConversation

  const updateConversation = useCallback(
    (id: string, updater: (conversation: Conversation) => Conversation) => {
      setConversations((current) => current.map((conversation) => (conversation.id === id ? updater(conversation) : conversation)))
    },
    [setConversations],
  )

  const refreshSystem = useCallback(async () => {
    try {
      const [health, foundModels] = await Promise.all([api.health(), api.models()])
      setRuntime(health.model)
      setModels(foundModels)
    } catch {
      setRuntime({ state: 'offline' })
      setModels([])
    }
  }, [])

  const createChat = useCallback(() => {
    const conversation = newConversation()
    setConversations((current) => [conversation, ...current])
    setActiveId(conversation.id)
    setSidebarOpen(false)
  }, [setActiveId, setConversations])

  useEffect(() => {
    void refreshSystem()
    const interval = window.setInterval(() => void refreshSystem(), 15_000)
    return () => window.clearInterval(interval)
  }, [refreshSystem])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: generating ? 'auto' : 'smooth' })
  }, [activeConversation.messages, generating])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSettingsOpen(false)
        setSidebarOpen(false)
        return
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        createChat()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [createChat])

  const deleteChat = (id: string) => {
    setConversations((current) => {
      const remaining = current.filter((conversation) => conversation.id !== id)
      if (remaining.length) {
        if (activeId === id) setActiveId(remaining[0]!.id)
        return remaining
      }
      const replacement = newConversation()
      setActiveId(replacement.id)
      return [replacement]
    })
  }

  const runGeneration = async (conversationId: string, history: ChatMessage[], assistantId: string) => {
    const controller = new AbortController()
    abortRef.current = controller
    setGenerating(true)

    const wireMessages = [
      ...(generationSettings.systemPrompt.trim()
        ? [{ role: 'system' as const, content: generationSettings.systemPrompt.trim() }]
        : []),
      ...history.map(({ role, content }) => ({ role, content })),
    ]

    try {
      await streamChat({
        messages: wireMessages,
        settings: generationSettings,
        signal: controller.signal,
        onToken: (token) => {
          updateConversation(conversationId, (conversation) => ({
            ...conversation,
            messages: conversation.messages.map((message) =>
              message.id === assistantId ? { ...message, content: message.content + token } : message,
            ),
            updatedAt: Date.now(),
          }))
        },
      })
      updateConversation(conversationId, (conversation) => ({
        ...conversation,
        messages: conversation.messages.map((message) =>
          message.id === assistantId ? { ...message, status: 'complete' } : message,
        ),
      }))
    } catch (error) {
      const aborted = controller.signal.aborted
      updateConversation(conversationId, (conversation) => ({
        ...conversation,
        messages: conversation.messages.map((message) => {
          if (message.id !== assistantId) return message
          if (aborted) return { ...message, status: 'stopped' }
          return {
            ...message,
            status: 'error',
            content: message.content || (error instanceof Error ? error.message : 'The response could not be generated.'),
          }
        }),
      }))
    } finally {
      abortRef.current = null
      setGenerating(false)
    }
  }

  const sendMessage = (text: string) => {
    if (runtime.state !== 'ready' || generating) {
      if (runtime.state !== 'ready') setSettingsOpen(true)
      return
    }
    const conversationId = activeConversation.id
    const userMessage: ChatMessage = { id: createId(), role: 'user', content: text, status: 'complete' }
    const assistantMessage: ChatMessage = { id: createId(), role: 'assistant', content: '', status: 'streaming' }
    const history = [...activeConversation.messages, userMessage]
    const firstUserMessage = activeConversation.messages.every((message) => message.role !== 'user')

    updateConversation(conversationId, (conversation) => ({
      ...conversation,
      title: firstUserMessage ? text.replace(/\s+/g, ' ').slice(0, 42) : conversation.title,
      messages: [...history, assistantMessage],
      updatedAt: Date.now(),
    }))
    void runGeneration(conversationId, history, assistantMessage.id)
  }

  const regenerate = () => {
    if (generating || runtime.state !== 'ready') return
    const lastAssistantIndex = activeConversation.messages.findLastIndex((message) => message.role === 'assistant')
    if (lastAssistantIndex < 0) return
    const history = activeConversation.messages.slice(0, lastAssistantIndex)
    const assistantMessage: ChatMessage = { id: createId(), role: 'assistant', content: '', status: 'streaming' }
    updateConversation(activeConversation.id, (conversation) => ({
      ...conversation,
      messages: [...history, assistantMessage],
      updatedAt: Date.now(),
    }))
    void runGeneration(activeConversation.id, history, assistantMessage.id)
  }

  const loadModel = async (modelId: string) => {
    setLoadingModel(modelId)
    setRuntime((current) => ({ ...current, state: 'loading' }))
    try {
      const nextRuntime = await api.loadModel(modelId)
      setRuntime(nextRuntime)
      await refreshSystem()
      setSettingsOpen(false)
    } catch (error) {
      setRuntime({ state: 'error', error: error instanceof Error ? error.message : 'Model loading failed.' })
    } finally {
      setLoadingModel(null)
    }
  }

  const statusLabel =
    runtime.state === 'ready'
      ? runtime.model_name ?? 'Local model ready'
      : runtime.state === 'offline'
        ? 'Service offline'
        : runtime.state === 'loading'
          ? 'Loading model…'
          : 'Model not connected'

  return (
    <div className="app-shell">
      <Sidebar
        conversations={[...conversations].sort((a, b) => b.updatedAt - a.updatedAt)}
        activeId={activeConversation.id}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onCreate={createChat}
        onSelect={(id) => {
          setActiveId(id)
          setSidebarOpen(false)
        }}
        onDelete={deleteChat}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main className="chat-workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button menu-trigger" onClick={() => setSidebarOpen(true)} aria-label="Open conversations">
              <Menu size={20} />
            </button>
            <div className="conversation-heading">
              <strong>{activeConversation.title}</strong>
              <span>Stored locally</span>
            </div>
          </div>
          <div className="topbar-actions">
            <button className={`runtime-pill ${runtime.state}`} onClick={() => setSettingsOpen(true)}>
              <span /> {statusLabel}
            </button>
            <button className="icon-button" onClick={() => setSettingsOpen(true)} aria-label="Open settings">
              <Settings2 size={19} />
            </button>
            <button className="icon-button mobile-new-chat" onClick={createChat} aria-label="New chat">
              <Plus size={20} />
            </button>
          </div>
        </header>

        <div className="chat-scroll" aria-live="polite">
          {activeConversation.messages.length === 0 ? (
            <EmptyState
              modelReady={runtime.state === 'ready'}
              onPrompt={setDraft}
              onSetup={() => setSettingsOpen(true)}
            />
          ) : (
            <div className="message-list">
              {activeConversation.messages.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  canRegenerate={index === activeConversation.messages.length - 1 && !generating}
                  onRegenerate={regenerate}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <Composer
          disabled={runtime.state !== 'ready'}
          generating={generating}
          value={draft}
          onChange={setDraft}
          onSend={sendMessage}
          onStop={() => abortRef.current?.abort()}
          onSetup={() => setSettingsOpen(true)}
        />
      </main>

      <SettingsPanel
        open={settingsOpen}
        models={models}
        runtime={runtime}
        loadingModel={loadingModel}
        settings={generationSettings}
        onClose={() => setSettingsOpen(false)}
        onRefresh={() => void refreshSystem()}
        onLoadModel={(id) => void loadModel(id)}
        onSettings={setGenerationSettings}
      />
    </div>
  )
}

export default App
