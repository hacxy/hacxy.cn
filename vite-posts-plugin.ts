import type { Post } from './src/content/types.ts'
import type { Plugin } from 'vite'

import { join } from 'node:path'

import { collectMarkdownFiles, collectPostSources } from './src/content/collectSources.ts'
import { collectConfigFiles, loadDirConfigs } from './src/content/loadDirConfigs.ts'
import { loadPosts } from './src/content/loadPosts.ts'

const VIRTUAL_ID = 'virtual:posts'
const RESOLVED_ID = '\0' + VIRTUAL_ID
const POSTS_DIR = join(process.cwd(), 'content', 'posts')

function collectPosts(includeDrafts: boolean): Promise<Post[]> {
  return loadPosts(collectPostSources(POSTS_DIR), { includeDrafts })
}

/**
 * 构建期内容清单：在 Node 侧运行 Markdown 管线（gray-matter 依赖 fs/Buffer，
 * 不能进浏览器包），把聚合结果注入 virtual:posts。
 * dev 下监听 content/posts 目录，新增/修改文章无需重启；
 * draft 策略：dev/test 包含草稿，production 排除（不进入清单、RSS 与 sitemap）。
 * 目录配置：同一构建期在 Node 侧求值各 config.ts，随清单注入 dirConfigs。
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
      // 递归监听全部 .md 文件（含嵌套目录；目录本身不参与 import 分析，避免 vitest 误解析）
      for (const file of collectMarkdownFiles(POSTS_DIR)) {
        this.addWatchFile(file)
      }
      // 递归监听 config.ts：配置变更触发重新求值，无需重启 dev
      for (const file of collectConfigFiles(POSTS_DIR)) {
        this.addWatchFile(file)
      }
      const posts = await collectPosts(includeDrafts)
      const dirConfigs = await loadDirConfigs(POSTS_DIR, posts)
      const code = `export default ${JSON.stringify({ posts, dirConfigs })}`
      return code
    },
  }
}
