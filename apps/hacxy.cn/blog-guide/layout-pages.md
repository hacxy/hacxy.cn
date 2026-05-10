---
title: 布局页面
date: 2026-05-10
sort: 3
tags:
  - 博客
  - 教程
summary: 如何通过 layout 字段创建首页、文章列表和标签页。
---

# 布局页面

除了普通文章，博客还需要首页、文章列表页、标签页这些特殊页面。通过在 frontmatter 里设置 `layout` 字段来创建它们。

## 三种布局

### 首页

```yaml
---
layout: home
name: Hacxy
bio: 了解真相，才能获得真正的自由
---
```

首页会展示你的名字、简介、最近文章列表和 GitHub 项目。`name` 和 `bio` 不写的话会回退到 `blog.config.ts` 里的 `author` 和 `bio`。

### 文章列表页

```yaml
---
layout: posts
---
```

展示所有文章，按年份分组。

### 标签页

```yaml
---
layout: tags
---
```

展示所有标签及其文章数量，点击标签可以筛选文章。

## 文件名随意

布局页面的文件名没有限制，框架只认 `layout` 字段。你可以叫 `index.md`、`blog-list.md`、`my-tags.md`，都行。

## 区分规则

有 `layout` 字段的 → 布局页面，不会出现在文章列表和侧边栏里。

没有 `layout` 字段的 → 普通文章。
