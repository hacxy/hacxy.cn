# hacxy.cn 博客 MVP PRD

## 问题陈述

hacxy.cn 目前只是一个脚手架 demo，没有真实内容。我准备从零重建个人博客：以技术文章为主要内容，写给同行与未来的自己，希望被搜索引擎收录、被 RSS 订阅，且不会因为技术债在后续扩展功能时被卡住。

同时我希望博客有一种明确的个人气质——极客、简约，参照 antfu.me 的视觉风格，而不是又一个套着模板的博客。

## 解决方案

一个纯 React + TypeScript + Vite 构建的**构建时预渲染静态站**：

- 用 Markdown 文件写文章（放在仓库里，git 管理），frontmatter 声明元数据，提交即发布
- 构建时把每篇文章渲染为静态 HTML（含代码高亮），`/posts/:slug` 永久链接，内容直接进 HTML，爬虫无需执行 JS
- 首页是"名字 + 一句话定位 + 文章列表"的极客风单列布局；导航只有"文章 | 关于"，配暗色模式、RSS、紫色强调色、等宽字体点缀
- 构建产物是纯静态文件，可托管到任意静态服务器

## 用户故事

**作为作者：**

1. 作为作者，我想要把 Markdown 文件放进仓库并提交，以便我的文章自动发布
2. 作为作者，我想要通过 frontmatter 声明 `title / date / description / tags`，以便文章自动获得标题、日期、摘要和标签
3. 作为作者，我想要把某篇文章标记为 `draft: true`，以便它在本地可见但不会被发布
4. 作为作者，我想要文章按日期倒序自动出现在首页列表，以便读者先看到最新内容
5. 作为作者，我想要每篇文章自动获得 `/posts/:slug` 永久链接，以便链接可长期引用
6. 作为作者，我想要代码块在构建时完成语法高亮，以便读者无需加载额外 JS 就能看到高亮代码
7. 作为作者，我想要长文章自动生成目录（TOC），以便读者可以跳转到任意章节
8. 作为作者，我想要更新文章时通过 `updated` 字段标记修订，以便读者知道内容是否过时
9. 作为作者，我想要把图片放在文章同目录的 `assets/` 中，以便文章自包含、搬家不散架
10. 作为作者，我想要一个"关于"页承载简介、社交链接与联系方式，以便读者了解我是谁
11. 作为作者，我想要站点以极客风呈现（灰阶 + 紫色强调 + 等宽字体点缀），以便博客有明确的个人气质

**作为读者：**

12. 作为读者，我想要在首页看到文章列表（标题 + 日期 + 摘要），以便快速决定读哪篇
13. 作为读者，我想要点击文章进入阅读页，以便获得舒适的排版体验
14. 作为读者，我想要在亮色/暗色之间切换并让偏好被记住，以便深夜阅读不刺眼
15. 作为读者，我想要在移动端获得同样的体验，以便随时阅读
16. 作为读者，我想要通过"文章 | 关于"导航快速定位，以便不被多余入口干扰
17. 作为读者，我想要直接通过分享链接或搜索结果打开单篇文章，以便无需经过首页
18. 作为读者，我想要从文章页返回列表或切换阅读其他文章，以便浏览连贯

**作为搜索引擎：**

19. 作为搜索引擎，我想要不执行 JS 就能读到文章全文，以便内容被索引
20. 作为搜索引擎，我想要 `sitemap.xml` 列出全部页面，以便发现所有 URL
21. 作为搜索引擎，我想要 `robots.txt` 可访问，以便了解抓取规则
22. 作为搜索引擎，我想要每页有正确的 OG/meta 与 canonical，以便分享与去重
23. 作为搜索引擎，我想要文章页带 JSON-LD Article 结构化数据，以便获得富媒体摘要

**作为 RSS 订阅者：**

24. 作为订阅者，我想要通过 RSS 订阅站点，以便在不访问网站时也能读到文章
25. 作为订阅者，我想要 RSS 条目包含正确的标题、日期与链接，以便阅读器正确展示

## 实现决策

### 架构

- **纯 React 19 + TypeScript + Vite 8 + Tailwind CSS 4**，不引入任何页面框架（不引 Astro / VitePress / Next.js）；库可用
- **构建时预渲染**：使用 vite-ssg，构建时对每个路由执行 `renderToString` 产出静态 HTML，浏览器端水合
- **路由**：React Router v7（最新版）
- **渲染策略（关键）**：Markdown 在**构建期一次性渲染为 HTML 字符串**（含 Shiki 高亮与标题锚点），客户端通过 `dangerouslySetInnerHTML` 挂载。同一 HTML 字符串在服务端与客户端完全一致，从根上避免 hydration mismatch，客户端 JS 保持轻量。react-markdown/remark 管线仅存在于构建期
- **内容清单（content manifest）**：构建期聚合全部非 draft 文章，生成类型化清单供页面渲染与客户端导航共享

### 内容契约（数据 Schema）

```ts
interface TocItem {
  id: string // heading 锚点 id
  text: string // 标题文本
  level: 2 | 3 // 仅 h2/h3
}

interface Post {
  slug: string // 来自文件名（英文 slug）
  title: string // frontmatter.title
  date: string // YYYY-MM-DD（ISO）
  description: string
  tags: string[]
  draft: boolean // draft: true 时仅本地可见
  updated?: string // 可选，修订标记
  html: string // 构建期渲染完成的 HTML（含高亮与锚点）
  toc: TocItem[]
}
```

- 文章路径：`/posts/:slug`；文件名用英文 slug，中文标题进 frontmatter
- 图片资源：文章同目录 `assets/`，构建期复制进产物

### 模块

- **内容管线模块**：frontmatter 解析、Markdown → HTML 渲染、TOC 提取、文章聚合（draft 过滤 + date 倒序 + tag 索引）
- **页面模块**：首页（hero + 文章列表）、文章详情页（正文 + 目录 + 上一篇/下一篇）、关于页、404
- **布局模块**：导航（文章 | 关于，右侧 RSS/社交/暗色切换）、页脚（CC BY-NC-SA 4.0）
- **构建产物模块**：`feed.xml`、`sitemap.xml`、`robots.txt`、每页 OG/meta/canonical、JSON-LD、防闪烁脚本

### 设计

- 基调：极客风，参照 antfu.me——单列居中内容流，灰阶主色 + 紫色强调色（链接/当前导航），克制装饰
- 字体：正文 = 系统无衬线栈（PingFang SC / Microsoft YaHei / Noto Sans SC）；代码与元数据（站点名/日期） = JetBrains Mono（自托管 woff2）
- 代码高亮：Shiki，`github-light` / `github-dark` 双主题跟随暗色模式
- 暗色模式：跟随系统 + 手动切换，inline 防闪烁脚本（localStorage + `prefers-color-scheme`），Tailwind `dark:` variant
- 首页：名字 + 一句话定位 + 最近文章列表；列表项 = 标题 + 日期 + 摘要（不显示阅读时长）
- OG 图：可复用的极客风模板（紫底 + 等宽字体 + 文章标题），构建期生成

### 其他

- RSS 生成文章全文；sitemap 列出 `/posts/*` 与 `/about`
- frontmatter 解析使用 gray-matter（库，非框架），避免自造 YAML 解析器
- `pnpm build` 产出纯静态目录，可被任意静态服务器托管

## 测试决策

- **好测试的定义**：只测外部行为与契约，不测实现细节。单测围绕"输入 Markdown 源文本 → 输出 Post"的纯函数契约；E2E 只验证用户可见行为与 SEO 关键产物
- **主接缝（单测）**：内容管线纯函数
  - `parseMarkdown(raw, slug)`：frontmatter 缺字段/非法日期/空值的默认值行为、代码块是否产出 Shiki 高亮 HTML、TOC 是否正确提取（仅 h2/h3、含锚点 id）、标题锚点 id 生成
  - `loadPosts(sources)`：draft 过滤、date 倒序排序、tag 索引、空文章集合边界
- **辅接缝（E2E）**：构建产物验证。修改 Playwright 的 webServer 从 `pnpm dev` 改为 `pnpm preview`（构建产物），验证：
  - 首页渲染文章列表；文章页渲染正文且含代码高亮结构
  - 直达 `/posts/:slug` 返回 200，且 **HTML 源码中包含正文文本**（预渲染成立、SEO 成立的核心验收）
  - 暗色切换可用且刷新后偏好保持；`/about` 可达
  - `/feed.xml`、`/sitemap.xml` 存在且结构正确
- **React 组件不做单独单测**：页面是内容数据层的薄渲染层，由 E2E 覆盖
- **先例**：现有 `tests/unit`（vitest + testing-library + jsdom）与 `tests/e2e`（Playwright）沿用，仅修改 E2E 的 webServer 命令

## 范围之外

- 评论系统、站内搜索、访问统计、友链、图片相册/照片页
- 标签归档页 UI（tags 数据已保留，页面后置）
- 多语言（i18n）
- 部署配置、CI/CD、备案（部署目标为自有服务器，静态产物，不涉及）
- CMS / 可视化后台 / 在线编辑
- 性能优化专项（如图片懒加载、字体子集化，视 MVP 验收情况后议）

## 补充说明

- 风格以 antfu.me 为参照：其实现为 VitePress，本 PRD 用纯 React 复刻其**视觉气质**（灰阶、单列、mono 点缀、暗色），而非抄其技术栈
- 草稿工作流：`draft: true` 的文章仅本地构建可见，不进入内容清单、RSS 与 sitemap
- MVP 验收标准：用一篇真实技术文章跑通"写作 → 构建 → 预览 → 上线"全流程，且 E2E 通过
- 演进路径预留：tags 数据已入库 → 后续加归档页仅需 UI；内容清单已集中 → 后续加搜索只需在此层扩展
