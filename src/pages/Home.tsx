import BackgroundDots from '../components/BackgroundDots.tsx'
import HeroTerminal, { type TerminalTurn } from '../components/HeroTerminal.tsx'
import PostRow from '../components/PostRow.tsx'
import { posts } from '../content/index.ts'
import { authorBio, githubUrl, siteName, tagline } from '../site.ts'

/**
 * 首页 = 连续终端流（父 PRD #16「一台恒黑底的连续终端流」收尾）：
 * hero（大号站点名 h1 + pi 风格 AI 编码 agent 会话演出终端）+ 文章列表（终端输出行）。
 * 终端为「会话 transcript → 分隔线 → 输入区 → 状态栏」结构（issue #40）：
 * 每轮问答经输入框演出（自动逐字符打字 → 发送进 transcript → Thinking… → Done. →
 * 回答），三轮全部经输入框、信息不缩水（简介 + tagline / 文章数·标签数 / GitHub 外链）。
 * 演出文本全部数据驱动（turns 数组 + 构建期计算的文章数/标签数）：新增内容
 * （新增文章、新增轮次）无需改渲染代码。
 * 文章区为终端输出行（mono 日期 + 标题 + #标签，issue #19）：与 hero 终端演出
 * 并行入场（issue #40，入场延迟不再大于演出末段），逐行错开 fade-in 保留。
 */
export default function Home() {
  // ls posts 的文章数/标签数：来自构建期内容清单（非 draft），自动计算
  const postCount = posts.length
  const tagCount = new Set(posts.flatMap((post) => post.tags)).size

  // 三轮问答剧本（issue #40）：你是谁 / 这个站有什么 / 怎么联系——
  // question 经输入框打字演出后进入 transcript；lines 为发送后依次揭示的
  // 输出行（状态行 Thinking…/Done. + 回答行），回答全文保留
  const turns: TerminalTurn[] = [
    {
      question: '你是谁',
      lines: [
        { text: 'Thinking…', status: 'thinking' },
        { text: 'Done.', status: 'done' },
        { text: authorBio },
        { text: tagline, typewriter: true },
      ],
    },
    {
      question: '这个站有什么',
      lines: [
        { text: 'Thinking…', status: 'thinking' },
        { text: 'Done.', status: 'done' },
        { text: `${postCount} 篇文章 · ${tagCount} 个标签` },
      ],
    },
    {
      question: '怎么联系',
      lines: [
        { text: 'Thinking…', status: 'thinking' },
        { text: 'Done.', status: 'done' },
        {
          text: (
            <a href={githubUrl} target="_blank" rel="noopener noreferrer">
              {githubUrl}
            </a>
          ),
        },
      ],
    },
  ]

  return (
    <>
      {/* 背景点阵动画（ArtDots 改编）：仅首页挂载、仅客户端渲染（SSR 输出 null） */}
      <BackgroundDots />
      {/* 连续终端流容器：内层 max-w-2xl 收窄居中：全站容器放宽为 max-w-6xl 后
          首页视觉零回归（issue #28）；文章行入场节奏参数见 .home-stream */}
      <div className="home-stream mx-auto max-w-2xl">
        {/* hero 区：克制的入场动画（淡入 + 轻微上移，纯 CSS，reduced-motion 禁用） */}
        <section className="hero-enter">
          <h1 className="font-mono text-4xl font-bold tracking-tight">{siteName}</h1>
          <HeroTerminal turns={turns} siteStats={{ postCount, tagCount }} />
        </section>
        <ul className="post-row-list">
          {posts.map((post, i) => (
            <PostRow key={post.slug} post={post} index={i} />
          ))}
        </ul>
      </div>
    </>
  )
}
