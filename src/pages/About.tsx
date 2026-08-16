import { email, socialLinks, tagline } from '../site.ts'

/** 关于页：简介 + 社交链接 + 联系方式 */
export default function About() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-mono">关于</h1>
      <p>{tagline}</p>
      <p>
        我是 Hacxy，一名前端工程师，关注 Web 开发生态与工程化实践。这个博客记录技术思考与踩坑笔记，
        写给同行，也写给未来的自己。
      </p>

      <h2>社交</h2>
      <ul>
        {socialLinks.map((link) => (
          <li key={link.label}>
            <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-accent">
              {link.label}
            </a>
          </li>
        ))}
      </ul>

      <h2>联系</h2>
      <p>
        <a href={`mailto:${email}`} className="text-accent">
          {email}
        </a>
      </p>
    </div>
  )
}
