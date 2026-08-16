import { Link, useParams } from 'react-router'

import PostDrawerNav from '../components/PostDrawerNav.tsx'
import PostIndex from '../components/PostIndex.tsx'
import PostToc from '../components/PostToc.tsx'
import { posts } from '../content/index.ts'
import { sameDirectoryNeighbors } from '../content/navigation.ts'
import NotFound from './NotFound.tsx'

/**
 * 文章详情页：正文为构建期渲染完成的 HTML（含 Shiki 高亮与标题锚点），经
 * dangerouslySetInnerHTML 挂载，同一字符串服务端/客户端完全一致，从根上避免
 * hydration mismatch。
 *
 * 三栏布局（≥1024px）：左栏 sticky 全文章索引 + 中栏正文（~600px 阅读宽度）
 * + 右栏 sticky 锚点目录（scroll-spy）；toc 为空时右栏隐藏、退化为两栏；
 * <1024px 右栏隐藏、<768px 退回单栏（侧栏收进覆盖式抽屉）。
 * 上一篇/下一篇：同目录内按日期倒序相邻、目录边界处停止（不跨界）。
 */
export default function PostPage() {
  // posts/* splat：嵌套目录 slug（pi-agent/01）原样经通配段捕获
  const slug = useParams()['*'] ?? ''
  const postIndex = posts.findIndex((item) => item.slug === slug)
  const post = postIndex >= 0 ? posts[postIndex] : undefined

  if (!post) {
    return <NotFound />
  }

  // 上一篇/下一篇：同一目录内按日期倒序相邻、目录边界处停止（不跨界）
  const { newer, older } = sameDirectoryNeighbors(posts, slug)

  return (
    <>
      {/* 抽屉导航：窄屏侧栏收进覆盖式抽屉；≥1024px 整条隐藏（不占 Tab 序） */}
      <PostDrawerNav toc={post.toc} />
      {/* toc 为空（文章无 h2/h3 标题）时右栏整栏隐藏、布局退化为两栏（--no-toc） */}
      <div className={post.toc.length > 0 ? 'post-layout' : 'post-layout post-layout--no-toc'}>
        {/* 左栏：sticky 常驻全文章索引；<768px 隐藏 */}
        <PostIndex />
        <article className="post-main">
          {/* 头部信息区：大标题 + mono 元数据（日期/updated/#标签）+ 描述 */}
          <header className="post-header">
            <h1 className="post-title">{post.title}</h1>
            <div className="post-meta">
              <time dateTime={post.date}>{post.date}</time>
              {post.updated && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="post-updated">
                    updated <time dateTime={post.updated}>{post.updated}</time>
                  </span>
                </>
              )}
            </div>
            {post.tags.length > 0 && (
              <div className="post-tags" aria-label="标签">
                {post.tags.map((tag) => (
                  <span key={tag} className="post-tag">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            {post.description && <p className="post-description">{post.description}</p>}
          </header>

          <div className="post-body" dangerouslySetInnerHTML={{ __html: post.html }} />

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
        {/* 右栏：sticky 锚点目录 + scroll-spy；仅文章有标题时渲染，<1024px 由 CSS 隐藏 */}
        {post.toc.length > 0 && <PostToc toc={post.toc} />}
      </div>
    </>
  )
}
