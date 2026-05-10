---
title: 侧边栏
date: 2026-05-10
sort: 5
tags:
  - 博客
  - 教程
summary: 侧边栏如何自动生成，以及如何自定义目录标题、排序和排除项。
---

# 侧边栏

侧边栏会根据你的目录结构自动生成，不需要任何配置。

## 基本规则

- 目录变成分组标题
- 文件变成可点击的文章链接
- 当前正在阅读的文章会高亮
- 支持任意层级的嵌套目录

比如这样的文件结构：

```
claude/
  skills-guide.md
  memory-guide.md
notes/
  typescript/
    generics.md
    utility-types.md
  react-tips.md
hello.md
```

侧边栏会展示为：

```
claude
  ├── AI Skills 指南
  └── Claude Code Memory 指南
notes
  ├── typescript
  │   ├── 泛型详解
  │   └── 工具类型
  └── React 小技巧
Hello
```

## 自定义目录信息

默认情况下，侧边栏的分组标题就是文件夹名。如果想自定义，在目录下创建一个 `index.md`：

```yaml
---
title: Claude 系列
sort: 1
---
```

- **title** — 替换文件夹名作为分组标题，比如把 `claude` 显示为「Claude 系列」
- **sort** — 控制这个目录在同级中的排列位置，越小越靠前

这个 `index.md` 不会作为文章展示，它只是目录的配置文件。

## 排除文件或子目录

有些文件不想出现在侧边栏里？在目录的 `index.md` 中用 `exclude` 排除：

```yaml
---
title: Claude 系列
exclude:
  - draft.md
  - private
---
```

`exclude` 支持文件名（如 `draft.md`）和目录名（如 `private`），按名称精确匹配。

## 什么时候显示侧边栏

侧边栏不是所有页面都会出现。只有当你正在阅读的文章存在于侧边栏的链接列表中时，侧边栏才会展示。

比如你在根目录放了一个独立的 `about-me.md`，它出现在侧边栏里，访问时就有侧边栏。如果某篇文章因为 `exclude` 被排除了，访问它时就不会显示侧边栏。

## 响应式

在小于 960px 的屏幕上，侧边栏会自动隐藏。
