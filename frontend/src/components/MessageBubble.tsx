import { Check, Copy, RefreshCw, Sparkles } from 'lucide-react'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ChatMessage } from '../types'

interface Props {
  message: ChatMessage
  canRegenerate: boolean
  onRegenerate: () => void
}

export function MessageBubble({ message, canRegenerate, onRegenerate }: Props) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  if (message.role === 'user') {
    return (
      <article className="message-row user-message">
        <div className="user-bubble">{message.content}</div>
      </article>
    )
  }

  return (
    <article className={`message-row assistant-message ${message.status === 'error' ? 'has-error' : ''}`}>
      <div className="assistant-avatar" aria-hidden="true">
        <Sparkles size={17} />
      </div>
      <div className="assistant-body">
        <div className="message-author">LocalChat</div>
        <div className="markdown-body">
          {message.content ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          ) : (
            <span className="thinking-dots" aria-label="Generating response">
              <i /> <i /> <i />
            </span>
          )}
        </div>
        {message.status !== 'streaming' && message.content && (
          <div className="message-actions">
            <button onClick={copy} aria-label="Copy response">
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            {canRegenerate && message.status !== 'error' && (
              <button onClick={onRegenerate} aria-label="Regenerate response">
                <RefreshCw size={15} /> Regenerate
              </button>
            )}
            {message.status === 'stopped' && <span className="stopped-label">Stopped</span>}
          </div>
        )}
      </div>
    </article>
  )
}
