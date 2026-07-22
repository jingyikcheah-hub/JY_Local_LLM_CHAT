import { BookOpenText, BrainCircuit, Code2, ShieldCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const prompts: { icon: LucideIcon; label: string; prompt: string }[] = [
  {
    icon: BookOpenText,
    label: 'Summarize something',
    prompt: 'Summarize the following text into clear key points:\n\n',
  },
  {
    icon: BrainCircuit,
    label: 'Brainstorm ideas',
    prompt: 'Help me brainstorm practical ideas for ',
  },
  {
    icon: Code2,
    label: 'Explain code',
    prompt: 'Explain this code in simple terms and identify possible improvements:\n\n',
  },
]

interface Props {
  modelReady: boolean
  onPrompt: (prompt: string) => void
  onSetup: () => void
}

export function EmptyState({ modelReady, onPrompt, onSetup }: Props) {
  return (
    <section className="empty-state">
      <div className="empty-eyebrow">
        <ShieldCheck size={16} />
        Runs privately on your computer
      </div>
      <h1>What can I help you think through?</h1>
      <p>
        Ask questions, draft content, explore ideas, or work through code—without sending your conversations
        to a cloud AI provider.
      </p>

      {!modelReady && (
        <button className="setup-callout" onClick={onSetup}>
          <span className="setup-number">1</span>
          <span>
            <strong>Connect your local model</strong>
            <small>Choose a GGUF file to begin. It usually takes less than a minute.</small>
          </span>
          <span className="setup-action">Set up →</span>
        </button>
      )}

      <div className="prompt-grid">
        {prompts.map(({ icon: Icon, label, prompt }) => (
          <button key={label} onClick={() => onPrompt(prompt)}>
            <Icon size={19} />
            <span>{label}</span>
            <small>{prompt.split('\n')[0]}</small>
          </button>
        ))}
      </div>
    </section>
  )
}
