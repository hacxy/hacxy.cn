import { Link } from 'react-router'

/** 404 兜底 */
export default function NotFound() {
  return (
    <div>
      <h1>404</h1>
      <p>页面不存在。</p>
      <Link to="/">返回首页</Link>
    </div>
  )
}
