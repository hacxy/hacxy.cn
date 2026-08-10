import { Link, useParams } from 'react-router'

import PostDrawerNav from '../components/PostDrawerNav.tsx'
import PostIndex from '../components/PostIndex.tsx'
import PostToc from '../components/PostToc.tsx'
import { posts } from '../content/index.ts'
import NotFound from './NotFound.tsx'

/**
 * 文章详情页：正文为构建期渲染完成的 HTML 字符串（含 Shiki 高亮与标题锚点），
 * 客户端经 dangerouslySetInnerHTML 挂载，同一字符串服务端/客户端完全一致，
 * 从根上避免 hydration mismatch（PRD「渲染策略」决策）。
 *
 * 三栏布局（issue #30，≥1024px）：左栏 sticky 常驻全文章索引（PostIndex，
 * 与首页终端行同构、当前文章加粗 + 下划线高亮），中栏正文自然收窄至 ~600px
 * 阅读宽度（37.5rem，中文 ~35 字/行），右栏 sticky 锚点目录（PostToc，
 * h2/h3 两级 + IntersectionObserver scroll-spy 高亮当前章节）；
 * 文章无标题（toc 为空）时右栏整栏隐藏、退化为两栏；<1024px 右栏隐藏，
 * <768px 退回单栏（窄屏侧栏收进覆盖式抽屉，见 PostDrawerNav，issue #31）。
 * 头部信息区（issue #28）：大标题 + mono 日期/updated（有才显示）+ #标签 + 描述；正文排版为干净 prose 风格
 * （层级/留白/独立成块，见 index.css .post-body），终端美学保留在首页与列表。
 * 内嵌「目录」块已移除（issue #30），TOC 语义（aria-label="文章目录"）保留。
 * 上一篇/下一篇保留在正文底部（issue #29）。
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
    <>
      {/* 抽屉导航（issue #31）：窄屏下侧栏收进覆盖式抽屉；仅文章页渲染，
          ≥1024px 整条隐藏（桌面侧栏常驻、按钮不占 Tab 序） */}
      <PostDrawerNav toc={post.toc} />
      {/* toc 为空（文章无 h2/h3 标题）时右栏整栏隐藏、布局退化为两栏（--no-toc） */}
      <div className={post.toc.length > 0 ? 'post-layout' : 'post-layout post-layout--no-toc'}>
        {/* 左栏：sticky 常驻全文章索引（issue #29）；<768px 隐藏（抽屉交互后续接入） */}
        <PostIndex />
        <article className="post-main">
          {/* 头部信息区：大标题 + mono 元数据（日期/updated/#标签）+ 描述，与正文以细线分隔 */}
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
        {/* 右栏：sticky 锚点目录 + scroll-spy（issue #30）；仅文章有标题时渲染，
          <1024px 由 CSS 隐藏，toc 为空时整栏不渲染（布局退化为两栏） */}
        {post.toc.length > 0 && <PostToc toc={post.toc} />}
      </div>
    </>
  )
}
