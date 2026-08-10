import { Link } from 'react-router'

import BackgroundDots from '../components/BackgroundDots.tsx'
import HeroTerminal, { type TerminalCommand } from '../components/HeroTerminal.tsx'
import { posts } from '../content/index.ts'
import { authorBio, githubUrl, siteName, tagline } from '../site.ts'

/**
 * 首页：hero（大号站点名 h1 + 数据驱动终端窗口）+ 文章列表（标题 + 日期，按日期倒序）。
 * 终端内容由「命令 + 输出 + 是否打字机」的数据结构驱动：文章数/标签数从内容清单自动
 * 计算（新增文章无需改代码），whoami 沿用站点信息，git clone 真实指向 GitHub。
 */
export default function Home() {
  // ls posts 的文章数/标签数：来自构建期内容清单（非 draft），自动计算
  const postCount = posts.length
  const tagCount = new Set(posts.flatMap((post) => post.tags)).size

  const commands: TerminalCommand[] = [
    { command: 'whoami', output: `hacxy · ${authorBio}` },
    { command: 'cat tagline.txt', output: tagline, typewriter: true },
    { command: 'ls posts', output: `${postCount} 篇文章 · ${tagCount} 个标签` },
    { command: 'npm run build', output: '✓ 构建成功 · 0 错误，产物已就绪' },
    {
      command: 'git clone',
      output: (
        <a
          href={githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-terminal underline underline-offset-2"
        >
          {githubUrl}
        </a>
      ),
    },
  ]

  return (
    <>
      {/* 背景点阵动画（ArtDots 改编）：仅首页挂载、仅客户端渲染（SSR 输出 null） */}
      <BackgroundDots />
      {/* hero 区：克制的入场动画（淡入 + 轻微上移，纯 CSS，reduced-motion 禁用） */}
      <section className="hero-enter">
        <h1 className="font-mono text-4xl font-bold tracking-tight">{siteName}</h1>
        <HeroTerminal commands={commands} />
      </section>
      <ul>
        {posts.map((post) => (
          <li key={post.slug}>
            <Link to={`/posts/${post.slug}`} className="text-accent">
              {post.title}
            </Link>
            {/* dev 模式清单含 draft 文章，构建产物不含；此处标记仅 dev 出现 */}
            {post.draft && <span>（草稿）</span>}
            <span className="font-mono text-muted">{post.date}</span>
          </li>
        ))}
      </ul>
    </>
  )
}
