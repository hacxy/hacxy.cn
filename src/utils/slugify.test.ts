import { describe, expect, it } from 'vitest'

import { textToId } from './slugify'

describe('textToId', () => {
  it('转小写并用连字符连接空格', () => {
    expect(textToId('Hello World')).toBe('hello-world')
  })

  it('移除标点符号', () => {
    expect(textToId('Hello, World!')).toBe('hello-world')
  })

  it('保留中文', () => {
    expect(textToId('什么是 Claude Code')).toBe('什么是-claude-code')
  })

  it('保留连字符与下划线', () => {
    expect(textToId('use-state-hook')).toBe('use-state-hook')
  })

  it('处理空字符串', () => {
    expect(textToId('')).toBe('')
  })
})
