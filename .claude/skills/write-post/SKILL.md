---
name: write-post
description: 在任意文档站点生成器项目中撰写、规划和润色 Markdown 文章，并自动写入正确的内容目录。当用户说"写一篇文章"、"帮我写博客"、"起草一篇关于 X 的文章"、"给我一个文章大纲"、"扩展这段内容"、"润色这篇文章"、"新建一篇博文"，或提供一个话题让你写成文章时，务必使用此 skill。
---

# write-post

这个 skill 帮你在博客 / 文档站点中撰写技术文章，支持任意文档站点生成器。

## 第一步：探测项目约定

在动笔之前，先读取项目配置，确定以下三件事：

1. **内容目录**（文章放在哪里）
2. **Frontmatter 结构**（必填字段、可选字段、格式）
3. **文件命名规则**（slug 格式、扩展名）

### 探测顺序

按以下顺序查找项目配置，**找到即止**：

| 优先级 | 文件 / 特征 | 生成器 | 默认内容目录 |
|--------|-------------|--------|--------------|
| 1 | `blog.config.ts` / `blog.config.js` | 自定义博客框架 | 读取配置中的 `postsDir` 或 `contentDir` 字段 |
| 2 | `astro.config.*` + `src/content/` | Astro | `src/content/blog/` 或 `src/content/posts/` |
| 3 | `next.config.*` + `posts/` 或 `content/` | Next.js (MDX/静态) | `posts/` 或 `content/` |
| 4 | `vitepress` 字段 / `.vitepress/config.*` | VitePress | `docs/` 或 `guide/` |
| 5 | `docusaurus.config.*` | Docusaurus | `docs/` 或 `blog/` |
| 6 | `hugo.toml` / `hugo.yaml` / `config.toml` | Hugo | `content/posts/` |
| 7 | `_config.yml` / `_config.toml` | Jekyll | `_posts/` |
| 8 | `mkdocs.yml` | MkDocs | `docs/` |
| 9 | `nuxt.config.*` + `@nuxt/content` | Nuxt Content | `content/` |
| 10 | 根目录存在 `posts/` 目录 | 未知 | `posts/` |
| 11 | 根目录存在 `content/` 目录 | 未知 | `content/` |
| 12 | 兜底 | 未知 | `posts/`（并提示用户确认） |

**探测方式：**
- 用 `ls` 或 `find` 检查项目根目录的配置文件是否存在
- 读取配置文件提取内容目录路径
- 查看已有文章的 frontmatter 作为格式参考（`ls <内容目录>` → 读取 1–2 篇已有文章）

### 从已有文章推断 Frontmatter

读取 1–2 篇已有文章后，提取其 frontmatter 字段作为模板，例如：

```yaml
# 示例：从已有文章中观察到的结构
---
title: ...
date: ...        # 或 pubDate / publishDate / created
tags: [...]      # 或 categories / topics
description: ... # 或 summary / excerpt
draft: false     # 若存在则保留
---
```

如果项目中没有已有文章，则使用以下最小化通用 frontmatter：

```yaml
---
title: 文章标题
date: YYYY-MM-DD
tags:
  - 标签
---
```

---

## 写作风格指南

风格根据文章主题灵活切换：

- **技术教程型**（如"如何实现 X"）：步骤清晰，配代码示例，实操性强，语言简练直接
- **深度分析型**（如"为什么选择 X"、"X vs Y"）：有自己的观点，讲清楚背后的原因，可以有对比表格
- **随笔/思考型**（如经验总结、感悟）：语气自然随意，不需要严格结构，第一人称

**通用原则：**
- 中文为主，技术术语保留英文（如 useState、Promise、TypeScript）
- 开篇直接切入主题，不要废话铺垫
- 代码示例用三反引号 + 语言标识（` ```typescript `）
- 标题层级不超过三级（#、##、###）
- 结尾可以有总结，但不必强制

---

## 工作流程

### 模式 1：起草完整文章

收到话题或简单描述后：

1. 探测项目约定（内容目录 + frontmatter 结构）
2. 根据话题判断合适的写作风格
3. 选取合适的 tags（2–4 个）
4. 生成完整文章（含 frontmatter）
5. 询问用户是否写入文件（或用户一开始就要求写入时直接写）

### 模式 2：文章大纲规划

如果用户想先规划结构：列出各节标题 + 每节一句话说明要点，等用户确认后再展开写。

### 模式 3：扩展 / 润色现有内容

用户提供草稿片段时：
- **扩展**：补充细节、添加代码示例、丰富说明
- **润色**：保持原意，改善表达流畅性和逻辑性，不要过度改写

---

## 写入文件

写入路径：`<探测到的内容目录>/<slug>.md`（或 `.mdx`，根据项目已有文件扩展名决定）

slug 从标题推导：中文标题转为英文描述性短语，英文标题直接转 kebab-case。

如果探测到的内容目录不确定（走了兜底逻辑），写入前先告知用户探测结果并请求确认。

---

## 日期

使用今天的实际日期作为 frontmatter 中的 date（格式 YYYY-MM-DD）。
