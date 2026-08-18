import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import Footer from './index'

describe('Footer', () => {
  it('渲染版权文本', () => {
    render(<Footer />)
    expect(screen.getByText('2024-PRESENT © Hacxy')).toBeInTheDocument()
  })
})
