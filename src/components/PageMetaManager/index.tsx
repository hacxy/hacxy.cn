import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { getPostBySlug } from '../../utils/posts'
import { parseFrontmatter } from '../../utils/frontmatter'
import blogConfig from 'virtual:blog-config'

const SITE_TITLE = blogConfig.title ?? "Hacxy's Blog"
const SITE_BIO = blogConfig.bio ?? ''

const STATIC_META: Record<string, { title: string; description: string }> = {
  '/': { title: SITE_TITLE, description: SITE_BIO },
  '/posts': { title: `Blog | ${SITE_TITLE}`, description: '所有文章' },
  '/tags': { title: `Tags | ${SITE_TITLE}`, description: '标签' },
  '/about': { title: `About | ${SITE_TITLE}`, description: SITE_BIO },
}

function extractFirstParagraph(content: string, maxLen = 160): string {
  const cleaned = content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^#+\s.*/gm, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .trim()
  const firstPara = cleaned.split(/\n\n+/).find(p => p.trim().length > 20) ?? ''
  const text = firstPara.replace(/\s+/g, ' ').trim()
  return text.length > maxLen ? text.slice(0, maxLen - 1) + '…' : text
}

function setMeta(title: string, description: string) {
  document.title = title

  let metaDesc = document.querySelector<HTMLMetaElement>('meta[name="description"]')
  if (!metaDesc) {
    metaDesc = document.createElement('meta')
    metaDesc.name = 'description'
    document.head.appendChild(metaDesc)
  }
  metaDesc.content = description
}

export default function PageMetaManager() {
  const location = useLocation()

  useEffect(() => {
    const pathname = location.pathname

    // 静态路由
    const staticMeta = STATIC_META[pathname]
    if (staticMeta) {
      setMeta(staticMeta.title, staticMeta.description)
      return
    }

    // /tags/:tag
    const tagMatch = pathname.match(/^\/tags\/(.+)$/)
    if (tagMatch) {
      const tag = decodeURIComponent(tagMatch[1])
      setMeta(`${tag} | ${SITE_TITLE}`, `标签：${tag}`)
      return
    }

    // 动态文章路由：去掉前导斜杠作为 slug
    const slug = pathname.replace(/^\//, '')
    if (!slug) return

    const post = getPostBySlug(slug)
    if (!post) return

    const { data, content } = parseFrontmatter(post.rawContent)
    const summary = (data.summary as string | undefined) ?? extractFirstParagraph(content)
    setMeta(`${post.title} | ${SITE_TITLE}`, summary)
  }, [location.pathname])

  return null
}
