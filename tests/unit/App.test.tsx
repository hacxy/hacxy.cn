import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import App from '../../src/App.tsx'

describe('App', () => {
  it('renders the heading and subtitle', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'React + Vite + TypeScript' })).toBeInTheDocument()
    expect(screen.getByText('Powered by @hacxy/kick')).toBeInTheDocument()
  })

  it('shows the counter starting at 0', () => {
    render(<App />)

    expect(screen.getByRole('button', { name: 'Count is 0' })).toBeInTheDocument()
  })

  it('increments the count when the button is clicked', () => {
    render(<App />)

    const button = screen.getByRole('button', { name: 'Count is 0' })
    fireEvent.click(button)

    expect(screen.getByRole('button', { name: 'Count is 1' })).toBeInTheDocument()
  })

  it('accumulates multiple clicks', () => {
    render(<App />)

    const button = screen.getByRole('button', { name: 'Count is 0' })
    fireEvent.click(button)
    fireEvent.click(button)
    fireEvent.click(button)

    expect(screen.getByRole('button', { name: 'Count is 3' })).toBeInTheDocument()
  })
})
