/**
 * 目录配置共享模块（issue #45）：配置类型 + defineDirConfig 运行时透传，零依赖。
 * 配置文件（content/posts/<目录>/config.ts）经相对路径 + 显式 .ts 扩展名导入本模块
 * （与仓库 allowImportingTsExtensions 风格一致），在编辑器内获得配置字段与上下文的
 * 类型提示、自动补全。模块保持纯类型 + 恒等函数：Node 原生 type stripping 可直接
 * 加载（erasable syntax，无 enum/namespace 等不可擦除语法）。
 */

/** 目录配置上下文：目录路径 + 该目录文章清单 */
export interface DirConfigContext {
  /** 目录相对路径（如 pi-agent 或 a/b）；根层（content/posts/config.ts）为 '' */
  path: string
  /** 该目录内的文章（不含子目录），按日期倒序（与内容清单同一契约） */
  posts: DirConfigPost[]
}

/** 上下文中单篇文章的轻量形态（配置所需的最小字段集） */
export interface DirConfigPost {
  slug: string
  title: string
  date: string
}

/** 目录配置字段：缺省值保证无配置文件目录的行为不变（showSubdirs 缺省 true） */
export interface DirConfig {
  /** 是否在该层树中显示子文件夹抽屉（缺省 true）；false 时该层只显示文章 */
  showSubdirs?: boolean
}

/** 配置文件导出形态：defineDirConfig((ctx) => ({ showSubdirs })) */
export type DirConfigFactory = (ctx: DirConfigContext) => DirConfig

/** 目录路径 → 配置（构建期求值结果；路径契约 = 目录相对路径，'' = 根层） */
export type DirConfigMap = Record<string, DirConfig>

/** 运行时透传（恒等）：让配置文件获得类型提示与补全，构建期按同一工厂求值 */
export function defineDirConfig(factory: DirConfigFactory): DirConfigFactory {
  return factory
}
