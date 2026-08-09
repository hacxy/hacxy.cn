import { NavLink, Outlet } from 'react-router'

import { copyrightYear, siteName } from '../site.ts'
import ThemeToggle from './ThemeToggle.tsx'

/** 当前导航高亮：紫色强调色（PRD「紫色强调色作用于链接与当前导航」） */
const navLinkClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'text-accent' : undefined)

/** 全局布局：单列居中 + 「文章 | 关于」导航 + CC BY-NC-SA 页脚 */
export default function Layout() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-6">
      <nav className="flex items-center gap-6 py-8">
        <NavLink to="/" end className={navLinkClass}>
          文章
        </NavLink>
        <NavLink to="/about" className={navLinkClass}>
          关于
        </NavLink>
        <span className="ml-auto">
          <ThemeToggle />
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
  )
}
