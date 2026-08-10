import { Link } from 'react-router'

import BackgroundDots from '../components/BackgroundDots.tsx'
import { posts } from '../content/index.ts'
import { siteName, tagline } from '../site.ts'

/** 首页：站点名 + 一句话定位 + 文章列表（标题 + 日期，按日期倒序） */
export default function Home() {
  return (
    <>
      {/* 背景点阵动画（ArtDots 改编）：仅首页挂载、仅客户端渲染（SSR 输出 null） */}
      <BackgroundDots />
      <div>
        <h1 className="font-mono">{siteName}</h1>
        <p>{tagline}</p>
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
      </div>
    </>
  )
}
