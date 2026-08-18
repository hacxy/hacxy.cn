import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import About from './About'
import BlogList from './BlogList'
import BlogPost from './BlogPost'
import Home from './Home'
import NotFound from './NotFound'
import Skills from './Skills'
import Tags from './Tags'

// Home 顶层副作用 preloadSkills() 与 GitHubCalendar 依赖 fetch
function stubNetwork() {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      // skills 列表
      .mockResolvedValueOnce({ ok: false } as Response)
      // github user
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ public_repos: 10, public_gists: 0, followers: 0, following: 0 }),
      } as Response)
      // github repos
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ stargazers_count: 5 }],
      } as Response)
      // contributions
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          total: { '2025': 10 },
          contributions: [
            { date: '2025-01-01', count: 1, level: 1 },
            { date: '2025-01-02', count: 0, level: 0 },
          ],
        }),
      } as Response),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

function renderPage(element: React.ReactNode, initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/" element={element} />
        <Route path="/posts" element={<BlogList />} />
        <Route path="/posts/*" element={<BlogPost />} />
        <Route path="/about" element={<About />} />
        <Route path="/skills" element={<Skills />} />
        <Route path="/tags" element={<Tags />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('页面冒烟测试', () => {
  it('Home 渲染文章与入口链接', async () => {
    stubNetwork()
    renderPage(<Home />)
    // bio 走 Typewriter 动画，断言稳定内容：文章链接与区块标题
    await waitFor(() => expect(screen.getByText('Recent Posts')).toBeInTheDocument())
    expect(screen.getByText('All posts →')).toBeInTheDocument()
  })

  it('About 渲染作者名', async () => {
    renderPage(<About />, '/about')
    expect(screen.getByText('Hacxy')).toBeInTheDocument()
  })

  it('BlogList 渲染文章列表', async () => {
    renderPage(<BlogList />, '/posts')
    await waitFor(() => expect(screen.getByText('Post A')).toBeInTheDocument())
  })

  it('BlogPost 渲染文章标题与正文', async () => {
    stubNetwork()
    renderPage(<BlogPost />, '/posts/post-a')
    await waitFor(() => expect(screen.getByText('Post A')).toBeInTheDocument())
  })

  it('NotFound 渲染 404', async () => {
    renderPage(<NotFound />)
    expect(screen.getByText('404')).toBeInTheDocument()
  })

  it('Tags 渲染标签列表', async () => {
    renderPage(<Tags />, '/tags')
    expect(screen.getByText('react')).toBeInTheDocument()
  })
})
