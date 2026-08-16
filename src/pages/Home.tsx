import BackgroundDots from '../components/BackgroundDots.tsx'
import HeroTerminal, { type TerminalTurn } from '../components/HeroTerminal.tsx'
import PostRow from '../components/PostRow.tsx'
import { posts } from '../content/index.ts'
import { authorBio, githubUrl, tagline } from '../site.ts'

/**
 * 首页 = 连续终端流：hero（AI 编码 agent 会话演出终端）+ 文章列表（终端输出行）。
 * hero 演出文本全部数据驱动（turns 数组 + 构建期计算的文章数/标签数）：每轮经
 * 输入框自动逐字符打字 → 发送进 transcript → Thinking… → Done. → 回答；新增内容
 * 无需改渲染代码。文章区与 hero 演出并行入场、逐行错开 fade-in。
 */
export default function Home() {
  // 文章数/标签数：来自构建期内容清单（非 draft），自动计算
  const postCount = posts.length
  const tagCount = new Set(posts.flatMap((post) => post.tags)).size

  // 三轮问答剧本：你是谁 / 这个站有什么 / 怎么联系——
  // question 经输入框打字演出后进入 transcript；lines 为发送后依次揭示的输出行
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
      {/* 连续终端流容器：内层 max-w-2xl 收窄居中；文章行入场节奏参数见 .home-stream */}
      <div className="home-stream mx-auto max-w-2xl">
        {/* hero 区：克制的入场动画（淡入 + 轻微上移，纯 CSS，reduced-motion 禁用） */}
        <section className="hero-enter">
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
