# 计划：hacxy.cn 博客 MVP

> 来源 PRD：`prd/hacxy-blog-mvp.md`

## 架构决策

适用于所有阶段的持久性决策：

- **路由**：`/`（首页）· `/posts/:slug`（文章详情）· `/about` · 404 兜底
- **数据模型**：`Post`（slug / title / date / description / tags / draft / updated? / html / toc）+ `TocItem`（id / text / level，仅 h2/h3）；构建期生成内容清单，页面与客户端导航共享
- **渲染策略**：Markdown 在构建期一次性渲染为 HTML 字符串（含 Shiki 高亮与标题锚点），客户端 `dangerouslySetInnerHTML` 挂载，杜绝 hydration mismatch
- **构建**：vite-ssg 构建时预渲染 + React Router v7 + Tailwind 4；`pnpm build` 产出纯静态目录
- **测试接缝**：主接缝 = 内容管线纯函数（frontmatter 解析 → HTML 渲染 → 聚合），单测；辅接缝 = Playwright E2E 跑 `pnpm preview`（构建产物）
- **内容约定**：文件名为英文 slug，中文标题进 frontmatter；图片放文章同目录 `assets/`；draft 文章 dev 可见、不进入清单/RSS/sitemap

---

## 阶段 1：骨架 + 第一束光

**用户故事**：1, 4, 12, 16

### 构建内容

清理脚手架 demo，建立 React + TS + Vite + Tailwind 骨架与路由结构（首页 / 关于占位 / 404 兜底）。定义 `Post` 数据模型与内容管线的最小闭环：解析 frontmatter 的 title/date、渲染基础 HTML、聚合一篇文章。首页以"名字 + 一句话定位 + 文章列表"的极简布局渲染出第一篇文章（标题 + 日期），导航雏形为"文章 | 关于"。

### 验收标准

- [ ] `pnpm dev` 打开首页，能看到站点名与一篇 fixture 文章的标题 + 日期
- [ ] 导航含"文章 | 关于"，点击可切换；未知路径显示 404
- [ ] 单测：管线对 frontmatter 缺失字段、非法日期有确定的默认行为；聚合按日期倒序
- [ ] `pnpm typecheck` 与 `pnpm lint` 通过

---

## 阶段 2：预渲染接入 + E2E 基础设施

**用户故事**：17, 19

### 构建内容

接入 vite-ssg，让现有路由在构建期静态化。把 E2E 从 dev server 切换到构建产物（preview server），并建立"HTML 源码直接包含正文"的断言模式——这是 SEO 成立的地基。

### 验收标准

- [ ] `pnpm build` 产出静态目录，`pnpm preview` 访问正常
- [ ] 不执行 JS 抓取首页 HTML，源码中包含文章标题
- [ ] Playwright E2E 跑在 preview server 上且通过

---

## 阶段 3：文章详情页 + 写作工作流完整

**用户故事**：2, 3, 5, 6, 7, 8, 9, 13, 17, 18

### 构建内容

`/posts/:slug` 详情路由 + 完整 Markdown 渲染（GFM 表格/任务列表、Shiki `github-light`/`github-dark` 双主题代码高亮、标题锚点）+ TOC 提取与目录 UI + 上一篇/下一篇导航。写作工作流补全：frontmatter 全字段（description / tags / updated）、draft 过滤（dev 可见、构建与清单排除）、文章同目录 `assets/` 图片的复制与引用。用一篇含代码、表格、图片的真实技术文章跑通全程。

### 验收标准

- [ ] 直达 `/posts/:slug` 返回 200，HTML 源码含正文文本与代码高亮结构
- [ ] 文章页显示目录，锚点可跳转；上一篇/下一篇导航可用
- [ ] draft 文章 dev 可见、构建产物（列表与内容清单）不含
- [ ] 文章内 `assets/` 图片在产物中正确输出并可访问
- [ ] 单测覆盖：代码高亮与 TOC 契约、draft 过滤、字段边界
- [ ] 一篇真实技术文章（含代码/表格/图片）全流程跑通

---

## 阶段 4：设计系统落地（极客风）

**用户故事**：10, 11, 14, 15

### 构建内容

系统无衬线字体栈 + JetBrains Mono 自托管（用于站点名、日期、元数据与代码）；灰阶主色 + 紫色强调色（链接与当前导航）；暗色模式（inline 防闪烁脚本、跟随系统 + 手动切换、偏好记忆）；单列居中布局打磨、导航与 CC BY-NC-SA 4.0 页脚；关于页内容完成（简介 + 社交链接 + 联系方式）；移动端适配。

### 验收标准

- [ ] 暗色/亮色切换生效，刷新后偏好保持，首帧无闪烁
- [ ] 紫色强调色作用于链接与导航；等宽字体用于元数据与代码
- [ ] 关于页展示简介、社交链接、联系方式
- [ ] 移动端视口下布局正常（E2E 响应式断言）
- [ ] E2E 暗色切换用例通过

---

## 阶段 5：可发现性（SEO + RSS + OG）

**用户故事**：20, 21, 22, 23, 24, 25

### 构建内容

每页 OG/meta 与 canonical；文章页 JSON-LD Article 结构化数据；构建期生成 `sitemap.xml`（`/posts/*` 与 `/about`）与 `robots.txt`；`feed.xml`（文章全文 + 正确标题/日期/链接）；极客风 OG 图模板（紫底 + 等宽字体 + 文章标题）。

### 验收标准

- [ ] E2E：`sitemap.xml` / `robots.txt` / `feed.xml` 存在且结构正确；draft 文章不在其中
- [ ] 每页 HTML 含正确的 OG/meta/canonical；文章页含 JSON-LD Article
- [ ] RSS 条目含全文与正确元数据
- [ ] 全量 E2E 通过，"写作 → 构建 → 预览"全流程验收完成
