import { MessageSquareText, MoreHorizontal, Plus, Settings2, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import type { Conversation } from '../types'
import { BrandMark } from './BrandMark'

interface Props {
  conversations: Conversation[]
  activeId: string
  open: boolean
  onClose: () => void
  onCreate: () => void
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onOpenSettings: () => void
}

export function Sidebar({
  conversations,
  activeId,
  open,
  onClose,
  onCreate,
  onSelect,
  onDelete,
  onOpenSettings,
}: Props) {
  const [menuId, setMenuId] = useState<string | null>(null)

  return (
    <>
      {open && <button className="sidebar-backdrop" onClick={onClose} aria-label="Close conversation menu" />}
      <aside className={`sidebar ${open ? 'is-open' : ''}`} aria-label="Conversation history">
        <div className="sidebar-brand">
          <div className="brand-lockup">
            <BrandMark />
            <div>
              <strong>LocalChat</strong>
              <span>Private AI workspace</span>
            </div>
          </div>
          <button className="icon-button mobile-only" onClick={onClose} aria-label="Close sidebar">
            <X size={19} />
          </button>
        </div>

        <button className="new-chat-button" onClick={onCreate}>
          <Plus size={18} />
          New chat
          <kbd>⌘ K</kbd>
        </button>

        <div className="history-label">Recent chats</div>
        <nav className="conversation-list">
          {conversations.map((conversation) => (
            <div
              className={`conversation-row ${conversation.id === activeId ? 'active' : ''}`}
              key={conversation.id}
            >
              <button className="conversation-main" onClick={() => onSelect(conversation.id)}>
                <MessageSquareText size={16} />
                <span>{conversation.title}</span>
              </button>
              <button
                className="conversation-menu-button"
                onClick={() => setMenuId(menuId === conversation.id ? null : conversation.id)}
                aria-label={`Options for ${conversation.title}`}
              >
                <MoreHorizontal size={17} />
              </button>
              {menuId === conversation.id && (
                <div className="conversation-menu">
                  <button
                    onClick={() => {
                      onDelete(conversation.id)
                      setMenuId(null)
                    }}
                  >
                    <Trash2 size={15} /> Delete chat
                  </button>
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button onClick={onOpenSettings}>
            <Settings2 size={18} />
            Model & settings
          </button>
          <div className="privacy-note">
            <span className="privacy-dot" />
            Your chats stay in this browser
          </div>
        </div>
      </aside>
    </>
  )
}
