import { Link, useParams } from 'react-router'

import { posts } from '../content/index.ts'
import NotFound from './NotFound.tsx'

/**
 * 文章详情页：正文为构建期渲染完成的 HTML 字符串（含 Shiki 高亮与标题锚点），
 * 客户端经 dangerouslySetInnerHTML 挂载，同一字符串服务端/客户端完全一致，
 * 从根上避免 hydration mismatch（PRD「渲染策略」决策）。
 */
export default function PostPage() {
  const { slug } = useParams()
  const postIndex = posts.findIndex((item) => item.slug === slug)
  const post = postIndex >= 0 ? posts[postIndex] : undefined

  if (!post) {
    return <NotFound />
  }

  // 内容清单按日期倒序（最新在前）：上一条 = 更新的文章，下一条 = 更旧的
  const newer = posts[postIndex - 1]
  const older = posts[postIndex + 1]

  return (
    <article>
      <h1>{post.title}</h1>
      <time dateTime={post.date}>{post.date}</time>

      {post.toc.length > 0 && (
        <nav aria-label="文章目录">
          <h2>目录</h2>
          <ul>
            {post.toc.map((item) => (
              <li key={item.id} className={item.level === 3 ? 'pl-4' : undefined}>
                <a href={`#${item.id}`}>{item.text}</a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div dangerouslySetInnerHTML={{ __html: post.html }} />

      {(newer || older) && (
        <nav aria-label="上一篇/下一篇">
          {newer && (
            <p>
              <Link to={`/posts/${newer.slug}`}>上一篇：{newer.title}</Link>
            </p>
          )}
          {older && (
            <p>
              <Link to={`/posts/${older.slug}`}>下一篇：{older.title}</Link>
            </p>
          )}
        </nav>
      )}
    </article>
  )
}
