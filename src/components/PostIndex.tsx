import PostTree from './PostTree.tsx'

/**
 * 文章页左栏文章索引（issue #29 + issue #44）：sticky 常驻完整层级树——
 * 根层文章 + 各级文件夹（可折叠抽屉），由内容清单平铺列表派生（同一来源，
 * 见 content/tree.ts）；当前文章所在分支自动展开至所在层，当前文章加粗 +
 * 下划线高亮（NavLink 自动注入 aria-current="page"）。
 * 桌面侧栏与移动端覆盖式抽屉复用同一组件（PostDrawerNav 的「文章」抽屉内容
 * 即本组件，行为与桌面一致）；<768px 由 CSS 隐藏（抽屉交互见 issue #31），
 * 仅渲染于文章页。首页列表保持平铺形态（PostRow，不受影响）。
 */
export default function PostIndex() {
  return (
    <nav aria-label="文章索引" className="post-index">
      <PostTree />
    </nav>
  )
}
