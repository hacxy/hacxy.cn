import PostTree from './PostTree.tsx'

/**
 * 文章页左栏文章索引：sticky 常驻完整层级树（根层文章 + 各级可折叠文件夹，
 * 由内容清单派生，见 content/tree.ts）。桌面侧栏与移动端「文章」抽屉复用
 * 同一组件；<768px 由 CSS 隐藏；仅渲染于文章页。
 */
export default function PostIndex() {
  return (
    <nav aria-label="文章索引" className="post-index">
      <PostTree />
    </nav>
  )
}
