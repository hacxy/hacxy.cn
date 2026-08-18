import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import CodeBlock from './index'

const codeText = 'const greeting = "hello";\nconsole.log(greeting);'

function renderBlock() {
  return render(
    <CodeBlock>
      <code className="language-ts">{codeText}</code>
    </CodeBlock>,
  )
}

describe('CodeBlock', () => {
  it('解析语言并渲染代码内容', () => {
    renderBlock()
    // 任一层级渲染了含代码文本的 code 节点（shiki 就绪前后皆可）
    const codeEls = screen.getAllByText((content, el) => {
      return el?.tagName === 'CODE' && content.includes('console.log')
    })
    expect(codeEls.length).toBeGreaterThan(0)
  })

  it('点击复制按钮将原始代码写入剪贴板', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

    renderBlock()
    const copyBtn = screen.getByRole('button', { name: 'Copy code' })
    fireEvent.click(copyBtn)
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(codeText))
  })

  it('复制后显示已复制状态', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    })

    renderBlock()
    const copyBtn = screen.getByRole('button', { name: 'Copy code' })
    fireEvent.click(copyBtn)
    await waitFor(() => {
      expect(screen.getByText('Copied')).toBeInTheDocument()
    })
  })
})
