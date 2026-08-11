import type { DirConfigMap } from './dirConfig.ts'
import type { Post } from './types.ts'

import manifest from 'virtual:posts'

/** 构建期聚合的内容清单：全部非 draft 文章，按日期倒序（由 vite 插件注入） */
export const posts: Post[] = manifest.posts

/** 构建期求值的目录配置：目录路径 → 配置，仅影响该层树形态（由 vite 插件注入） */
export const dirConfigs: DirConfigMap = manifest.dirConfigs
