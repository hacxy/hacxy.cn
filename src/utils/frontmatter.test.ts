import { describe, expect, it } from 'vitest'

import { parseFrontmatter, FM_PATTERN } from './frontmatter'

describe('parseFrontmatter', () => {
  it('解析完整的 frontmatter 与正文分离', () => {
    const raw = '---\ntitle: Hello\ntags:\n  - a\n  - b\n---\n# Body\n'
    const { data, content } = parseFrontmatter(raw)
    expect(data.title).toBe('Hello')
    expect(data.tags).toEqual(['a', 'b'])
    expect(content).toBe('# Body\n')
  })

  it('无 frontmatter 时返回原内容', () => {
    const raw = 'just markdown without frontmatter'
    const { data, content } = parseFrontmatter(raw)
    expect(data).toEqual({})
    expect(content).toBe(raw)
  })

  it('空 frontmatter 解析为空对象', () => {
    const { data } = parseFrontmatter('---\n---\ncontent')
    expect(data).toEqual({})
  })

  it('yaml 损坏时回退为原内容', () => {
    const raw = '---\n: : : bad yaml : : :\n---\nbody'
    const { data, content } = parseFrontmatter(raw)
    expect(data).toEqual({})
    expect(content).toBe(raw)
  })

  it('支持 CRLF 行尾', () => {
    const raw = '---\r\ntitle: CRLF\r\n---\r\nbody\r\n'
    const { data, content } = parseFrontmatter(raw)
    expect(data.title).toBe('CRLF')
    expect(content).toBe('body\r\n')
  })
})

describe('FM_PATTERN', () => {
  it('匹配标准 frontmatter', () => {
    expect(FM_PATTERN.test('---\na: b\n---\ncontent')).toBe(true)
  })
})
