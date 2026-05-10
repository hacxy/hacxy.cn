---
title: 导航栏
date: 2026-05-10
sort: 4
tags:
  - 博客
  - 教程
summary: 如何配置顶部导航栏的链接。
---

# 导航栏

顶部导航栏的链接通过 `blog.config.ts` 的 `nav` 字段配置：

```typescript
export default defineBlogConfig({
  // ...
  nav: [
    { text: "Blog", link: "/posts" },
    { text: "Tags", link: "/tags" },
    { text: "About", link: "/about" },
  ],
});
```

每一项需要两个字段：

- **text** — 显示的文字
- **link** — 点击后跳转的路径

想加几个加几个，想改顺序改顺序。不配置 `nav` 的话导航栏就只有 logo、GitHub 链接和主题切换按钮。

## 自动集成

除了 `nav` 配置的链接，导航栏还会自动展示：

- **GitHub 图标** — 如果配置了 `github` 字段，会在导航栏右侧显示一个 GitHub 图标链接
- **主题切换** — 亮色 / 暗色模式切换按钮，始终存在
