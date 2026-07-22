import { ArrowUp, Square } from 'lucide-react'
import { useEffect, useRef } from 'react'

interface Props {
  disabled: boolean
  generating: boolean
  value: string
  onChange: (value: string) => void
  onSend: (text: string) => void
  onStop: () => void
  onSetup: () => void
}

export function Composer({ disabled, generating, value, onChange, onSend, onStop, onSetup }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`
  }, [value])

  const submit = () => {
    const text = value.trim()
    if (!text || disabled || generating) return
    onSend(text)
    onChange('')
  }

  return (
    <div className="composer-area">
      <div className={`composer ${disabled ? 'disabled' : ''}`}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              submit()
            }
          }}
          onClick={() => disabled && onSetup()}
          placeholder={disabled ? 'Connect a local model to start chatting' : 'Message LocalChat'}
          aria-label="Message LocalChat"
          rows={1}
          readOnly={disabled}
          disabled={generating}
        />
        {generating ? (
          <button className="send-button stop" onClick={onStop} aria-label="Stop generating">
            <Square size={15} fill="currentColor" />
          </button>
        ) : (
          <button className="send-button" onClick={submit} disabled={disabled || !value.trim()} aria-label="Send message">
            <ArrowUp size={19} />
          </button>
        )}
      </div>
      <p className="composer-caption">Local models can make mistakes. Check important information.</p>
    </div>
  )
}
