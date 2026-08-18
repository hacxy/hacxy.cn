import { describe, expect, it } from 'vitest'

import { getLinkHref, getLinkLabel, SOCIAL_META, type SocialType } from './social'

describe('getLinkHref', () => {
  it('普通链接原样返回', () => {
    expect(getLinkHref({ type: 'github', url: 'https://github.com/hacxy' })).toBe(
      'https://github.com/hacxy',
    )
  })

  it('email 自动补全 mailto 前缀', () => {
    expect(getLinkHref({ type: 'email', url: 'foo@example.com' })).toBe('mailto:foo@example.com')
  })

  it('已是 mailto 的 email 保持不变', () => {
    expect(getLinkHref({ type: 'email', url: 'mailto:foo@example.com' })).toBe(
      'mailto:foo@example.com',
    )
  })
})

describe('getLinkLabel', () => {
  it('显式 label 优先', () => {
    expect(getLinkLabel({ type: 'github', url: 'https://github.com/hacxy', label: 'GH' })).toBe(
      'GH',
    )
  })

  it('github 链接提取用户名并去尾部斜杠', () => {
    expect(getLinkLabel({ type: 'github', url: 'https://github.com/hacxy/' })).toBe('hacxy')
  })

  it('email 返回原始地址', () => {
    expect(getLinkLabel({ type: 'email', url: 'foo@example.com' })).toBe('foo@example.com')
  })

  it('其他类型回退到社交元数据标签', () => {
    expect(getLinkLabel({ type: 'rss', url: '/feed.xml' })).toBe('RSS')
  })
})

describe('SOCIAL_META', () => {
  it('覆盖所有常见社交类型', () => {
    const types: SocialType[] = [
      'github',
      'email',
      'twitter',
      'x',
      'bilibili',
      'youtube',
      'linkedin',
      'rss',
      'telegram',
      'discord',
      'website',
    ]
    for (const type of types) {
      expect(SOCIAL_META[type].label).toBeTruthy()
    }
  })
})
