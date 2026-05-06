import { useParams, Link } from 'react-router'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github.css'
import '../styles/markdown.css'
import PageTransition from '../components/PageTransition'
import { getPostBySlug, parseFrontmatter } from '../utils/posts'

export default function BlogPost() {
  const { '*': slug } = useParams()

  if (!slug) return null

  const post = getPostBySlug(slug)

  if (!post) {
    return (
      <PageTransition>
        <div className="page-content">
          <p style={{ opacity: 0.5 }}>Post not found.</p>
          <Link to="/posts" className="nav-link" style={{ marginTop: '1rem', display: 'inline-block' }}>
            ← All posts
          </Link>
        </div>
      </PageTransition>
    )
  }

  const { content: rawBody, data } = parseFrontmatter(post.rawContent)
  const content = rawBody.replace(/^#[^\n]*\n?/, '')
  const tags: string[] = Array.isArray(data.tags) ? data.tags.map(String) : []

  return (
    <PageTransition>
      <div className="page-content">
        <div className="slide-enter" style={{ '--enter-stage': 1 } as React.CSSProperties}>
          <Link
            to="/posts"
            className="nav-link"
            style={{ fontSize: '0.85rem', marginBottom: '2.5rem', display: 'inline-block' }}
          >
            ← Blog
          </Link>
        </div>

        <article>
          <header
            className="slide-enter"
            style={{ '--enter-stage': 2, marginBottom: '2.5rem' } as React.CSSProperties}
          >
            {post.date && (
              <time
                style={{
                  display: 'block',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.85rem',
                  opacity: 0.5,
                  marginBottom: '0.5rem',
                }}
              >
                {post.date}
              </time>
            )}
            <h1 style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3, marginBottom: '0.75rem' }}>
              {post.title}
            </h1>
            {tags.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {tags.map(tag => (
                  <Link key={tag} to={`/tags/${tag}`} className="tag-chip">
                    {tag}
                  </Link>
                ))}
              </div>
            )}
          </header>

          <div className="markdown-body slide-enter" style={{ '--enter-stage': 3 } as React.CSSProperties}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
            >
              {content}
            </ReactMarkdown>
          </div>
        </article>
      </div>
    </PageTransition>
  )
}
