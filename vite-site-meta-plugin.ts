import type { Plugin } from 'vite'

import { collectSiteMeta } from './src/siteMeta.ts'

const VIRTUAL_ID = 'virtual:site-meta'
const RESOLVED_ID = '\0' + VIRTUAL_ID

/**
 * 构建期站点元数据注入（issue #42）：package.json 版本号 + 真实仓库 git 统计。
 * 与 postsPlugin 同一模式——Node 侧收集（child_process / fs 不能进浏览器包），
 * 注入 virtual:site-meta 供客户端与 SSR 共享；git 不可得（CI 浅克隆 / 非 git 目录 /
 * git 未安装）时 collectSiteMeta 返回 null，状态栏优雅省略该段、构建不失败。
 */
export function siteMetaPlugin(): Plugin {
  return {
    name: 'site-meta-manifest',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID
    },
    load(id) {
      if (id !== RESOLVED_ID) return
      return `export default ${JSON.stringify(collectSiteMeta())}`
    },
  }
}
