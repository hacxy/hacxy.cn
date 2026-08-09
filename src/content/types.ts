/** 目录项：仅 h2/h3，带锚点 id */
export interface TocItem {
  id: string
  text: string
  level: 2 | 3
}

/** 一篇文章的完整数据模型（构建期生成，页面与客户端导航共享） */
export interface Post {
  /** 来自文件名（英文 slug） */
  slug: string
  /** frontmatter.title */
  title: string
  /** YYYY-MM-DD（ISO） */
  date: string
  description: string
  tags: string[]
  /** draft: true 时仅本地可见 */
  draft: boolean
  /** 可选，修订标记 */
  updated?: string
  /** 构建期渲染完成的 HTML（含高亮与锚点） */
  html: string
  toc: TocItem[]
}

/** 内容管线输入：原始 Markdown 源与 slug */
export interface PostSource {
  slug: string
  raw: string
}
