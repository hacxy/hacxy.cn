import type { Post } from './src/content/types.ts'
import type { Plugin } from 'vite'

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { loadPosts } from './src/content/loadPosts.ts'

const VIRTUAL_ID = 'virtual:posts'
const RESOLVED_ID = '\0' + VIRTUAL_ID
const POSTS_DIR = join(process.cwd(), 'content', 'posts')

function collectPosts(): Promise<Post[]> {
  const sources = readdirSync(POSTS_DIR)
    .filter((file) => file.endsWith('.md'))
    .map((file) => ({
      slug: file.replace(/\.md$/, ''),
      raw: readFileSync(join(POSTS_DIR, file), 'utf8'),
    }))
  return loadPosts(sources)
}

/**
 * 构建期内容清单：在 Node 侧运行 Markdown 管线（gray-matter 依赖 fs/Buffer，
 * 不能进浏览器包），把聚合结果注入 virtual:posts 供页面与客户端导航共享。
 * dev 下监听 content/posts 目录，新增/修改文章无需重启。
 */
export function postsPlugin(): Plugin {
  return {
    name: 'posts-manifest',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID
    },
    async load(id) {
      if (id !== RESOLVED_ID) return
      for (const file of readdirSync(POSTS_DIR)) {
        this.addWatchFile(join(POSTS_DIR, file))
      }
      return `export default ${JSON.stringify(await collectPosts())}`
    },
  }
}
