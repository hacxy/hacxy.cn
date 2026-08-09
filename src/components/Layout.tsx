import { Link, Outlet } from 'react-router'

import ThemeToggle from './ThemeToggle.tsx'

/** 全局布局：单列居中 + 「文章 | 关于」导航（阶段 4 打磨视觉） */
export default function Layout() {
  return (
    <div className="mx-auto max-w-2xl px-6">
      <nav className="flex items-center gap-6 py-8">
        <Link to="/">文章</Link>
        <Link to="/about">关于</Link>
        <span className="ml-auto">
          <ThemeToggle />
        </span>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
