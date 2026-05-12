---
title: "第三章：核心功能详解"
date: 2026-05-12
tags:
  - AI
  - ClaudeCode
  - 功能
sort: 3
summary: 深入了解 Claude Code 的核心功能：斜杠命令、Plan 模式、CLAUDE.md 项目配置、MCP 扩展协议、Sub-agents 子代理，以及如何通过这些功能完成复杂的工程任务。
---

# 第三章：核心功能详解

上一章介绍了基本的安装和第一次使用。这一章深入到 Claude Code 真正有价值的功能——这些是让它从"能用"变成"好用"的关键。

## 斜杠命令

在对话中输入 `/` 开头的命令，可以控制 Claude Code 的行为。命令很多，不用一次全记住，这里按用途分类列出来，用到的时候查就行。

### 基础操作

| 命令 | 作用 |
|------|------|
| `/help` | 查看所有可用命令（包括你安装的自定义 Skills） |
| `/init` | 分析当前项目，生成 `CLAUDE.md` 配置文件 |
| `/diff` | 交互式查看本次会话做了哪些文件修改 |
| `/add-dir <path>` | 添加额外工作目录（monorepo 多包项目特别有用） |
| `/terminal-setup` | 配置终端，让多行输入更舒服 |

### 模型与成本控制

| 命令 | 作用 |
|------|------|
| `/model` | 切换模型，支持别名：`sonnet`、`opus`、`haiku` |
| `/effort [level]` | 设置推理努力程度：`low` / `medium` / `high` / `xhigh` / `max` / `auto` |
| `/fast [on\|off]` | 切换快速模式（减少思考深度，加快响应） |
| `/usage` 或 `/cost` | 查看当前会话的 token 用量和费用 |

关于 effort，简单说就是控制 Claude 思考的深度。日常写代码 `high` 就够了，遇到复杂架构问题可以开 `xhigh`。`max` 是不限制思考 token，适合特别棘手的调试场景，不过只在当前会话生效。`low` 和 `medium` 适合简单的格式化、重命名之类的机械任务。

### 上下文管理

| 命令 | 作用 |
|------|------|
| `/clear` | 清除当前对话上下文（不影响文件，重新开始聊） |
| `/compact [instructions]` | 压缩对话历史，可以附带指令告诉它压缩时重点保留什么 |
| `/branch` 或 `/fork` | 从当前对话分叉出一个新分支（想尝试不同方向但不想丢失当前进度） |
| `/resume` | 恢复之前的会话（Claude Code 会自动保存最近的会话） |
| `/rewind` | 回退到对话中的某个历史节点 |

`/compact` 是个很实用的命令。聊了很久之后上下文会变得很大，速度变慢、费用变高。用 `/compact` 可以让 Claude 把之前的对话精简成摘要。你还可以给它加指令，比如 `/compact 重点保留数据库相关的讨论`，这样压缩后不会丢失关键上下文。

### 工作流

| 命令 | 作用 |
|------|------|
| `/plan` | 进入 Plan 模式（后面详细讲） |
| `/review [PR]` | 对当前分支或指定 PR 做代码审查 |
| `/security-review` | 安全漏洞检查 |
| `/simplify` | 代码质量审查，检查是否有可以简化的地方 |

### 配置与调试

| 命令 | 作用 |
|------|------|
| `/config` | 打开设置界面 |
| `/permissions` | 查看和配置权限规则 |
| `/memory` | 查看和编辑 Memory 文件 |
| `/mcp` | 管理 MCP 服务器连接 |
| `/doctor` | 诊断安装问题（遇到奇怪的报错先试这个） |
| `/debug` | 开启调试日志 |
| `/feedback` | 提交 Bug 报告 |

说实话，日常用得最多的就是 `/clear`、`/compact`、`/model`、`/diff` 和 `/plan`。其他的知道有就行，需要的时候 `/help` 里都能找到。

## 文件引用和图片

在发消息的时候，你可以用几种方式给 Claude Code 提供额外的上下文。

### @ 引用文件

在输入框里打 `@`，后面跟文件名，Claude Code 会把那个文件的内容加进对话上下文：

```
帮我看看 @src/auth/login.ts 里的认证逻辑有没有安全问题
```

这比先打开文件、复制内容、再粘贴进来方便多了。而且在 CLAUDE.md 和 Skill 定义文件里也支持这个语法，比如 `@package.json` 会自动引入 package.json 的内容。

### 图片支持

Claude Code 可以直接看图片，这对 UI 调试特别有用。支持三种方式：

- **粘贴剪贴板**：截图后按 `Ctrl+V` 粘贴（注意是 Ctrl 不是 Cmd，macOS 上也是）
- **拖拽**：直接把图片文件拖到终端窗口里
- **路径引用**：直接在消息里提供图片文件路径

粘贴图片后，对话里会出现一个 `[Image #N]` 的标记，说明图片已经加进去了。

**实际用法举例：**

```
（粘贴一张 UI 截图）
这个页面的间距不对，header 和内容区域之间应该有 24px 的间距，
帮我修一下 CSS
```

```
（粘贴一张报错截图）
这个错误怎么解决？
```

你甚至可以把设计稿截图扔给它，让它照着写 HTML/CSS。不用指望像素级还原，但做个差不多的初版完全没问题。

## Plan 模式：先想清楚再动手

对于复杂任务，直接让 Claude Code 开始写代码往往不是最优策略——它可能朝着不是你想要的方向走，等你发现时已经改了很多文件。

Plan 模式解决这个问题。不过要先理解一件事：**Plan 模式其实是一种权限模式**，不只是一个命令。

### 权限模式切换

Claude Code 有三种权限模式，通过 **Shift+Tab** 循环切换：

1. **Default（默认）**：正常模式，执行操作前会向你请求权限
2. **AcceptEdits**：自动批准文件编辑（不用每次点确认）
3. **Plan**：只读模式，Claude 只能读文件和探索代码库，不会做任何修改

当前处于什么模式，会显示在输入框下方。

### Plan 模式的特点

进入 Plan 模式后，Claude Code 变成"只看不动"——它可以读文件、搜索代码、理解架构，但不会修改任何文件。它通常会启动一个 Explore 子代理来快速扫描相关代码，然后给你一份详细的执行计划。

你确认计划没问题后，按 **Shift+Tab** 切回 Default 或 AcceptEdits 模式，Claude 就会按计划开始执行。

### 什么时候用 Plan 模式

- 任务涉及多个文件的修改，你想先确认方向
- 你对这块代码不熟悉，想先理解再改
- 有多种可行方案，想让 Claude 先分析利弊
- 需要架构层面的调整，改错了回退成本高

**示例：**

```
# 先按 Shift+Tab 切到 Plan 模式
重构用户认证系统，从 session-based 改成 JWT，需要同时更新前后端
```

Claude Code 会给你一份计划，说明它打算改哪些文件、每个文件做什么、改动的先后顺序。你可以直接批准，也可以说"第 3 步不对，应该先处理 token 刷新逻辑"，它会更新计划后再执行。

也可以通过命令行参数直接以 Plan 模式启动：

```bash
claude --permission-mode plan
```

## CLAUDE.md：给 Claude 的项目说明书

`CLAUDE.md` 是一个放在项目里的 Markdown 文件，Claude Code 每次启动都会读取它。你可以在里面写下项目约定，让 Claude Code 在每次对话中都遵守这些规则，不需要每次重复解释。

其实你可以把它理解为项目的"宪法"——Claude 的行为锚点。写好这个文件，比反复在对话里纠正 Claude 的行为高效得多。

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

### CLAUDE.md 的位置与加载顺序

Claude Code 会从文件系统根目录到当前工作目录，逐层向下搜索 `CLAUDE.md` 和 `CLAUDE.local.md`。找到的所有文件会拼接在一起加载——越靠近根目录的越先加载，同一目录下 `CLAUDE.md` 先于 `CLAUDE.local.md`。

| 文件 | 作用范围 | 说明 |
|------|---------|------|
| `./CLAUDE.md` | 当前项目（提交到 git） | 团队共享的约定 |
| `./.claude/CLAUDE.md` | 当前项目（同上） | 两个位置都支持 |
| `./CLAUDE.local.md` | 当前项目（不提交） | 个人本地约定 |
| `~/.claude/CLAUDE.md` | 所有项目 | 用户级全局配置 |

另外，当 Claude 读取子目录里的文件时，如果那个子目录下也有 `CLAUDE.md`，它也会被加载。所以你可以在不同子目录放不同的规则。

**建议：** 把不方便提交的内容（比如内网 API 地址、个人偏好）放在 `CLAUDE.local.md` 里，它默认被 gitignore。

### 路径限定规则

如果有些规则只想对特定类型的文件生效，可以在 `.claude/rules/` 目录下创建规则文件，用 YAML frontmatter 的 `paths` 字段来限定：

```markdown
---
paths:
  - "src/api/**/*.ts"
---

# API 设计规则

- 所有接口必须用 Zod 做参数校验
- 返回格式统一为 { data: T } | { error: string }
- 公开接口必须加 rate limit
```

```markdown
---
paths:
  - "**/*.test.ts"
  - "**/*.test.tsx"
---

# 测试规范

- 使用 describe/it 结构
- 每个测试文件对应一个源文件
- Mock 外部依赖，不要发真实网络请求
```

不带 `paths` 的规则文件在会话开始时就会加载，带 `paths` 的只有当 Claude 处理到匹配的文件时才会加载。这样可以避免无关规则占用上下文。

## MCP：扩展 Claude Code 的能力

[MCP（Model Context Protocol）](https://modelcontextprotocol.io)是一个开放标准，允许 Claude Code 连接外部工具和数据源。通过 MCP，你可以让 Claude Code 直接访问数据库、查询 GitHub Issues、调用内部 API，甚至操作浏览器。

### 传输协议

MCP 支持三种连接方式：

| 类型 | 说明 | 适用场景 |
|------|------|---------|
| **HTTP**（推荐） | 连接远程 HTTP 服务 | 云服务、SaaS API |
| **stdio** | 启动本地进程通信 | 本地工具、自定义脚本 |
| **SSE**（已废弃） | Server-Sent Events | 旧版兼容，新项目不建议用 |

### 三种作用域

| 作用域 | 配置存储位置 | 说明 |
|--------|-------------|------|
| **local**（默认） | `~/.claude.json`（按项目路径存储） | 仅当前项目可用，不提交到 git |
| **project** | 项目根目录 `.mcp.json` | 提交到 git，团队共享 |
| **user** | `~/.claude.json` | 所有项目都能用 |

### 添加 MCP 服务器

```bash
# HTTP 方式连接远程服务（推荐）
claude mcp add --transport http notion https://mcp.notion.com/mcp
claude mcp add --transport http stripe https://mcp.stripe.com

# 带认证 token
claude mcp add --transport http github https://api.githubcopilot.com/mcp/ \
  --header "Authorization: Bearer YOUR_TOKEN"

# stdio 方式运行本地进程
claude mcp add --transport stdio airtable \
  -- npx -y airtable-mcp-server

# 指定作用域
claude mcp add --transport http paypal --scope project https://mcp.paypal.com/mcp
claude mcp add --transport http hubspot --scope user https://mcp.hubspot.com/anthropic
```

### 项目级配置 .mcp.json

如果你想让团队所有人共享同一套 MCP 配置，可以在项目根目录创建 `.mcp.json`：

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"]
    }
  }
}
```

把这个文件提交到 git，团队成员只需要在自己的环境变量里配好 `GITHUB_TOKEN`，就能直接使用。

### 什么时候需要 MCP

如果你发现自己经常需要把外部数据粘贴进对话（"这是我们数据库里的表结构……"），或者 Claude Code 需要访问它默认无法触及的服务，就是引入 MCP 的时机。

常见的场景：

- 直接查询数据库表结构和数据
- 操作 GitHub Issues、PR
- 读写 Notion、Airtable 等协作工具
- 调用内部 API
- 搜索网络获取最新信息

## Hooks：自动化你的工作流

Hooks 允许你在 Claude Code 执行特定操作时自动运行脚本。比如：

- 每次 Claude Code 修改文件后，自动运行 lint
- 每次执行 `git commit` 前，自动检查提交信息格式
- 每次对话结束后，把摘要写入日志

Hooks 配置在 `.claude/settings.json` 里，[第五章](./05-settings-and-hooks)有详细介绍。

## Sub-agents：子代理

这是 Claude Code 一个比较高级但非常强大的功能。简单来说，Claude Code 可以启动"分身"去并行处理任务，每个分身有自己独立的上下文，不会互相干扰。

### 内置子代理

Claude Code 自带三种子代理：

| 子代理 | 模型 | 用途 |
|--------|------|------|
| **Explore** | Haiku（快速、便宜） | 只读扫描代码库，快速收集信息 |
| **Plan** | 跟主会话一致 | 制定执行计划，分析方案 |
| **通用** | 跟主会话一致 | 完整的代码修改能力 |

你不需要手动调用这些子代理——Claude Code 会在它认为合适的时候自动使用。比如你让它"理解一下这个项目的认证架构"，它很可能会启动一个 Explore 子代理来快速扫描相关文件，然后把精简后的信息带回主对话。

### 自定义子代理

你可以在 `.claude/agents/` 目录下用 Markdown 文件定义自己的子代理：

```markdown
---
name: security-reviewer
description: 审查代码的安全漏洞
tools: Read, Grep, Glob, Bash
model: opus
---

你是一个资深安全工程师。审查代码时重点关注：
- 注入漏洞（SQL、XSS、命令注入）
- 认证和授权缺陷
- 代码中的硬编码密钥
- 不安全的数据处理

给出具体的行号引用和修复建议。
```

放在 `.claude/agents/` 下的是项目级子代理（团队共享），放在 `~/.claude/agents/` 下的是个人级（所有项目可用）。

### Worktree 隔离

如果多个子代理需要同时修改文件，可能会产生冲突。这时候可以用 worktree 隔离——每个子代理在自己的 git worktree 副本里工作，互不影响：

```markdown
---
name: feature-builder
description: 独立开发功能模块
isolation: worktree
model: sonnet
---

在独立的工作副本中实现功能，完成后提交到单独的分支。
```

也可以在启动 Claude Code 时直接指定 worktree：

```bash
claude --worktree feature-auth
```

### 子代理 vs Skills

这两个容易混淆，其实区别很明确：

- **Skill** 在当前对话里执行，结果直接出现在你面前
- **子代理** 在独立上下文里执行，只把最终结果带回来

用 Skill 适合你想看到过程的任务，用子代理适合你想把任务丢出去、只关心结果的场景。最多可以同时运行 10 个子代理。

## 并行会话

除了子代理，你也可以直接开多个 Claude Code 实例，处理互相独立的任务：

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

### 基本结构

一个 Skill 最基础的形式就是一个 `SKILL.md` 文件，放在 `.claude/skills/<skill-name>/` 目录下：

```
.claude/skills/
  commit/
    SKILL.md          # 必须有，Skill 的核心定义
    checklist.md      # 可选，辅助文件
    templates/        # 可选，模板目录
```

### SKILL.md 的写法

文件分两部分：YAML frontmatter（配置）和 Markdown 正文（指令）。

```markdown
---
name: commit
description: 根据当前变更生成规范的 commit 信息并提交。当用户说"提交"、"commit"时使用。
allowed-tools: Bash, Read, Grep
---

## 当前变更

!`git diff HEAD`

## 指令

根据上面的 diff，生成一条 Conventional Commits 格式的提交信息。
规则：
- feat/fix/docs/refactor 等类型前缀
- 简洁描述，不超过 72 个字符
- 如果改动较大，在 body 里分点说明

生成后询问用户确认，确认后执行 git commit。
```

### Frontmatter 配置项

| 字段 | 说明 |
|------|------|
| `name` | 显示名称（不填则用目录名） |
| `description` | 描述什么时候用这个 Skill（Claude 据此判断是否自动触发） |
| `disable-model-invocation` | 设为 `true` 则 Claude 不会自动触发，只能手动 `/skill-name` |
| `allowed-tools` | 这个 Skill 可以使用的工具列表（如 `Read`、`Bash`、`Grep`） |
| `argument-hint` | 参数提示，在 `/help` 里显示 |

### 动态上下文注入

Skill 里可以用 `!` 加反引号的语法动态执行命令，把输出注入到提示词里：

```markdown
## 当前分支信息
!`git branch --show-current`

## 最近提交
!`git log --oneline -5`

## 变更文件
!`git diff --name-only HEAD`
```

这样每次触发 Skill 时，Claude 看到的都是实时数据，不是写死的内容。

### 使用方式

```
/commit           # 生成提交信息并提交
/code-review      # 对当前分支做代码审查
/write-post       # 写一篇博客文章
```

### 发现和安装社区 Skills

你可以在 Claude Code 里直接搜索社区分享的 Skills：

```
帮我找一个能做代码审查的 skill
```

Claude Code 内置了 `/find-skills` 命令来帮你发现可用的 Skills。

团队可以把 Skills 提交到 git，所有人共享同一套工作流规范。而且 Skills 遵循 Agent Skills 开放标准，不仅在 Claude Code 里能用，在 Claude.ai 网页版和 Claude Desktop 里也支持。

## 小结

这一章信息量不小，但不需要一次全消化。使用建议是：

1. 新项目先跑 `/init`，生成 `CLAUDE.md` 作为基础
2. 复杂任务用 **Shift+Tab** 切到 Plan 模式先对齐方向
3. 善用 `@` 引用文件和图片粘贴，给 Claude 足够的上下文
4. 重复性任务打包成 Skills
5. 需要外部数据源时引入 MCP
6. 大任务拆成子代理并行处理

不必一开始就把所有功能都用上，随着使用深入，你自然会知道什么时候需要什么工具。下一章会讲 [Memory 与持久化上下文](./04-memory-and-context)——怎么让 Claude Code 在不同会话之间记住你的项目知识。
