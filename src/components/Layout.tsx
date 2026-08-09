import { NavLink, Outlet } from 'react-router'

import ThemeToggle from './ThemeToggle.tsx'

/** 当前导航高亮：紫色强调色（PRD「紫色强调色作用于链接与当前导航」） */
const navLinkClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'text-accent' : undefined)

/** 全局布局：单列居中 + 「文章 | 关于」导航（阶段 4 打磨视觉） */
export default function Layout() {
  return (
    <div className="mx-auto max-w-2xl px-6">
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
      <main>
        <Outlet />
      </main>
    </div>
  )
}
