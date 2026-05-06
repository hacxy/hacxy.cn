---
title: 用 Vite + React 搭建个人博客
date: 2025-02-15
tags:
  - React
  - Vite
  - 前端
---

# 用 Vite + React 搭建个人博客

本文介绍如何使用 Vite 8 + React 19 搭建一个极简风格的个人博客。

## 技术选型

| 用途 | 技术 |
|------|------|
| 构建工具 | Vite 8 |
| UI 框架 | React 19 |
| 路由 | React Router v7 |
| 动画 | Motion |
| Markdown | react-markdown |

## 项目结构

```bash
├── posts/          # Markdown 文章
├── src/
│   ├── components/ # 公共组件
│   ├── pages/      # 页面组件
│   ├── utils/      # 工具函数
│   └── styles/     # 全局样式
└── vite.config.ts
```

## Vite Glob 导入

Vite 8 支持通过 `import.meta.glob` 在构建时批量导入文件：

```typescript
const modules = import.meta.glob('/posts/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})
```

这样可以在不依赖服务端的情况下，将所有 Markdown 文章打包进应用。
