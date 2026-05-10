# Project Rules

## ESLint

- 禁止使用 `eslint-disable`、`eslint-disable-next-line`、`eslint-disable-line` 等注释来抑制 ESLint 规则。遇到 lint 报错时必须从代码层面修复问题，或在 `eslint.config.js` 中调整规则配置。

## 提交规范

- 项目使用 husky + lint-staged，`pre-commit` 钩子会对暂存的 `*.{ts,tsx}` 文件执行 `eslint --max-warnings=0`，warning 和 error 都会阻断提交。

---

# 博客框架功能文档

## 项目结构

```
apps/hacxy.cn/          # 博客内容目录（Vite root）
  blog.config.ts        # 博客配置文件
  index.md              # 首页（layout: home）
  blog-list.md          # 文章列表页（layout: posts）
  tag-list.md           # 标签页（layout: tags）
  *.md                  # 博客文章（无 layout 字段）
  <dir>/                # 文章子目录（自动成为侧边栏分组）
    index.md            # 目录元数据（title/sort/exclude）
    *.md                # 子目录下的文章
packages/blog/          # 博客框架库 @hacxy/blog
  src/
    plugin/index.ts     # Vite 插件（虚拟模块、sidebar 生成等）
    components/         # React 组件（Header/Sidebar/TOC 等）
    pages/              # 页面组件（Home/BlogList/BlogPost 等）
    styles/             # 全局样式和 CSS 变量
    utils/posts.ts      # 文章数据工具函数
  virtual.d.ts          # 虚拟模块类型声明
```

## 配置文件 (blog.config.ts)

使用 `defineBlogConfig` 定义配置：

```ts
import { defineBlogConfig } from "@hacxy/blog";

export default defineBlogConfig({
  title: "Blog Title",
  author: "Author",
  logo: "iconify-icon-name",       // 或 { src: "/logo.png", alt: "logo" }
  github: "username",
  bio: "个人简介",
  email: "email@example.com",
  bilibili: "https://...",
  copyright: "2024-PRESENT © Author",
  nav: [                            // 可配置导航栏
    { text: "Blog", link: "/posts" },
    { text: "Tags", link: "/tags" },
    { text: "About", link: "/about" },
  ],
  projects: ["repo1", "repo2"],     // GitHub 项目（自动获取 stars）
  techStack: [...],                 // 技术栈展示
  include: ["**/*.md"],             // 文章扫描范围
  exclude: ["**/drafts/**"],        // 排除规则
});
```

## 虚拟模块

| 模块 | 说明 |
|------|------|
| `virtual:blog-config` | 解析后的博客配置（含自动生成的 sidebar 数据） |
| `virtual:blog-posts` | 所有文章数据数组（slug/title/date/tags/rawContent） |
| `virtual:blog-pages` | 布局页面数据（按 layout 字段分组） |
| `virtual:github-projects` | GitHub 项目信息 |
| `virtual:blog-entry` | 应用入口 |

## 页面布局系统

通过 frontmatter 的 `layout` 字段区分页面类型，文件名任意：

- `layout: home` → 首页
- `layout: posts` → 文章列表页
- `layout: tags` → 标签页

无 `layout` 字段的 `.md` 文件视为博客文章。

## 文件路由

路由由文件路径决定：

- `apps/hacxy.cn/article.md` → `/article`
- `apps/hacxy.cn/claude/guide.md` → `/claude/guide`

## 文章 Frontmatter

```yaml
---
title: 文章标题          # 可选，回退到 H1 标题，再回退到文件名
date: 2026-05-10         # 可选，回退到 git 提交日期
tags:                    # 可选
  - Tag1
  - Tag2
summary: AI 摘要文本      # 可选，展示可交互的 AI 摘要组件
sort: 1                  # 可选，侧边栏排序（越小越靠前），缺省按 date 倒序
---
```

## 侧边栏

自动根据博客根目录结构递归生成，支持任意层级嵌套：

- **目录** → 分组节点（显示目录名或自定义标题）
- **文件** → 叶子节点（可点击链接，当前文章高亮）
- 排序：优先 `sort` 字段，缺省按 `date` 倒序
- 仅在当前文章存在于侧边栏时展示
- 移动端（≤960px）自动隐藏

### 目录元数据 (index.md)

在任意目录下创建 `index.md`，通过 frontmatter 自定义目录信息：

```yaml
---
title: Claude 系列       # 覆盖文件夹名作为侧边栏分组标题
sort: 1                  # 目录在父级中的排序位置
exclude:                 # 从侧边栏排除的文件或子目录
  - draft.md
  - private
---
```

`index.md` 不会作为文章展示，仅用于定义目录信息。

## 文章目录 (TOC)

文章页右侧自动展示目录，从 markdown 提取 h2-h4 标题：

- 滚动时自动高亮当前标题（IntersectionObserver）
- 点击平滑滚动跳转，自动补偿导航栏高度
- ≤1200px 屏幕自动隐藏

## 上一篇/下一篇

文章底部的上下篇导航按侧边栏顺序切换（非全局时间排序）。

## 导航栏

- 通过 `blog.config.ts` 的 `nav` 数组配置
- 支持 GitHub 图标链接（从 `github` 配置读取）
- 主题切换按钮（亮色/暗色）
- 动态测量高度并设置 CSS 变量 `--header-height`，供 TOC 跳转偏移和 sticky 定位使用

## 热更新

开发模式下以下变更会触发自动刷新：

- `.md` 文件增删改 → 刷新文章列表 + 侧边栏
- `blog.config.ts` 修改 → 刷新配置
- 根目录 `.md` 修改 → 刷新布局页面

## 构建命令

```bash
pnpm dev          # 启动开发服务器
pnpm build:lib    # 构建框架库
pnpm build        # 构建博客应用
pnpm lint         # 运行 ESLint
```
