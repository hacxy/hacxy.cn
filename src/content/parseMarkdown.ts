import type { Post, TocItem } from './types.ts'
import type { Element, ElementContent, Root } from 'hast'
import type { Highlighter } from 'shiki'

import GithubSlugger from 'github-slugger'
import matter from 'gray-matter'
import { fromHtml } from 'hast-util-from-html'
import rehypeStringify from 'rehype-stringify'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { createHighlighter } from 'shiki'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'

import { directoryOf } from './navigation.ts'

/** YYYY-MM-DD 严格格式 */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** 双主题高亮：亮色内联 + 暗色走 --shiki-dark 变量（无需重新生成 HTML） */
const LIGHT_THEME = 'github-light'
const DARK_THEME = 'github-dark'
const HIGHLIGHT_LANGS = [
  'bash',
  'css',
  'diff',
  'html',
  'js',
  'json',
  'markdown',
  'python',
  'sh',
  'sql',
  'ts',
  'tsx',
  'yaml',
]

// Shiki 实例初始化是异步的（加载 oniguruma wasm），之后 codeToHtml 为同步调用。
// 构建期/单测都在 Node 侧，缓存单例避免重复初始化。
let highlighterPromise: Promise<Highlighter> | null = null

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [LIGHT_THEME, DARK_THEME],
      langs: HIGHLIGHT_LANGS,
    })
  }
  return highlighterPromise
}

function formatDate(d: Date): string {
  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeDate(value: unknown, slug: string): string {
  // gray-matter（js-yaml）会把 YAML 日期解析为 Date 对象
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatDate(value)
  }
  if (typeof value === 'string' && ISO_DATE_RE.test(value)) {
    return value
  }
  throw new Error(
    `[content] post "${slug}" 的 frontmatter.date 缺失或非法（需为 YYYY-MM-DD），实际值：${JSON.stringify(value)}`,
  )
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/** 可选修订日期：与 date 同样兼容 YAML Date 对象，非法/缺失返回 undefined */
function normalizeOptionalDate(value: unknown): string | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatDate(value)
  }
  if (typeof value === 'string') {
    return value || undefined
  }
  return undefined
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string')
  return typeof value === 'string' ? [value] : []
}

/** 提取元素文本（递归展开 inline code / em 等子元素） */
function elementText(node: Element): string {
  return node.children
    .map((child: ElementContent) => {
      if (child.type === 'text') return child.value
      if (child.type === 'element') return elementText(child)
      return ''
    })
    .join('')
}

/** 从 code 元素的 className（language-xxx）中提取语言名 */
function languageOf(code: Element): string | undefined {
  const prefix = 'language-'
  const match = asStringArray(code.properties.className).find(
    (c: string) => c.startsWith(prefix) && c.length > prefix.length,
  )
  return match?.slice(prefix.length)
}

/**
 * 代码高亮 rehype 插件：把带语言标记的 <pre><code> 用 Shiki 双主题渲染，
 * 替换为高亮后的 pre（保留 language-xxx 标记供 CSS 定制）；未知语言或
 * 无语言标记的代码块原样保留，绝不阻断构建。
 */
function rehypeCodeHighlight(highlighter: Highlighter) {
  return (tree: Root) => {
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'pre') return
      const codeElement = node.children.find(
        (child: ElementContent): child is Element =>
          child.type === 'element' && child.tagName === 'code',
      )
      const lang = codeElement && languageOf(codeElement)
      if (!codeElement || !lang) return

      let highlighted: string
      try {
        highlighted = highlighter.codeToHtml(elementText(codeElement), {
          lang,
          themes: { light: LIGHT_THEME, dark: DARK_THEME },
        })
      } catch {
        return // 未知语言：保留原文
      }

      const parsed = fromHtml(highlighted, { fragment: true })
      const pre = parsed.children[0]
      if (pre?.type === 'element' && index !== undefined && parent) {
        pre.properties = {
          ...pre.properties,
          className: [...asStringArray(pre.properties.className), `language-${lang}`],
        }
        parent.children[index] = pre
      }
    })
  }
}

/** 标题锚点 rehype 插件：为 h1-h6 添加 github 风格锚点 id（重复标题自动去重） */
function rehypeHeadingAnchors() {
  const slugger = new GithubSlugger()
  return (tree: Root) => {
    slugger.reset()
    visit(tree, 'element', (node) => {
      if (node.tagName && /^h[1-6]$/.test(node.tagName)) {
        node.properties = { ...node.properties, id: slugger.slug(elementText(node)) }
      }
    })
  }
}

/** 图片引用重写 rehype 插件：文章同目录 assets/（或 ./assets/）引用重写为
 * 站点绝对路径 /assets/<目录路径>/<文件名>；不同目录同名图片互不撞车，
 * 绝对路径、外链与 ../ 引用原样保留。 */
function rehypeRewriteImageSrc(slug: string) {
  const dirPrefix = directoryOf(slug) ? `${directoryOf(slug)}/` : ''
  return (tree: Root) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'img') return
      const src = node.properties.src
      if (typeof src !== 'string') return
      if (src.startsWith('assets/')) {
        node.properties.src = `/assets/${dirPrefix}${src.slice('assets/'.length)}`
      } else if (src.startsWith('./assets/')) {
        node.properties.src = `/assets/${dirPrefix}${src.slice('./assets/'.length)}`
      }
    })
  }
}

/** TOC 提取 rehype 插件：仅收集 h2/h3 及其锚点 id（与标题锚点同树，id 必然一致） */
function rehypeCollectToc(toc: TocItem[]) {
  return (tree: Root) => {
    visit(tree, 'element', (node) => {
      if (node.tagName === 'h2' || node.tagName === 'h3') {
        toc.push({
          id: String(node.properties.id ?? ''),
          text: elementText(node),
          level: node.tagName === 'h2' ? 2 : 3,
        })
      }
    })
  }
}

/** Markdown → HTML（构建期一次性完成：GFM + Shiki 高亮 + 标题锚点 + TOC 提取） */
async function renderHtml(
  content: string,
  highlighter: Highlighter,
  slug: string,
): Promise<{ html: string; toc: TocItem[] }> {
  const toc: TocItem[] = []
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(() => rehypeCodeHighlight(highlighter))
    .use(rehypeHeadingAnchors)
    .use(() => rehypeRewriteImageSrc(slug))
    .use(() => rehypeCollectToc(toc))
    .use(rehypeStringify)
  const html = String(await processor.process(content))
  return { html, toc }
}

/**
 * 把一篇 Markdown 源文本渲染为 Post。
 * frontmatter 缺字段时使用确定性默认值：
 * - title 缺失/为空 → slug
 * - description 缺失 → ''
 * - tags 缺失/非数组 → []
 * - draft 缺失 → false
 * - updated 缺失 → undefined
 * - date 缺失或非法（非 YYYY-MM-DD）→ 抛出 Error（无法排序的文章不允许发布）
 */
export async function parseMarkdown(raw: string, slug: string): Promise<Post> {
  const { data, content } = matter(raw)

  const title = normalizeString(data.title) || slug
  const date = normalizeDate(data.date, slug)
  const description = normalizeString(data.description)
  const tags = normalizeStringArray(data.tags)
  const draft = data.draft === true
  const updated = normalizeOptionalDate(data.updated)

  const highlighter = await getHighlighter()
  const { html, toc } = await renderHtml(content, highlighter, slug)

  return { slug, title, date, description, tags, draft, updated, html, toc }
}
