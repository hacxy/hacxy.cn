import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import GitHubCalendar from './index'

afterEach(() => {
  vi.unstubAllGlobals()
  document.documentElement.removeAttribute('data-theme')
})

const contributions = {
  total: { '2025': 120 },
  contributions: [
    { date: '2025-01-01', count: 2, level: 2 },
    { date: '2025-01-02', count: 0, level: 0 },
  ],
}

describe('GitHubCalendar', () => {
  it('加载中显示 loading 状态', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))
    render(<GitHubCalendar />)
    expect(screen.getByText('Loading contributions...')).toBeInTheDocument()
  })

  it('数据加载成功后渲染日历', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => contributions } as Response),
    )

    render(<GitHubCalendar />)
    await waitFor(() => {
      expect(screen.queryByText('Loading contributions...')).not.toBeInTheDocument()
    })
    // react-activity-calendar 按 mock 数据（2 条）渲染贡献总数
    await waitFor(() => {
      expect(document.querySelector('.react-activity-calendar')?.textContent).toContain('2')
    })
  })

  it('请求失败显示错误信息', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<GitHubCalendar />)
    await waitFor(() => {
      expect(screen.getByText('Unable to load contributions')).toBeInTheDocument()
    })
  })
})
