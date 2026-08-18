import type { TocItem } from '../../utils/headings'

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import TableOfContents from './index'

const headings: TocItem[] = [
  { id: 'intro', text: 'Intro', level: 2 },
  { id: 'details', text: 'Details', level: 3 },
  { id: 'summary', text: 'Summary', level: 4 },
]

describe('TableOfContents', () => {
  it('渲染所有标题文本', () => {
    render(<TableOfContents headings={headings} />)
    expect(screen.getByText('Intro')).toBeInTheDocument()
    expect(screen.getByText('Details')).toBeInTheDocument()
    expect(screen.getByText('Summary')).toBeInTheDocument()
  })

  it('点击标题触发 onNavigate 回调', () => {
    const onNavigate = vi.fn()
    render(<TableOfContents headings={headings} onNavigate={onNavigate} />)
    screen.getByText('Details').click()
    expect(onNavigate).toHaveBeenCalledTimes(1)
  })

  it('空列表时不渲染内容', () => {
    const { container } = render(<TableOfContents headings={[]} />)
    // 无标题时不应渲染列表结构
    expect(container.querySelectorAll('a').length).toBe(0)
  })
})
