import type { ServerResponse } from 'node:http'
import type { Connect, Plugin, ViteDevServer } from 'vite'

import { join } from 'node:path'

import { collectPostSources } from './src/content/collectSources.ts'
import { loadPosts } from './src/content/loadPosts.ts'
import { generateFeed } from './src/feed.ts'
import { siteName, siteUrl, tagline } from './src/site.ts'

const POSTS_DIR = join(process.cwd(), 'content', 'posts')
const FEED_PATH = '/feed.xml'

export interface FeedHandlerOptions {
  /** feed 条目链接的站点地址（dev = 当前 origin，如 http://localhost:5173），不带尾斜杠 */
  baseUrl: string
  /** 文章目录（单测注入 fixture；默认 content/posts） */
  postsDir?: string
}

/**
 * dev feed HTTP 处理器（单测 mock req/res 直测的接缝）：
 * 仅精确命中 GET /feed.xml（query 不影响）时生成并响应 feed，其余请求返回
 * false 交还中间件链。草稿经 loadPosts 过滤（永不进入 feed）；每次请求
 * 重新聚合内容，新增/修改文章无需重启 dev。
 */
export async function handleFeedRequest(
  req: Connect.IncomingMessage,
  res: ServerResponse,
  options: FeedHandlerOptions,
): Promise<boolean> {
  if (req.method !== 'GET') return false
  const pathname = (req.url ?? '').split('?')[0] ?? ''
  if (pathname !== FEED_PATH) return false
  const posts = await loadPosts(collectPostSources(options.postsDir ?? POSTS_DIR), {
    includeDrafts: false,
  })
  res.statusCode = 200
  res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8')
  res.end(generateFeed(posts, options.baseUrl, siteName, tagline))
  return true
}

/** dev 站点当前 origin（http://localhost:<port>，不带尾斜杠）；回退 Host 头 / 生产地址 */
function resolveDevOrigin(server: ViteDevServer, req: Connect.IncomingMessage): string {
  const local = server.resolvedUrls?.local[0]
  if (local) return local.replace(/\/$/, '')
  const host = req.headers.host
  return host ? `http://${host}` : siteUrl
}

/**
 * dev 专用 RSS 插件：configureServer 中间件先于 SPA fallback 生效，
 * 仅拦截精确路径 /feed.xml，按需生成与生产一致的 feed（条目链接用当前
 * origin，点击即打开对应文章）。无构建期钩子——生产 feed 仍由
 * scripts/prerender 发射，插件不影响构建产物。
 */
export function feedPlugin(): Plugin {
  return {
    name: 'dev-feed',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        void handleFeedRequest(req, res, {
          baseUrl: resolveDevOrigin(server, req),
        }).then(
          (handled) => {
            if (!handled) next()
          },
          (error) => next(error),
        )
      })
    },
  }
}
