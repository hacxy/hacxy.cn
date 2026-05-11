---
title: "第四章：Memory 与持久化上下文"
date: 2026-05-11
tags:
  - AI
  - ClaudeCode
  - 进阶
sort: 4
summary: Claude Code 的持久化机制包括 CLAUDE.md、Auto Memory 和 Skills 三层，它们分工不同、互相配合，让 Claude 在每次新对话里都能带着项目背景和用户偏好工作。
---

# 第四章：Memory 与持久化上下文

Claude Code 每次新对话都是从零开始的——没有记忆，不知道你上次说了什么，也不知道这个项目的背景。持久化上下文系统就是为了解决这个问题：把"需要一直记着的事情"固化下来，让每次对话都能带着正确的背景开始。

Claude Code 有三种主要的持久化机制，分工不同，配合使用效果最好。

## CLAUDE.md：你写给 Claude 的规则

CLAUDE.md 是你主动维护的规则文件，内容是"项目约定"和"行为要求"。上一章介绍过基础用法，这里补充一些进阶技巧。

### 保持简洁

CLAUDE.md 建议控制在 200 行以内。越长，Claude Code 遵守的准确率越低。把真正重要的约定写进去，不要把它当成全面的项目文档。

**好的 CLAUDE.md 内容：**
- 禁止做什么（"不允许用 `any`"、"不要自动 commit"）
- 项目特有的约定（"API 错误统一用 `AppError` 类"）
- 不显而易见的命令（"跑测试要用 `pnpm test:unit`，不是 `pnpm test`"）

**不适合放的内容：**
- 能从代码里直接看出来的架构
- 通用的编程最佳实践（Claude 本来就知道）
- 长篇的背景介绍

### 路径限定规则

CLAUDE.md 支持只在特定路径下生效的规则：

```markdown
# 全局规则
不要用 console.log，改用 logger

## src/api/
API 模块的错误必须返回标准的 { code, message } 格式

## src/components/
组件不允许直接调用 API，必须通过 store 或 hook
```

子目录也可以有自己的 CLAUDE.md，只在该目录下的对话中生效，适合 monorepo 项目的局部约定。

## Auto Memory：Claude 主动记住的事

Auto Memory 是 Claude Code 的自动记忆系统。当你和 Claude Code 协作时，它会主动把值得记住的信息写入 `.claude/projects/<id>/memory/` 目录里，下次对话时自动加载。

### 什么会被记住

Auto Memory 专门记录"不在代码里但需要跨对话保留"的信息：

**用户偏好（user 类型）：**
- 技术背景和熟悉程度
- 沟通风格偏好
- 习惯用哪些工具

**反馈记录（feedback 类型）：**
- 你纠正过的行为（"别自动帮我 commit"）
- 你认可的做法（"这种写法很好，以后都这样"）
- 这类记忆最重要，防止 Claude 犯同样的错误

**项目背景（project 类型）：**
- 当前在做什么功能
- 为什么做某个技术决策
- 截止日期和约束

**外部资源（reference 类型）：**
- Bug 在哪里追踪（Linear、Jira 项目名）
- 监控看板地址
- 内部文档位置

### Memory 的文件结构

```
.claude/projects/<project-id>/memory/
├── MEMORY.md              # 索引文件（每次对话都加载）
├── user_profile.md        # 用户偏好
├── feedback_code_style.md # 代码风格反馈
├── project_current.md     # 当前项目状态
└── reference_systems.md   # 外部系统参考
```

每个 Memory 文件的格式：

```markdown
---
name: 代码风格反馈
description: 用户对代码风格的明确要求
type: feedback
---

不要为假设的未来需求写抽象层。

**Why:** 用户曾指出一个不必要的策略模式重构。
**How to apply:** 改动范围严格匹配任务，不做超出任务的重构。
```

### 主动触发记忆保存

Claude Code 通常会自动判断什么值得记忆，但你也可以明确告诉它：

```
记住：这个项目用 pnpm，不用 npm
记住：不要在没有明确要求的情况下修改测试文件
```

### 管理已有记忆

Memory 文件是普通 Markdown，可以直接编辑：

```bash
# 查看记忆索引
cat .claude/projects/*/memory/MEMORY.md

# 删除过时记忆
rm .claude/projects/*/memory/project_old_feature.md
# 然后手动从 MEMORY.md 删掉对应行
```

或者在对话里说：
```
删掉关于 auth 重构的记忆，那个功能已经上线了
更新项目状态：现在在做用户通知系统
```

### 记忆的有效期

记忆会过时。特别是 project 类型，任务完成了就应该删掉。一个已经上线的功能仍然存在"项目记忆"里，只会干扰判断。

使用原则：
- 验证记忆里提到的文件路径还存在
- 记忆和当前代码有矛盾时，以代码为准
- project 类型记忆在任务完成后主动删除

## 三种机制的分工

| 机制 | 谁写 | 写什么 | 生命周期 |
|------|------|--------|---------|
| CLAUDE.md | 你 | 项目约定、行为规则 | 与代码库同步 |
| Auto Memory | Claude | 用户偏好、反馈、背景 | 长期，手动维护 |
| Skills | 你 | 可重复执行的工作流 | 与代码库同步 |

**一个常见的混淆：**

- "项目用 pnpm" → 放 CLAUDE.md（规则）
- "这个用户习惯用 pnpm，之前有过一次提示 npm 被纠正" → Memory（学到的偏好）
- "每次提交前运行 lint" → Skill（工作流）

## 实践建议

**新项目启动时：**

1. 跑 `/init` 生成基础 CLAUDE.md
2. 补充项目特有的约定和禁止项
3. 把个人偏好告诉 Claude，让它写入 Memory

**日常协作时：**

- 发现 Claude 做了你不满意的事，明确纠正，并告诉它记住
- 开始新功能时，告诉它背景（"这是为了满足合规要求，不是重构技术债"）
- 功能完成后，让它清理相关的 project 记忆

**团队协作时：**

- CLAUDE.md 提交到 git，所有人共享规则
- CLAUDE.local.md 放个人偏好，不提交
- Skills 提交到 git，共享工作流

## 小结

持久化上下文是 Claude Code 从"一次性工具"变成"长期协作伙伴"的关键。CLAUDE.md 让它记住规则，Memory 让它记住你，Skills 让它记住怎么做事。三层配合，每次打开项目，Claude Code 就已经是一个了解这个代码库、了解你偏好的协作者。
