---
title: AI Skills：让 Claude Code 拥有专属技能
date: 2026-05-06
tags:
  - AI
  - 工具链
  - 工程化
  - 经验总结
---

# AI Skills：让 Claude Code 拥有专属技能

用 Claude Code 久了，你会发现有些任务反复出现：每次提交代码都要说"帮我生成 Conventional Commits 格式的提交信息"，每次写博客都要解释一遍文章要存在哪个目录、用什么 frontmatter 格式……

Skills 就是解决这个问题的。

## 什么是 Skills

Skills（技能）是 Claude Code 的可复用工作流单元。本质上是一段 Markdown 文件，描述了某类任务的上下文、约定和执行步骤。用户通过 `/skill-name` 斜杠命令触发，Claude 读取对应的 skill 文件后，带着完整的上下文开始工作。

一个 skill 文件的结构大致长这样：

```markdown
# commit

帮助用户生成符合 Conventional Commits 规范的提交信息。

## 规则

- 使用 feat/fix/chore/docs 等前缀
- subject 不超过 72 个字符
- 可选 body 说明变更原因

## 工作流程

1. 读取 git diff --staged 获取变更
2. 分析变更类型和影响范围
3. 生成提交信息并执行 git commit
```

触发方式：在 Claude Code 中输入 `/commit`，或者带参数：`/commit fix auth bug`。

## Skills 和普通提示词有什么区别

普通提示词是一次性的，每次对话都要重新描述需求。Skills 有几个关键优势：

**上下文持久化。** Skill 文件存在项目的 `.claude/skills/` 目录里，和代码一起被 git 管理。团队里每个人打开这个项目，都能用相同的 skills，不需要口口相传"每次要这样告诉 Claude"。

**触发描述驱动。** 每个 skill 都有一段触发描述，告诉 Claude 什么情况下应该主动使用它。比如 `fe-i18n` skill 的描述里写明了"当用户提到国际化、多语言、i18n……务必使用此 skill"，Claude 看到相关关键词就会自动调用，不需要用户手动输入斜杠命令。

**可组合。** Skill 可以调用其他工具，也可以配合项目的 CLAUDE.md 一起工作，形成完整的上下文体系。

## 几个典型的 Skills 场景

### 代码提交

最常见的用途。`/commit` skill 自动读取暂存区变更、分析改动、生成符合规范的提交信息，一步完成。支持 `--lang=en` 这样的参数指定提交信息语言。

### 前端国际化

`/fe-i18n` skill 封装了前端 i18n 集成的完整流程：检测项目框架（React/Vue/Next.js/Nuxt）、选择合适的 i18n 库、安装依赖、改造现有组件，从零到可用只需一条命令。

### 博客写作

这篇文章就是通过 `/write-post` skill 生成的。skill 里定义了博客的目录结构、frontmatter 格式、标签体系和写作风格，Claude 拿到话题后直接按这套规范输出，不需要每次都重新交代。

### 项目文档

`/init` skill 分析当前代码库，自动生成 CLAUDE.md——一份给 Claude 看的项目说明书，包含架构概览、开发约定、常用命令等。这份文档会在后续所有对话中作为背景知识被加载。

## Skill 的文件结构

Skills 存放在 `.claude/skills/<skill-name>/` 目录下，核心是 `skill.md` 文件：

```
.claude/
└── skills/
    ├── commit/
    │   └── skill.md
    ├── write-post/
    │   └── skill.md
    └── fe-i18n/
        └── skill.md
```

Skill 文件里可以包含：

- **触发描述**：告诉 Claude 什么情况下用这个 skill
- **项目约定**：文件结构、格式规范、命名规则
- **工作流程**：分步骤的执行逻辑
- **示例**：输入输出样例，帮助 Claude 理解预期

## 怎么创建自己的 Skill

最直接的方式是用 `/create-skill` skill（套娃了）：告诉它你想实现什么功能，它会帮你生成 skill 文件并放到正确位置。

也可以手动创建，在 `.claude/skills/your-skill-name/skill.md` 写下：

```markdown
# your-skill-name

[触发描述：什么情况下使用这个 skill]

## 上下文

[项目相关的背景信息、约定、规范]

## 工作流程

[分步骤说明怎么执行]
```

写好之后，在 `settings.json` 里注册这个 skill，Claude Code 重启后就能用了。

一个写得好的 skill，核心在于**上下文要具体**。"帮我写测试"是一个很差的 skill 描述，而"为 src/api/ 下的模块生成 Jest 单元测试，使用 msw mock HTTP 请求，测试文件放在同目录的 `__tests__/` 下"才是真正有用的。

## 和 Memory 系统的配合

Claude Code 还有一套 Memory 系统，用来记住用户偏好、项目背景、历史决策。Skills 和 Memory 的分工是：

- **Memory**：记住"这个用户喜欢简洁的代码风格"、"这个项目用 pnpm"这类持久偏好
- **Skills**：封装"提交代码"、"写博客文章"这类可重复执行的工作流

两者配合，Claude Code 既能记住你的偏好，又能高效执行标准化任务。

## 小结

Skills 的本质是**把隐性的工作流知识变成显性的、可共享的、可版本管理的文件**。当你发现自己第三次向 Claude 解释同一件事的时候，那就是把它写成 skill 的时机。
