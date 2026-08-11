// 客户端安全的内容层出口：仅暴露构建期清单、目录配置与类型。
// 管线纯函数（parseMarkdown / loadPosts / loadDirConfigs）只在 Node 侧
// （vite 插件与单测）按需导入。
export { dirConfigs, posts } from './posts.ts'
export type {
  DirConfig,
  DirConfigContext,
  DirConfigFactory,
  DirConfigMap,
  DirConfigPost,
} from './dirConfig.ts'
export type { Post, PostSource, TocItem } from './types.ts'
