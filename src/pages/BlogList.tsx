import { Link, useParams } from 'react-router'
import PageTransition from '../components/PageTransition'
import { getPostsGroupedByYear, getPostsByTag } from '../utils/posts'

export default function BlogList() {
  const { tag } = useParams<{ tag?: string }>()

  if (tag) {
    const posts = getPostsByTag(tag)
    return (
      <PageTransition>
        <div className="page-content">
          <p className="section-heading slide-enter" style={{ '--enter-stage': 1 } as React.CSSProperties}>
            Tag: {tag}
          </p>
          <ul className="post-list">
            {posts.map((post, i) => (
              <li
                key={post.slug}
                className="post-list-item slide-enter"
                style={{ '--enter-stage': i + 2 } as React.CSSProperties}
              >
                {post.date && <time className="post-date">{post.date}</time>}
                <Link to={`/posts/${post.slug}`} className="post-link">
                  {post.title}
                </Link>
              </li>
            ))}
          </ul>
          {posts.length === 0 && (
            <p style={{ opacity: 0.5, fontSize: '0.9rem' }}>No posts found.</p>
          )}
        </div>
      </PageTransition>
    )
  }

  const groups = getPostsGroupedByYear()
  let stageCounter = 0

  return (
    <PageTransition>
      <div className="page-content">
        {groups.map(({ year, posts }) => (
          <div key={year} className="year-group">
            <div
              className="year-heading slide-enter"
              style={{ '--enter-stage': ++stageCounter } as React.CSSProperties}
            >
              {year}
            </div>
            <ul className="post-list">
              {posts.map((post) => (
                <li
                  key={post.slug}
                  className="post-list-item slide-enter"
                  style={{ '--enter-stage': ++stageCounter } as React.CSSProperties}
                >
                  {post.date && (
                    <time className="post-date">{post.date.slice(5)}</time>
                  )}
                  <Link to={`/posts/${post.slug}`} className="post-link">
                    {post.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </PageTransition>
  )
}
