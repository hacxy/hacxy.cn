import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  fetchGitHubStats,
  fetchGitHubContributions,
  transformContributionsForCalendar,
} from './github'

function okJson(body: unknown) {
  return {
    ok: true,
    json: async () => body,
  } as Response
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchGitHubStats', () => {
  it('聚合用户信息与仓库 star 数', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        okJson({ public_repos: 10, public_gists: 2, followers: 5, following: 3 }),
      )
      .mockResolvedValueOnce(
        okJson([{ stargazers_count: 10 }, { stargazers_count: 32 }, { stargazers_count: 8 }]),
      )
    vi.stubGlobal('fetch', fetchMock)

    const stats = await fetchGitHubStats()
    expect(stats).toEqual({ stars: 50, repos: 10 })
  })

  it('请求失败时优雅降级为零值', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 } as Response))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const stats = await fetchGitHubStats()
    expect(stats).toEqual({ stars: 0, repos: 0 })
    spy.mockRestore()
  })

  it('网络异常时不抛出而是降级', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const stats = await fetchGitHubStats()
    expect(stats).toEqual({ stars: 0, repos: 0 })
    spy.mockRestore()
  })
})

describe('fetchGitHubContributions', () => {
  it('返回贡献数据数组', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        okJson({
          total: { '2025': 120 },
          contributions: [
            { date: '2025-01-01', count: 2, level: 2 },
            { date: '2025-01-02', count: 0, level: 0 },
          ],
        }),
      ),
    )
    const result = await fetchGitHubContributions()
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ date: '2025-01-01', count: 2, level: 2 })
  })

  it('失败时返回空数组', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = await fetchGitHubContributions()
    expect(result).toEqual([])
    spy.mockRestore()
  })
})

describe('transformContributionsForCalendar', () => {
  it('透传日历所需的字段', () => {
    const input = [
      { date: '2025-01-01', count: 3, level: 3 as const },
      { date: '2025-01-02', count: 0, level: 0 as const },
    ]
    expect(transformContributionsForCalendar(input)).toEqual(input)
  })
})
