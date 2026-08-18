import { describe, expect, it } from 'vitest'

import { getHighlighter } from './highlighter'

describe('getHighlighter', () => {
  it('返回单例高亮器并在 ts/js 语言下可用', async () => {
    const highlighter = await getHighlighter()
    expect(highlighter).toBeDefined()

    const html = highlighter.codeToHtml('const a: number = 1;', {
      lang: 'typescript',
      theme: 'github-light',
    })
    expect(html).toContain('<span')
    expect(html).toContain('const')
  }, 20000)

  it('重复调用复用同一个实例', () => {
    const p1 = getHighlighter()
    const p2 = getHighlighter()
    expect(p1).toBe(p2)
  })
})
