import { useParams } from 'react-router'

import { posts } from '../content/index.ts'
import NotFound from './NotFound.tsx'

/**
 * 文章详情页：正文为构建期渲染完成的 HTML 字符串（含 Shiki 高亮与标题锚点），
 * 客户端经 dangerouslySetInnerHTML 挂载，同一字符串服务端/客户端完全一致，
 * 从根上避免 hydration mismatch（PRD「渲染策略」决策）。
 */
export default function PostPage() {
  const { slug } = useParams()
  const post = posts.find((item) => item.slug === slug)

  if (!post) {
    return <NotFound />
  }

  return (
    <article>
      <h1>{post.title}</h1>
      <time dateTime={post.date}>{post.date}</time>
      <div dangerouslySetInnerHTML={{ __html: post.html }} />
    </article>
  )
}
