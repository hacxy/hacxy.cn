---
name: github-weekly
description: >
  获取本周 GitHub 热门项目并生成周刊文章，写入博客的 content/github-weekly/ 目录。
  当用户说"生成本周 GitHub 周刊"、"写一期 GitHub 热门项目"、"github weekly"、"更新 GitHub 周刊"、
  "本周有什么热门开源项目"、"生成 GitHub trending 文章"时使用此 skill。
  也适用于用户提到 GitHub 趋势、热门仓库、开源周刊等相关话题并希望生成文章的场景。
---

# GitHub 热门项目周刊生成器

为博客 `content/github-weekly/` 系列自动生成每周一期的 GitHub 热门项目文章。

## 工作流程

### 第一步：获取数据

运行数据抓取脚本，它会通过 GitHub Search API 获取两类项目：

```bash
TMPDIR=$(mktemp -d)
bash <skill-path>/scripts/fetch-trending.sh "$TMPDIR"
```

脚本产出三个文件：
- `new-stars.json` — 本周新创建且 star 数最高的项目（最多 10 个）
- `rising-stars.json` — 本周活跃的高 star 项目（最多 10 个）
- `meta.json` — 包含年份、周数、日期范围

### 第二步：确定文件名和期数

读取 `meta.json` 获取 `year` 和 `week` 字段，检查 `content/github-weekly/` 目录下已有的文章来确定期数：

```bash
ls content/github-weekly/*.md | grep -v index.md | sort
```

文件命名规则：`YYYY-wWW.md`，例如 `2026-w20.md`。

期数从已有文章数量 +1 推算，如果是第一期就是 `第 1 期`。

### 第三步：为每个项目撰写中文介绍

对 `new-stars.json` 和 `rising-stars.json` 中的每个项目：

1. 用 WebFetch 访问项目的 GitHub 页面（`url` 字段），阅读 README 了解项目详情
2. 基于 README 内容用中文撰写 2-4 句话的项目介绍，重点说明：
   - 这个项目解决什么问题
   - 核心特性或亮点
   - 适合什么场景使用
3. 项目名称和技术术语保留英文

介绍应当有自己的理解和判断，不要机械翻译 README 的第一段。让读者快速理解这个项目为什么值得关注。

去重：如果某个项目同时出现在两个列表中，只在"本周新星"中展示，从"本周飙升"中移除。

### 第四步：生成文章

使用以下模板生成 Markdown 文章：

```markdown
---
title: "GitHub 热门项目周刊 第 N 期"
date: YYYY-MM-DD
tags:
  - GitHub
  - 开源
  - 周刊
sort: N
summary: 本周 GitHub 热门开源项目精选，包含 X 个本周新星项目和 Y 个持续飙升项目。
---

# GitHub 热门项目周刊 第 N 期

> {icon:lucide:calendar} YYYY-MM-DD ~ YYYY-MM-DD | [GitHub Trending](https://github.com/trending)

## 本周新星

本周新创建并获得大量关注的项目。

### 1. [项目名](GitHub URL)

{{中文介绍}}

- {icon:lucide:star} Star 数 | {icon:lucide:code} 主要语言 | {icon:lucide:git-fork} Fork 数

---

...(其余项目)

## 本周飙升

已有一定基础、本周热度持续攀升的项目。

### 1. [项目名](GitHub URL)

{{中文介绍}}

- {icon:lucide:star} Star 数 | {icon:lucide:code} 主要语言 | {icon:lucide:git-fork} Fork 数

---

...(其余项目)
```

注意事项：
- 文章中所有图标使用 `{icon:prefix:name}` iconify 语法，不要使用 emoji。例如用 `{icon:lucide:star}` 替代 ⭐，用 `{icon:lucide:calendar}` 替代 📅
- `date` 使用当天日期
- `sort` 字段用期数（第 1 期 sort: 1，第 2 期 sort: 2，以此类推），这样侧边栏按期数正序排列
- star 数超过 1000 用 `1.2k` 格式简写
- 每个项目之间用 `---` 分隔
- 如果某个分类获取到的项目少于 3 个，可以降低筛选门槛重试（降低 stars 阈值）

### 第五步：写入文件

将文章写入 `content/github-weekly/YYYY-wWW.md`。

写入后清理临时文件：
```bash
rm -rf "$TMPDIR"
```

### 第六步：确认

告知用户文章已生成，列出：
- 文件路径
- 期数
- 收录的项目总数
- 两个分类各有多少项目
