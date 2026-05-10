---
title: 快速开始
date: 2026-05-10
sort: 1
tags:
  - 博客
  - 教程
summary: 了解如何配置 @hacxy/blog，创建你的第一篇文章。
---

# 快速开始

## 站点配置

所有配置集中在 `blog.config.ts` 一个文件里：

```typescript
import { defineBlogConfig } from "@hacxy/blog";

export default defineBlogConfig({
  title: "My Blog",
  author: "Your Name",
  github: "your-github-username",
  bio: "一句话介绍自己",
  email: "you@example.com",
  copyright: "2024-PRESENT © Your Name",
});
```

这些信息会展示在首页和页脚。`github` 字段会自动在导航栏生成一个 GitHub 图标链接。

## 创建第一篇文章

在博客根目录下新建一个 `.md` 文件，比如 `hello-world.md`：

```yaml
---
title: Hello World
date: 2026-05-10
tags:
  - 随笔
---

# Hello World

这是我的第一篇文章。
```

启动开发服务器：

```bash
pnpm dev
```

打开浏览器访问 `/hello-world`，你的文章就出现了。

## 文章放在哪

文章可以放在根目录，也可以放在子目录里。文件路径决定了访问路由：

| 文件位置 | 访问路由 |
|----------|----------|
| `hello-world.md` | `/hello-world` |
| `claude/skills-guide.md` | `/claude/skills-guide` |
| `notes/2026/may.md` | `/notes/2026/may` |

想怎么组织目录都行，路由会自动跟着文件路径走。
