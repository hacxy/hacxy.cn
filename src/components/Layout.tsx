import { NavLink, Outlet } from 'react-router'

import { copyrightYear, githubUrl, siteName } from '../site.ts'
import Icon from './Icon.tsx'
import ThemeToggle from './ThemeToggle.tsx'

/** 当前导航高亮：全站链接机制（加粗 + 下划线，不依赖颜色区分） */
const navLinkClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'nav-active' : undefined)

/** 全局布局：全站容器 + 「文章 | 关于」导航 + 版权页脚（issue #69：移除 CC BY-NC-SA
 *  4.0 外链，footer 内容垂直 + 水平居中）
 *  容器 max-w-6xl，各页内容列由内层 max-w-2xl 收窄居中 */
export default function Layout() {
  return (
    <>
      {/* 全站背景纹理垫底图层：fixed 铺满视口、不拦截指针事件；
          内联 SVG data-URI 平铺（零外部资源），亮暗双变体随 .dark 切换 */}
      <div aria-hidden="true" className="bg-texture" />
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6">
        <nav className="site-nav flex items-center gap-6 py-8">
          <NavLink to="/" end className={navLinkClass}>
            文章
          </NavLink>
          <NavLink to="/about" className={navLinkClass}>
            关于
          </NavLink>
          {/* 右侧：主题切换 + GitHub/RSS 图标链接（GitHub 外链新窗口，RSS 指向构建期生成的 /feed.xml） */}
          <span className="ml-auto flex items-center gap-4">
            <ThemeToggle />
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="icon-link text-accent"
            >
              <Icon name="github-icon" />
            </a>
            <a href="/feed.xml" aria-label="RSS 订阅" className="icon-link text-accent">
              <Icon name="rss-icon" />
            </a>
          </span>
        </nav>
        <main className="flex-1 pb-16">
          <Outlet />
        </main>
        <footer className="flex items-center justify-center border-t py-6 text-sm text-muted">
          <p>
            © {copyrightYear} {siteName}
          </p>
        </footer>
      </div>
    </>
  )
}
