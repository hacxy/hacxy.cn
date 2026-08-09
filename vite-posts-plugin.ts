import type { Post } from './src/content/types.ts'
import type { Plugin } from 'vite'

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { loadPosts } from './src/content/loadPosts.ts'

const VIRTUAL_ID = 'virtual:posts'
const RESOLVED_ID = '\0' + VIRTUAL_ID
const POSTS_DIR = join(process.cwd(), 'content', 'posts')

function collectPosts(includeDrafts: boolean): Promise<Post[]> {
  const sources = readdirSync(POSTS_DIR)
    .filter((file) => file.endsWith('.md'))
    .map((file) => ({
      slug: file.replace(/\.md$/, ''),
      raw: readFileSync(join(POSTS_DIR, file), 'utf8'),
    }))
  return loadPosts(sources, { includeDrafts })
}

/**
 * 构建期内容清单：在 Node 侧运行 Markdown 管线（gray-matter 依赖 fs/Buffer，
 * 不能进浏览器包），把聚合结果注入 virtual:posts 供页面与客户端导航共享。
 * dev 下监听 content/posts 目录，新增/修改文章无需重启。
 * draft 策略：dev/test 模式包含草稿供本地预览；production 构建排除
 * （草稿不进入清单、RSS 与 sitemap）。
 */
export function postsPlugin(): Plugin {
  let includeDrafts = false
  return {
    name: 'posts-manifest',
    configResolved(config) {
      includeDrafts = config.mode !== 'production'
    },
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID
    },
    async load(id) {
      if (id !== RESOLVED_ID) return
      // 仅监听 .md 文件（目录本身不参与 import 分析，避免 vitest 误解析）
      for (const file of readdirSync(POSTS_DIR)) {
        if (file.endsWith('.md')) {
          this.addWatchFile(join(POSTS_DIR, file))
        }
      }
      const code = `export default ${JSON.stringify(await collectPosts(includeDrafts))}`
      return code
    },
  }
}
