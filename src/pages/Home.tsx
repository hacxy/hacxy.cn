import { Link } from 'react-router'

import { posts } from '../content/index.ts'
import { siteName, tagline } from '../site.ts'

/** 首页：站点名 + 一句话定位 + 文章列表（标题 + 日期，按日期倒序） */
export default function Home() {
  return (
    <div>
      <h1>{siteName}</h1>
      <p>{tagline}</p>
      <ul>
        {posts.map((post) => (
          <li key={post.slug}>
            <Link to={`/posts/${post.slug}`}>{post.title}</Link>
            <span>{post.date}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
