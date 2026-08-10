import { type CSSProperties } from 'react'

import BackgroundDots from '../components/BackgroundDots.tsx'
import HeroTerminal, { type TerminalTurn } from '../components/HeroTerminal.tsx'
import PostRow from '../components/PostRow.tsx'
import { posts } from '../content/index.ts'
import { authorBio, githubUrl, siteName, tagline } from '../site.ts'

/**
 * 首页 = 连续终端流（父 PRD #16「一台恒黑底的连续终端流」收尾）：
 * hero（大号站点名 h1 + pi.dev 风格 AI 会话演出终端）+ 文章列表（终端输出行）。
 * 终端内容由「对话轮次」数据结构驱动（user 提问 / tool 工具调用 / assistant 回答，
 * issue #18）：文章数/标签数从内容清单自动计算（新增文章无需改代码），
 * 简介/tagline 沿用站点信息，GitHub 外链真实指向仓库。
 * 文章区为终端输出行（mono 日期 + 标题 + #标签，issue #19）：会话演出结束后
 * （停驻最终态）作为最后一幕逐行错开入场，入场时序由 --turn-count（轮次数）与
 * hero 终端同一节奏参数（--turn-gap / --turn-in）在 CSS 侧计算——新增文章自动
 * 增长行数，无需改代码。
 */
export default function Home() {
  // ls posts 的文章数/标签数：来自构建期内容清单（非 draft），自动计算
  const postCount = posts.length
  const tagCount = new Set(posts.flatMap((post) => post.tags)).size

  // 三轮问答剧本（issue #18）：你是谁 / 这个站有什么 / 怎么联系
  const turns: TerminalTurn[] = [
    { role: 'user', text: '你是谁' },
    { role: 'tool', call: 'read about.md' },
    { role: 'assistant', lines: [{ text: authorBio }, { text: tagline, typewriter: true }] },
    { role: 'user', text: '这个站有什么' },
    { role: 'tool', call: 'ls posts' },
    { role: 'assistant', lines: [{ text: `${postCount} 篇文章 · ${tagCount} 个标签` }] },
    { role: 'user', text: '怎么联系' },
    { role: 'tool', call: 'open github.com/hacxy' },
    {
      role: 'assistant',
      lines: [
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
      {/* 连续终端流容器：--turn-count 供文章行入场延迟计算——
          会话演出结束后（停驻最终态）文章行作为最后一幕逐行错开入场；
          内层 max-w-2xl 收窄居中：全站容器放宽为 max-w-6xl 后首页视觉零回归（issue #28） */}
      <div
        className="home-stream mx-auto max-w-2xl"
        style={{ '--turn-count': turns.length } as CSSProperties}
      >
        {/* hero 区：克制的入场动画（淡入 + 轻微上移，纯 CSS，reduced-motion 禁用） */}
        <section className="hero-enter">
          <h1 className="font-mono text-4xl font-bold tracking-tight">{siteName}</h1>
          <HeroTerminal turns={turns} />
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
