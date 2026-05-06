---
title: 用 CSS Variables 实现深色模式
date: 2024-11-20
tags:
  - CSS
  - 前端
---

# 用 CSS Variables 实现深色模式

深色模式的实现方式有很多，本文介绍最简洁的 CSS Variables 方案。

## 核心思路

在 `:root` 定义浅色变量，在 `[data-theme="dark"]` 覆盖：

```css
:root {
  --bg: #ffffff;
  --fg: #000000;
}

[data-theme="dark"] {
  --bg: #050505;
  --fg: #ffffff;
}

body {
  background: var(--bg);
  color: var(--fg);
  transition: background-color 0.2s ease;
}
```

## JavaScript 切换

```typescript
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme')
  const next = current === 'dark' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', next)
  localStorage.setItem('theme', next)
}
```

## 初始化（避免闪烁）

在 `<head>` 中内联执行，防止页面加载时出现主题闪烁：

```html
<script>
  const theme = localStorage.getItem('theme') 
    || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  document.documentElement.setAttribute('data-theme', theme)
</script>
```
