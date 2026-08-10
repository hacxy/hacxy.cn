import { NavLink, Outlet } from 'react-router'

import { copyrightYear, githubUrl, siteName } from '../site.ts'
import Icon from './Icon.tsx'
import ThemeToggle from './ThemeToggle.tsx'

/** 当前导航高亮：GitHub 绿强调色（PRD「绿色强调色作用于链接与当前导航」） */
const navLinkClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'text-accent' : undefined)

/** 全局布局：单列居中 + 「文章 | 关于」导航 + CC BY-NC-SA 页脚 */
export default function Layout() {
  return (
    <>
      {/* 全站背景纹理垫底图层：fixed 铺满视口、z-index 最低、不拦截指针事件；
          内容为内联 SVG data-URI 平铺（细网格 + 代码字符，零外部资源），亮暗双变体随 .dark 切换 */}
      <div aria-hidden="true" className="bg-texture" />
      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-6">
        <nav className="flex items-center gap-6 py-8">
          <NavLink to="/" end className={navLinkClass}>
            文章
          </NavLink>
          <NavLink to="/about" className={navLinkClass}>
            关于
          </NavLink>
          {/* 右侧：主题切换 + GitHub/RSS 图标链接（PRD 用户故事 24/25/26/33）；
              GitHub 为外链新窗口打开，RSS 指向 /feed.xml（构建期生成） */}
          <span className="ml-auto flex items-center gap-4">
            <ThemeToggle />
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="text-accent"
            >
              <Icon name="github-icon" />
            </a>
            <a href="/feed.xml" aria-label="RSS 订阅" className="text-accent">
              <Icon name="rss-icon" />
            </a>
          </span>
        </nav>
        <main className="flex-1 pb-16">
          <Outlet />
        </main>
        <footer className="border-t py-6 text-sm text-muted">
          <p>
            © {copyrightYear} {siteName} ·{' '}
            <a
              href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
              target="_blank"
              rel="noopener noreferrer"
            >
              CC BY-NC-SA 4.0
            </a>
          </p>
        </footer>
      </div>
    </>
  )
}
