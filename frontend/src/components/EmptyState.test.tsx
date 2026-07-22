import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { EmptyState } from './EmptyState'

describe('EmptyState', () => {
  it('guides a first-time user to connect a model', () => {
    const onSetup = vi.fn()
    render(<EmptyState modelReady={false} onPrompt={vi.fn()} onSetup={onSetup} />)

    fireEvent.click(screen.getByRole('button', { name: /connect your local model/i }))

    expect(onSetup).toHaveBeenCalledOnce()
  })

  it('passes a starter prompt to the composer', () => {
    const onPrompt = vi.fn()
    render(<EmptyState modelReady onPrompt={onPrompt} onSetup={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /brainstorm ideas/i }))

    expect(onPrompt).toHaveBeenCalledWith(expect.stringContaining('brainstorm'))
  })
})
