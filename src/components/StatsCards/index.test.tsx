import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, afterEach } from 'vitest'

import StatsCards from './index'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('StatsCards', () => {
  it('加载中显示占位符', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))
    render(<StatsCards postCount={5} />)
    expect(screen.getByText('5')).toBeInTheDocument() // 文章数立即显示
  })

  it('fetch 成功后显示 stars 数', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ public_repos: 30, public_gists: 0, followers: 0, following: 0 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ stargazers_count: 42 }],
        }),
    )

    render(<StatsCards postCount={3} />)
    await waitFor(() => expect(screen.getByText('42')).toBeInTheDocument())
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('fetch 失败降级显示 0', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: false, status: 403 } as Response))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<StatsCards postCount={0} />)
    // 加载结束后 stars 降级为 0，与文章数 0 同时展示
    await waitFor(() => expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(2))
  })
})
