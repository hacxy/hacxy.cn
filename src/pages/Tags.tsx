import { Link } from 'react-router'
import PageTransition from '../components/PageTransition'
import { getAllTags } from '../utils/posts'

export default function Tags() {
  const tags = getAllTags()

  return (
    <PageTransition>
      <div className="page-content">
        <p className="section-heading slide-enter" style={{ '--enter-stage': 1 } as React.CSSProperties}>
          Tags
        </p>
        <ul className="tags-list">
          {tags.map((item, i) => (
            <li
              key={item.tag}
              className="slide-enter"
              style={{ '--enter-stage': i + 2 } as React.CSSProperties}
            >
              <Link to={`/tags/${item.tag}`} className="tag-item-link">
                <span>{item.tag}</span>
                <span className="tag-count">{item.count}</span>
              </Link>
            </li>
          ))}
        </ul>
        {tags.length === 0 && (
          <p style={{ opacity: 0.5, fontSize: '0.9rem' }}>No tags yet.</p>
        )}
      </div>
    </PageTransition>
  )
}
