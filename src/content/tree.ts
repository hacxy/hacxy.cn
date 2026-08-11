import type { DirConfigMap } from './dirConfig.ts'
import type { Post } from './types.ts'

import { directoryOf } from './navigation.ts'

/**
 * 文章页左栏层级树（issue #44）：由内容清单（平铺列表）派生的纯数据结构。
 * 树是清单之上的派生结构、同一来源——buildPostTree 不修改输入清单，
 * 平铺契约（loadPosts 的日期倒序清单）不回归。
 *
 * 同层排序规则（递归同规则）：
 * - 文件夹在前，按目录名字母序（code point 序，确定性）；
 * - 文章在后，按日期倒序（date 降序，同日期保持输入清单的相对顺序——稳定排序）。
 *
 * 目录配置（issue #45，可选项）：showSubdirs: false 的层只保留该层文章、隐藏
 * 子文件夹抽屉；配置仅影响该目录所在层（每层按自己的路径查配置表，子目录配置
 * 互不继承）；被隐藏子目录的文章仍在平铺清单中（URL 与上一篇/下一篇不受影响）。
 * 无配置或缺省 showSubdirs 时行为不变（showSubdirs 缺省 true，零配置即用）。
 */

/** 树节点：文件夹（可折叠抽屉） */
export interface FolderTreeNode {
  type: 'folder'
  /** 目录相对路径（如 pi-agent 或 a/b），折叠状态以路径为键 */
  path: string
  /** 目录名（最后一段，展示用） */
  name: string
  children: TreeNode[]
}

/** 树节点：文章（终端行链接） */
export interface PostTreeNode {
  type: 'post'
  post: Post
}

/** 层级树节点联合 */
export type TreeNode = FolderTreeNode | PostTreeNode

/**
 * 从平铺内容清单派生层级树：根层 = 各级文件夹（字母序在前）+ 根层文章
 * （日期倒序在后）；文件夹内递归同规则。目录任意深度嵌套（issue #41 的
 * slug 契约：相对目录路径）。
 */
export function buildPostTree(posts: Post[], configs: DirConfigMap = {}): TreeNode[] {
  const root: TreeNode[] = []
  // 目录路径 → 文件夹节点：插入时按路径复用，避免同目录文章重复建文件夹
  const folders = new Map<string, FolderTreeNode>()

  // 逐篇文章挂到其目录链的末端（保持输入顺序，排序在最后统一进行）
  for (const post of posts) {
    const parts = directoryOf(post.slug)
    let children = root
    let path = ''
    for (const part of parts === '' ? [] : parts.split('/')) {
      path = path === '' ? part : `${path}/${part}`
      let folder = folders.get(path)
      if (!folder) {
        folder = { type: 'folder', path, name: part, children: [] }
        folders.set(path, folder)
        children.push(folder)
      }
      children = folder.children
    }
    children.push({ type: 'post', post })
  }

  // 同层排序（递归）：文件夹字母序在前、文章日期倒序在后
  const sortLevel = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type === 'folder' && b.type === 'folder') {
        return a.name < b.name ? -1 : a.name > b.name ? 1 : 0
      }
      if (a.type === 'post' && b.type === 'post') {
        return a.post.date < b.post.date ? 1 : a.post.date > b.post.date ? -1 : 0
      }
      return a.type === 'folder' ? -1 : 1
    })
    for (const node of nodes) {
      if (node.type === 'folder') sortLevel(node.children)
    }
  }
  sortLevel(root)

  // 应用目录配置（递归同层规则）：showSubdirs: false → 该层只保留文章、隐藏
  // 子文件夹抽屉；隐藏后变空的文件夹一并剪除（避免空抽屉）。配置仅影响该层
  // 树形态——被隐藏子目录的文章不从这里删除（清单是唯一来源，树只是派生）。
  // 根层以 '' 为路径（content/posts/config.ts 配置根层形态）。
  const applyConfigs = (nodes: TreeNode[], layerPath: string): TreeNode[] => {
    const kept: TreeNode[] = []
    const hideSubdirs = configs[layerPath]?.showSubdirs === false
    for (const node of nodes) {
      if (node.type === 'folder') {
        if (hideSubdirs) continue // 该层隐藏子文件夹抽屉
        node.children = applyConfigs(node.children, node.path)
        if (node.children.length === 0) continue // 剪除空文件夹
      }
      kept.push(node)
    }
    return kept
  }

  return applyConfigs(root, '')
}

/**
 * slug → 其所在分支的全部祖先文件夹路径（含根到所在的每一层，按深度序）。
 * 根层文章返回空数组（无文件夹可展开）；pi-agent/01 → ['pi-agent']；
 * a/b/c/post → ['a', 'a/b', 'a/b/c']。组件以此在挂载/导航时
 * 「自动展开至当前文章所在层」。
 */
export function ancestorPaths(slug: string): string[] {
  const parts = slug.split('/')
  parts.pop() // 去掉最后一段（文章 slug 自身）
  const paths: string[] = []
  let path = ''
  for (const part of parts) {
    path = path === '' ? part : `${path}/${part}`
    paths.push(path)
  }
  return paths
}
