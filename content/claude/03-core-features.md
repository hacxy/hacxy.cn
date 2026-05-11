---
title: "第三章：核心功能详解"
date: 2026-05-11
tags:
  - AI
  - ClaudeCode
  - 功能
sort: 3
summary: 深入了解 Claude Code 的核心功能：斜杠命令、Plan 模式、CLAUDE.md 项目配置、MCP 扩展协议，以及如何通过这些功能完成复杂的工程任务。
---

# 第三章：核心功能详解

上一章介绍了基本的安装和第一次使用。这一章深入到 Claude Code 真正有价值的功能——这些是让它从"能用"变成"好用"的关键。

## 斜杠命令

在对话中输入 `/` 开头的命令，可以控制 Claude Code 的行为。常用的有：

| 命令 | 作用 |
|------|------|
| `/init` | 分析当前项目，生成 `CLAUDE.md` 配置文件 |
| `/help` | 查看所有可用命令 |
| `/clear` | 清除当前对话上下文（不影响文件） |
| `/compact` | 压缩对话历史，节省 token |
| `/model` | 切换 AI 模型（Opus / Sonnet / Haiku） |
| `/plan` | 进入 Plan 模式，先规划再执行 |
| `/memory` | 查看和编辑 Memory 文件 |
| `/mcp` | 管理 MCP 服务器连接 |
| `/permissions` | 查看和配置权限规则 |
| `/diff` | 查看本次会话做了哪些文件修改 |

输入 `/help` 可以看到完整列表，包括你安装的自定义 Skills。

## Plan 模式：先想清楚再动手

对于复杂任务，直接让 Claude Code 开始写代码往往不是最优策略——它可能朝着不是你想要的方向走，等你发现时已经改了很多文件。

Plan 模式解决这个问题。输入 `/plan` 进入后，Claude Code 会：

1. 先探索代码库，理解相关代码
2. 制定详细的执行计划
3. 把计划呈现给你，等待你的确认
4. 你批准后才开始实际修改

**什么时候用 Plan 模式：**

- 任务涉及超过 3 个文件的修改
- 有多种可行方案，你想确认方向
- 需要架构层面的调整
- 你对这块代码不熟悉，想先理解再改

**示例：**

```
/plan
重构用户认证系统，从 session-based 改成 JWT，需要同时更新前后端
```

Claude Code 会给你一份计划，说明它打算改哪些文件、每个文件做什么。你可以直接批准，也可以说"第 3 步不对，应该先处理 token 刷新逻辑"，它会更新计划后再执行。

## CLAUDE.md：给 Claude 的项目说明书

`CLAUDE.md` 是一个放在项目里的 Markdown 文件，Claude Code 每次启动都会读取它。你可以在里面写下项目约定，让 Claude Code 在每次对话中都遵守这些规则，不需要每次重复解释。

### 自动生成

在项目根目录执行：

```
/init
```

Claude Code 会分析你的项目，自动生成一份 `CLAUDE.md`，内容包括：

- 项目架构概述
- 常用命令（dev、build、test、lint）
- 代码规范（检测到的 linter 配置）
- 目录结构说明

### 手动编写

你也可以手动写，内容越具体越好。一个典型的 `CLAUDE.md`：

```markdown
# 项目规范

## 技术栈
- React 18 + TypeScript，严格模式
- 样式用 Tailwind CSS，不要写 inline style
- 状态管理用 Zustand，不要引入 Redux

## 代码规范
- 函数组件，不用 class component
- 自定义 Hook 命名必须以 use 开头
- 不允许 any 类型，编译报错一律修复

## 命令
- `pnpm dev` 启动开发服务器
- `pnpm test` 运行测试
- `pnpm build` 构建生产包

## 禁止事项
- 不要直接修改 src/generated/ 下的文件（自动生成）
- 不要改 package.json 的 engines 字段
```

### CLAUDE.md 的位置

| 文件 | 作用范围 | 说明 |
|------|---------|------|
| `./CLAUDE.md` | 当前项目（提交到 git） | 团队共享的约定 |
| `./.claude/CLAUDE.md` | 当前项目（同上） | 两个位置都支持 |
| `./CLAUDE.local.md` | 当前项目（不提交） | 个人本地约定 |
| `~/.claude/CLAUDE.md` | 所有项目 | 用户级全局配置 |

**建议：** 把不方便提交的内容（比如内网 API 地址、个人偏好）放在 `CLAUDE.local.md` 里，它默认被 gitignore。

## MCP：扩展 Claude Code 的能力

[MCP（Model Context Protocol）](https://modelcontextprotocol.io)是一个开放标准，允许 Claude Code 连接外部工具和数据源。通过 MCP，你可以让 Claude Code 直接访问数据库、查询 GitHub Issues、调用内部 API，甚至操作浏览器。

### 常用 MCP 服务器

| 服务器 | 功能 | 安装命令 |
|--------|------|---------|
| Filesystem | 扩展文件访问范围 | `claude mcp add filesystem` |
| GitHub | 操作 Issues / PR | `claude mcp add github` |
| PostgreSQL | 直接查询数据库 | `claude mcp add postgres` |
| Brave Search | 网络搜索 | `claude mcp add brave-search` |
| Memory | 跨会话记忆 | `claude mcp add memory` |

### 添加 MCP 服务器

```bash
# 以 HTTP 方式连接 GitHub MCP
claude mcp add --transport http github https://api.githubcopilot.com/mcp/ \
  --header "Authorization: Bearer YOUR_TOKEN"

# 以本地进程方式运行
claude mcp add filesystem npx @modelcontextprotocol/server-filesystem /path/to/dir
```

也可以在配置文件里手动添加，见[第五章](./05-settings-and-hooks)。

### 什么时候需要 MCP

如果你发现自己经常需要把外部数据粘贴进对话（"这是我们数据库里的表结构……"），或者 Claude Code 需要访问它默认无法触及的服务，就是引入 MCP 的时机。

## Hooks：自动化你的工作流

Hooks 允许你在 Claude Code 执行特定操作时自动运行脚本。比如：

- 每次 Claude Code 修改文件后，自动运行 lint
- 每次执行 `git commit` 前，自动检查提交信息格式
- 每次对话结束后，把摘要写入日志

Hooks 配置在 `.claude/settings.json` 里，[第五章](./05-settings-and-hooks)有详细介绍。

## 并行会话

Claude Code 支持同时运行多个实例，处理互相独立的任务：

```bash
# 终端 1：处理前端
cd /project
claude "重构用户列表组件，支持虚拟滚动"

# 终端 2：同时处理后端
cd /project
claude "给用户列表 API 加上分页和过滤参数"
```

在 VS Code 插件里可以用 `Cmd+Shift+Esc` 开新的对话标签页。

## Skills：打包可复用的工作流

如果你有一类任务经常重复，比如每次都要告诉 Claude Code "按照 [Conventional Commits](https://www.conventionalcommits.org) 规范提交代码"，可以把这个流程打包成 Skill。

Skill 是存放在 `.claude/skills/<skill-name>/SKILL.md` 里的 Markdown 文件，通过 `/skill-name` 触发。

```
/commit           # 生成提交信息并提交
/code-review      # 对当前分支做代码审查
/write-post       # 写一篇博客文章
```

团队可以把 Skills 提交到 git，所有人共享同一套工作流规范。

## 小结

这一章的重点是让你知道有哪些工具可用。使用建议是：

1. 新项目先跑 `/init`，生成 `CLAUDE.md` 作为基础
2. 复杂任务用 `/plan` 先对齐方向
3. 重复性任务打包成 Skills
4. 需要外部数据源时引入 MCP

不必一开始就把所有功能都用上，随着使用深入，你自然会知道什么时候需要什么工具。
