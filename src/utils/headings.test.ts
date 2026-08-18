import { describe, expect, it } from 'vitest'

import { extractHeadings } from './headings'

describe('extractHeadings', () => {
  it('提取 h2-h4 及其层级', () => {
    const md = '# Title\n## Section One\n### Sub One\n#### Deep\n## Section Two\n'
    expect(extractHeadings(md)).toEqual([
      { id: 'section-one', text: 'Section One', level: 2 },
      { id: 'sub-one', text: 'Sub One', level: 3 },
      { id: 'deep', text: 'Deep', level: 4 },
      { id: 'section-two', text: 'Section Two', level: 2 },
    ])
  })

  it('跳过 h1 标题', () => {
    expect(extractHeadings('# Only H1')).toEqual([])
  })

  it('跳过代码块内的伪标题', () => {
    const md = '## Real\n```\n## Fake heading\n```\n### Also real\n'
    const headings = extractHeadings(md)
    expect(headings.map((h) => h.text)).toEqual(['Real', 'Also real'])
  })

  it('重复标题生成唯一 id（带 -1 后缀）', () => {
    const md = '## Intro\n## Intro\n'
    expect(extractHeadings(md)).toEqual([
      { id: 'intro', text: 'Intro', level: 2 },
      { id: 'intro-1', text: 'Intro', level: 2 },
    ])
  })

  it('中文标题生成 slug id', () => {
    const md = '## 快速开始\n'
    const headings = extractHeadings(md)
    expect(headings[0].id).toBe('快速开始')
    expect(headings[0].text).toBe('快速开始')
  })

  it('忽略空行与普通段落', () => {
    const md = 'some paragraph\n\n## Heading\n\nmore text\n'
    expect(extractHeadings(md)).toEqual([{ id: 'heading', text: 'Heading', level: 2 }])
  })
})
