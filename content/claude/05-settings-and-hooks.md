---
title: "第五章：配置与自动化"
date: 2026-05-12
tags:
  - AI
  - ClaudeCode
  - 进阶
  - 工程化
sort: 5
summary: 通过 settings.json 配置权限策略、默认模型和环境变量；通过 Hooks 在 Claude Code 操作前后自动执行脚本，实现工作流的全面自动化。
---

# 第五章：配置与自动化

Claude Code 的行为大部分都可以配置。这一章介绍配置文件的结构、权限模式、MCP 配置和 Hooks 机制——它们共同决定 Claude Code 能做什么、怎么做，以及你在它做事的前后能插入哪些自己的逻辑。

## 配置文件

Claude Code 的配置文件是 JSON 格式，有四个层级，从高到低：

| 层级 | 文件路径 | 说明 |
|------|---------|------|
| 托管策略 | 组织级，由管理员下发 | 最高优先级，不可覆盖 |
| 用户配置 | `~/.claude/settings.json` | 对所有项目生效 |
| 项目配置 | `.claude/settings.json` | 提交到 git，团队共享 |
| 本地配置 | `.claude/settings.local.json` | gitignore，个人本地 |

低层级的配置会被高层级覆盖。不过有个很重要的细节：**数组字段是合并而不是覆盖**。比如你在用户配置里写了几条 `allow` 规则，又在项目配置里写了几条，最终两边的规则会合在一起生效，不会互相覆盖。标量值（比如 `model`）则是高优先级直接覆盖低优先级。

另外，你也可以在 CLI 里用 `/config` 命令打开交互式配置界面，不用手动编辑 JSON 文件就能修改常用设置。

## 权限模式

这是 Claude Code 最核心的安全机制。权限模式决定了 Claude Code 在执行操作时需要多少人工确认。

Claude Code 提供了 **六种权限模式**，每种在"安全/监督"和"效率/自主"之间做了不同的取舍：

| 模式 | 无需确认的操作 | 适用场景 |
|------|--------------|---------|
| `default` | 仅读取 | 默认模式，敏感操作 |
| `acceptEdits` | 读取 + 文件编辑 + 常见文件系统命令 | 写代码时边做边审 |
| `plan` | 仅读取（只分析不修改） | 探索代码库、做架构规划 |
| `auto` | 所有操作，有后台安全检查 | 长任务、减少确认疲劳 |
| `dontAsk` | 仅预批准的工具 | CI 流水线、锁定环境 |
| `bypassPermissions` | 所有操作，无任何检查 | 仅限隔离容器/虚拟机 |

### 切换权限模式

在 CLI 会话中按 `Shift+Tab` 可以在 `default` → `acceptEdits` → `plan` 之间循环切换，当前模式会显示在状态栏里。

启动时也可以直接指定模式：

```bash
claude --permission-mode plan
```

或者在 settings.json 里设为默认：

```json
{
  "permissions": {
    "defaultMode": "acceptEdits"
  }
}
```

### 各模式详解

**Default 模式**：Claude Code 的默认行为。读取文件不需要确认，但写文件、执行 Bash 命令、网络请求等都会弹确认框。对于刚上手的用户来说这是最安全的选择。

**acceptEdits 模式**：自动批准文件编辑和常见的文件系统命令（`mkdir`、`touch`、`rm`、`mv`、`cp`、`sed` 等），但其他 Bash 命令仍然需要确认。适合你想在编辑器里或用 `git diff` 事后审查修改的工作流。按一次 `Shift+Tab` 就能从 default 切过来。

**Plan 模式**：只读模式。Claude 可以分析代码库、提出方案、理清思路，但不会动任何文件。非常适合在改代码之前先让 Claude 做个分析或规划。你可以用 `Shift+Tab` 进入，也可以在单条消息前加 `/plan` 前缀让这条消息以 plan 模式执行。Plan 做完后 Claude 会问你怎么处理，你可以选择以哪种模式开始执行。按 `Ctrl+G` 还可以在默认编辑器里直接编辑 Claude 的方案。

**Auto 模式**（2026 年新增）：让 Claude 自动执行所有操作，不弹确认框。但有一个独立的分类器模型在后台审查每个操作，如果操作超出了你的请求范围、指向不认识的基础设施、或看起来是被恶意内容驱动的，就会被拦截。

> Auto 模式目前是研究预览阶段。它能减少确认弹窗，但不能保证绝对安全。

使用 auto 模式需要满足几个条件：
- **计划**：Max、Team、Enterprise 或 API 计划（Pro 不行）
- **模型**：Claude Sonnet 4.6、Opus 4.6 或 Opus 4.7（Max 计划只支持 Opus 4.7）
- **API 提供商**：仅 Anthropic API（Bedrock、Vertex、Foundry 不支持）

分类器默认信任你的工作目录和仓库配置的远程地址，其他一切都视为外部资源。比如 `curl | bash`、发送敏感数据到外部、生产环境部署、大规模删除云存储、强制推送等操作会被默认拦截。如果某个操作被连续拦截 3 次或累计 20 次，auto 模式会暂停并恢复提示确认。

有个很实用的特性：你在对话中说的约束，分类器也会遵守。比如你说"不要推送"或"部署前等我审查"，分类器就会拦截对应的操作。

**dontAsk 模式**：只有匹配 `permissions.allow` 规则的操作才能执行，其他一律自动拒绝，不弹确认框。适合 CI 流水线和受限环境，你可以精确定义 Claude 能做什么。

**bypassPermissions 模式**：跳过所有权限检查，所有操作立即执行。这个模式之所以叫 `--dangerously-skip-permissions`，就是因为它确实很危险。仅限在隔离的容器或虚拟机里使用，绝对不要在你的日常开发机器上用。从 v2.1.126 开始，这个模式甚至允许写入受保护路径。不过删除根目录 (`rm -rf /`) 或用户目录 (`rm -rf ~`) 仍然会弹确认，作为最后的安全防线。

### 受保护路径

在除 `bypassPermissions` 之外的所有模式中，对以下路径的写操作**永远不会被自动批准**：

**受保护的目录：**
- `.git`
- `.vscode`
- `.idea`
- `.husky`
- `.claude`（`.claude/commands`、`.claude/agents`、`.claude/skills`、`.claude/worktrees` 除外，因为 Claude 经常需要在这些目录创建内容）

**受保护的文件：**
- `.gitconfig`、`.gitmodules`
- `.bashrc`、`.bash_profile`、`.zshrc`、`.zprofile`、`.profile`
- `.ripgreprc`
- `.mcp.json`、`.claude.json`

在 `default`、`acceptEdits` 和 `plan` 模式下对这些路径的写操作会弹确认；在 `auto` 模式下会交给分类器审查；在 `dontAsk` 模式下会被拒绝。

## 权限规则

除了权限模式，你还可以通过 `allow`、`deny`、`ask` 规则精细控制每个操作的权限。

```json
{
  "permissions": {
    "allow": [
      "Bash(pnpm run lint)",
      "Bash(pnpm run test)",
      "Bash(git status)",
      "Bash(git diff *)",
      "Bash(git log *)",
      "Read(~/.zshrc)"
    ],
    "deny": [
      "Bash(curl *)",
      "Bash(wget *)",
      "Bash(rm -rf *)",
      "Read(./.env*)"
    ],
    "ask": [
      "Bash(git push *)",
      "Bash(git commit *)"
    ]
  }
}
```

- `allow`：自动执行，不弹确认框
- `deny`：直接拒绝，Claude Code 无法执行
- `ask`：每次都弹确认框

**规则评估顺序：先 deny，再 ask，最后 allow。** 第一条匹配的规则生效。所以 deny 规则永远优先——如果某个操作同时匹配了 allow 和 deny，deny 赢。

### 规则语法详解

规则格式是 `工具名` 或 `工具名(匹配模式)`。

**匹配所有操作：**

| 规则 | 含义 |
|------|------|
| `Bash` | 匹配所有 Bash 命令 |
| `Read` | 匹配所有文件读取 |
| `Edit` | 匹配所有文件编辑 |
| `Write` | 匹配所有文件写入 |
| `WebFetch` | 匹配所有网页请求 |

`Bash(*)` 和 `Bash` 等价。

**Bash 命令的 glob 匹配：**

| 规则 | 匹配 |
|------|------|
| `Bash(npm run build)` | 精确匹配 `npm run build` |
| `Bash(npm run test *)` | 匹配 `npm run test` 开头的命令 |
| `Bash(npm *)` | 匹配所有 `npm` 命令 |
| `Bash(* --version)` | 匹配任何以 `--version` 结尾的命令 |
| `Bash(git * main)` | 匹配 `git checkout main`、`git merge main` 等 |

注意空格很重要：`Bash(ls *)` 匹配 `ls -la` 但不匹配 `lsof`，而 `Bash(ls*)` 两个都匹配。

**文件路径规则：**

`Read` 和 `Edit` 规则遵循 gitignore 语法：

| 模式 | 含义 | 示例 |
|------|------|------|
| `//路径` | 文件系统绝对路径 | `Read(//Users/alice/secrets/**)` |
| `~/路径` | 从用户目录开始 | `Read(~/Documents/*.pdf)` |
| `/路径` | 从项目根目录开始 | `Edit(/src/**/*.ts)` |
| `路径` 或 `./路径` | 从当前目录开始 | `Read(*.env)` |

注意：`/Users/alice/file` **不是**绝对路径，它是相对于项目根目录的。绝对路径要用 `//Users/alice/file`。

**MCP 工具权限：**

MCP 工具使用双下划线分隔的格式：

| 规则 | 含义 |
|------|------|
| `mcp__puppeteer` | 匹配 puppeteer 服务器提供的所有工具 |
| `mcp__puppeteer__puppeteer_navigate` | 仅匹配特定工具 |

**Agent（子代理）权限：**

| 规则 | 含义 |
|------|------|
| `Agent(Explore)` | 控制 Explore 子代理 |
| `Agent(Plan)` | 控制 Plan 子代理 |
| `Agent(my-custom-agent)` | 控制自定义子代理 |

**域名级 WebFetch 权限：**

```json
{
  "permissions": {
    "allow": ["WebFetch(domain:github.com)"]
  }
}
```

### 临时覆盖

启动时可以用 CLI 参数临时覆盖权限：

```bash
# 临时允许特定工具
claude --allowedTools "Bash(npm test)" "Edit"

# 临时禁用特定工具
claude --disallowedTools "Bash(curl *)" "Agent(Explore)"
```

### 实用配置：让只读操作免于确认

```json
{
  "permissions": {
    "allow": [
      "Bash(cat *)",
      "Bash(ls *)",
      "Bash(find *)",
      "Bash(grep *)",
      "Bash(git log *)",
      "Bash(git diff *)",
      "Bash(git status)"
    ]
  }
}
```

其实 Claude Code 内置了一组只读命令（`ls`、`cat`、`head`、`tail`、`grep`、`find`、`wc`、`diff`、`stat`、`du`、`cd` 以及只读的 `git` 命令），这些在所有模式下都不需要确认。这个内置列表不可配置，但你可以用 `ask` 或 `deny` 规则来覆盖它。

### 一些容易踩的坑

Bash 权限规则有个局限性：它是文本匹配，不是语义匹配。比如 `Bash(curl http://github.com/ *)` 想限制只能访问 GitHub，但实际上 `curl -X GET http://github.com/...`（参数顺序不同）或 `curl https://github.com/...`（协议不同）都匹配不上。如果需要可靠的 URL 过滤，用 `WebFetch(domain:github.com)` 配合 Bash deny 规则更稳妥，或者用 PreToolUse Hook 做验证。

另外，Claude Code 能识别 Shell 操作符。`Bash(safe-cmd *)` 这条规则不会让 Claude 有权执行 `safe-cmd && other-cmd`，因为 `&&`、`||`、`;`、`|` 等操作符会被识别为命令分隔符，每个子命令需要独立匹配。

## 模型配置

在 settings.json 里通过 `model` 字段设置默认模型：

```json
{
  "model": "claude-sonnet-4-6"
}
```

可选值：
- `claude-opus-4-7`：最强，适合复杂架构任务，消耗 token 最多
- `claude-sonnet-4-6`：默认，综合性价比最好
- `claude-haiku-4-5-20251001`：最快最省，适合简单任务

这个配置可以被以下方式覆盖（仅对当次会话生效）：

- 启动时加 `--model` 参数：`claude --model claude-opus-4-7`
- 设置环境变量：`ANTHROPIC_MODEL=claude-opus-4-7 claude`
- 会话中用 `/model` 命令切换

如果你想限制团队成员能选择哪些模型，可以用 `availableModels` 字段：

```json
{
  "model": "claude-sonnet-4-6",
  "availableModels": ["claude-sonnet-4-6", "claude-haiku-4-5-20251001"]
}
```

这样通过 `/model`、`--model` 或 `ANTHROPIC_MODEL` 只能切换到列表里的模型。不过这个限制不影响 `model` 字段本身设的默认值。

## 其他配置

```json
{
  "env": {
    "CLAUDE_CODE_ENABLE_TELEMETRY": "1"
  },
  "alwaysThinkingEnabled": true
}
```

- `env`：键值对形式的环境变量，启动时注入到会话环境中。Bash 工具执行的命令和 Hook 脚本都能读取这些变量。注意值必须是字符串，不支持动态求值。
- `alwaysThinkingEnabled`：开启"深度思考"模式，处理复杂问题更准确，但更慢。可以在会话中用 `/effort` 命令调整思考深度（支持 low、medium、high、xhigh、max 五个级别）。

## MCP 服务器配置

[MCP（Model Context Protocol）](https://modelcontextprotocol.io/docs)让 Claude Code 能连接外部工具和服务。你可以用命令行或配置文件来管理 MCP 服务器。

### 传输方式

Claude Code 支持三种传输方式：

| 类型 | 说明 | 适用场景 |
|------|------|---------|
| **stdio** | 作为本地子进程运行，通过标准输入输出通信 | 本地 MCP 服务器 |
| **HTTP**（Streamable HTTP） | 推荐的远程传输方式 | 远程/云端 MCP 服务器 |
| **SSE** | 已弃用，建议迁移到 HTTP | 旧版远程服务器 |

### 命令行管理

```bash
# 添加 stdio 类型的 MCP 服务器
claude mcp add --transport stdio my-server -- npx -y @some/package

# 添加 HTTP 类型的远程 MCP 服务器
claude mcp add --transport http github https://api.githubcopilot.com/mcp/

# 列出所有 MCP 服务器
claude mcp list

# 查看某个 MCP 服务器
claude mcp get my-server

# 移除 MCP 服务器
claude mcp remove my-server
```

注意：所有选项（`--transport`、`--env`、`--scope`、`--header`）都要放在服务器名称前面。`--` 用来分隔服务器名称和传给 stdio 服务器的命令与参数。

### 配置作用域

MCP 服务器有三种配置作用域：

| 作用域 | 存储位置 | 共享方式 |
|-------|---------|---------|
| `local`（默认） | `~/.claude.json`（按项目路径存储） | 不共享 |
| `user` | `~/.claude.json`（全局） | 对所有项目生效 |
| `project` | 项目根目录的 `.mcp.json` | 提交到 git，团队共享 |

用 `--scope` 指定：

```bash
# 添加到项目配置，团队可以共享
claude mcp add --transport stdio --scope project my-server -- npx -y @some/package
```

### settings.json 中的配置

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your_token"
      }
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://localhost/mydb"]
    }
  }
}
```

Token 等敏感信息建议放在 `.claude/settings.local.json` 里，避免提交到 git。

### 断线重连

HTTP 和 SSE 类型的服务器如果断连，Claude Code 会自动用指数退避重连：最多 5 次，从 1 秒开始每次翻倍。5 次失败后标记为 failed，你可以在 `/mcp` 菜单里手动重试。stdio 类型是本地进程，不会自动重连。

实际使用中，3-5 个 MCP 服务器对大多数工作流就够了。如果经常用超过 10 个，考虑用 MCP 网关把多个服务器合并到一个端点。

## Hooks：在操作前后插入逻辑

Hooks 是 Claude Code 最强大的自动化机制。你可以在它执行某类操作时，自动触发你的脚本。

### Hook 触发时机

Hook 事件分三类频率：每次会话触发一次、每轮对话触发一次、以及每个工具调用都触发。

**常用事件：**

| 事件 | 触发时机 | 能否拦截操作 |
|------|---------|------------|
| `SessionStart` | 会话开始或恢复时 | 否 |
| `SessionEnd` | 会话结束时 | 否 |
| `Setup` | 使用 `--init-only`、`--init`、`--maintenance` 时 | 否 |
| `UserPromptSubmit` | 用户提交消息前 | 是 |
| `PreToolUse` | 工具执行前 | 是 |
| `PermissionRequest` | 权限确认框出现时 | 是 |
| `PostToolUse` | 工具成功执行后 | 否 |
| `PostToolUseFailure` | 工具执行失败后 | 否 |
| `Stop` | Claude 完成一轮回复后 | 是 |
| `SubagentStop` | 子代理完成后 | 是 |
| `FileChanged` | 指定文件变化时 | 否 |

**其他事件：**

| 事件 | 触发时机 |
|------|---------|
| `PermissionDenied` | Auto 模式下操作被拒绝时 |
| `StopFailure` | 因 API 错误导致回合结束时 |
| `SubagentStart` | 子代理启动时 |
| `TaskCreated` | 任务被创建时 |
| `TaskCompleted` | 任务完成时 |
| `InstructionsLoaded` | CLAUDE.md 或 rules 被加载时 |
| `ConfigChange` | 配置文件变化时 |
| `CwdChanged` | 工作目录变化时 |
| `PreCompact` | 上下文压缩前 |
| `PostCompact` | 上下文压缩后 |
| `Notification` | Claude 发送通知时 |
| `WorktreeCreate` / `WorktreeRemove` | Worktree 创建/删除时 |

### 配置格式

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "pnpm lint --fix"
          }
        ]
      }
    ]
  }
}
```

这段配置的效果：每次 Claude Code 写完文件后，自动运行 `pnpm lint --fix`。

### matcher 过滤

`matcher` 控制这个 Hook 对哪些操作生效：

| matcher 值 | 匹配规则 | 示例 |
|-----------|---------|------|
| `"*"`、`""` 或省略 | 匹配所有操作 | 所有工具调用都触发 |
| 纯字母数字加 `_` 和 `|` | 精确匹配或用 `|` 分隔多个 | `Bash` 或 `Edit|Write` |
| 包含其他字符 | 当作 JavaScript 正则 | `^Notebook`、`mcp__memory__.*` |

MCP 工具的匹配格式是 `mcp__<服务器名>__<工具名>`。

另外还有个 `if` 字段可以做更细粒度的过滤，语法和权限规则一样：

```json
{
  "type": "command",
  "if": "Bash(git *)",
  "command": "echo 'git command detected'"
}
```

### Hook 类型

Claude Code 支持五种 Hook 类型：

**1. Command Hook（最常用）：**

执行 Shell 命令，通过 stdin 接收 JSON 上下文，通过 stdout 输出 JSON 结果，通过退出码控制行为。

```json
{
  "type": "command",
  "command": "node ./scripts/format.js"
}
```

如果用 `args` 字段，命令会用 exec 形式直接执行（没有 Shell），每个参数是字面量：

```json
{
  "type": "command",
  "command": "node",
  "args": ["${CLAUDE_PLUGIN_ROOT}/scripts/format.js", "--fix"]
}
```

**2. HTTP Hook：**

向远程端点发 POST 请求，接收 JSON 响应。

```json
{
  "type": "http",
  "url": "http://localhost:8080/hooks/pre-tool-use",
  "headers": { "Authorization": "Bearer $MY_TOKEN" },
  "allowedEnvVars": ["MY_TOKEN"]
}
```

**3. Prompt Hook：**

用 LLM 评估操作是否安全，返回 `{"ok": true}` 或 `{"ok": false, "reason": "..."}`。适合 Stop/SubagentStop 这类需要判断的场景。

```json
{
  "type": "prompt",
  "prompt": "这个命令安全吗？$ARGUMENTS"
}
```

**4. Agent Hook：**

生成一个有工具访问权限（Read、Grep、Glob）的子代理做深入验证。比 Prompt Hook 更彻底但更慢。

```json
{
  "type": "agent",
  "prompt": "验证代码库是否准备好部署"
}
```

**5. MCP Tool Hook：**

调用已连接的 MCP 服务器上的工具。

```json
{
  "type": "mcp_tool",
  "server": "my_server",
  "tool": "security_scan",
  "input": { "file_path": "${tool_input.file_path}" }
}
```

### 异步 Hook

加上 `async: true` 让 Hook 在后台运行，不阻塞 Claude 的执行：

```json
{
  "type": "command",
  "command": "/path/to/long-running-script.sh",
  "async": true,
  "timeout": 300
}
```

如果设 `asyncRewake: true`，当脚本以退出码 2 结束时会唤醒 Claude。

### 几个实用 Hook 示例

**提交后自动推送：**

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Bash(git commit *)",
        "hooks": [
          {
            "type": "command",
            "command": "git push"
          }
        ]
      }
    ]
  }
}
```

**写文件后自动用 [Prettier](https://prettier.io) 格式化：**

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "prettier --write \"$CLAUDE_TOOL_INPUT_FILE_PATH\""
          }
        ]
      }
    ]
  }
}
```

**会话结束后记录日志：**

```json
{
  "hooks": {
    "SessionEnd": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "echo \"$(date): session ended\" >> ~/.claude/session.log"
          }
        ]
      }
    ]
  }
}
```

### PreToolUse 拦截机制

PreToolUse Hook 最强大的能力是**程序化拦截操作**。Hook 脚本从 stdin 读取 JSON 上下文，然后通过 stdout 输出决策。

Hook 收到的 stdin JSON 大致长这样：

```json
{
  "session_id": "abc123",
  "cwd": "/path/to/project",
  "hook_event_name": "PreToolUse",
  "tool_name": "Bash",
  "tool_input": { "command": "rm -rf ~/Documents" }
}
```

你的脚本可以输出一个 `hookSpecificOutput` 来控制 Claude Code 的行为：

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "危险命令被 Hook 拦截"
  }
}
```

`permissionDecision` 有四个选项：
- `"allow"`：自动批准，不弹确认框
- `"deny"`：直接拒绝
- `"ask"`：弹确认框让用户决定
- `"defer"`：交给正常的权限流程处理

**deny 优先级最高**：如果多个 Hook 同时生效，只要有一个返回 deny，操作就会被拦截。即使在 `--dangerously-skip-permissions` 模式下，Hook 的 deny 决策仍然生效——那个参数跳过的只是交互式提示，不跳过 Hook。

写个完整的例子——用脚本拦截危险的删除命令：

```bash
#!/bin/bash
# .claude/hooks/block-rm.sh
COMMAND=$(jq -r '.tool_input.command' < /dev/stdin)

if echo "$COMMAND" | grep -q 'rm -rf'; then
  jq -n '{
    "hookSpecificOutput": {
      "hookEventName": "PreToolUse",
      "permissionDecision": "deny",
      "permissionDecisionReason": "rm -rf 命令已被 Hook 拦截"
    }
  }'
else
  exit 0
fi
```

对应的配置：

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "if": "Bash(rm *)",
            "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/block-rm.sh",
            "args": []
          }
        ]
      }
    ]
  }
}
```

### PermissionRequest 拦截

类似地，PermissionRequest Hook 可以在权限确认框出现时自动做出决策：

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PermissionRequest",
    "decision": {
      "behavior": "allow",
      "applyToAll": true
    }
  }
}
```

`applyToAll: true` 表示记住这个决定，以后相同的操作不再询问。

### 退出码的含义

| 退出码 | 行为 |
|-------|------|
| `0` | 成功，解析 stdout 中的 JSON |
| `2` | 阻断错误，stderr 显示给用户，操作被拦截 |
| `1` 或其他 | 非阻断错误，执行继续 |

### Hook 环境变量

Hook 脚本执行时可以用这些环境变量：

| 变量 | 说明 |
|------|------|
| `CLAUDE_PROJECT_DIR` | 当前项目根目录 |
| `CLAUDE_TOOL_NAME` | 正在执行的工具名称 |
| `CLAUDE_TOOL_INPUT_FILE_PATH` | 操作的文件路径（Write 操作时） |
| `CLAUDE_TOOL_INPUT_COMMAND` | 执行的命令（Bash 操作时） |
| `CLAUDE_PLUGIN_ROOT` | 插件安装目录（插件 Hook 中可用） |
| `CLAUDE_PLUGIN_DATA` | 插件持久数据目录 |
| `CLAUDE_ENV_FILE` | 用于持久化环境变量的文件路径（SessionStart、Setup、CwdChanged、FileChanged 中可用） |
| `CLAUDE_EFFORT` | 当前的 effort 级别 |

除了环境变量，Hook 还会通过 **stdin 接收完整的 JSON 上下文**，包含会话 ID、当前工作目录、权限模式、工具名称、工具输入参数等信息。这比环境变量能提供更丰富的上下文。

## 快捷键配置

Claude Code 支持自定义键盘快捷键。在会话中输入 `/keybindings` 可以创建或打开配置文件 `~/.claude/keybindings.json`。

默认快捷键包括：
- `Ctrl+C`：取消当前操作
- `Ctrl+R`：反向搜索历史
- `Ctrl+O`：打开会话记录查看器
- `Alt+T`：切换深度思考模式
- `Shift+Tab`：切换权限模式

### 配置格式

```json
{
  "$schema": "https://platform.claude.com/docs/schemas/claude-code/keybindings.json",
  "bindings": [
    {
      "context": "Chat",
      "bindings": {
        "ctrl+k ctrl+s": "chat:stash",
        "ctrl+shift+p": "chat:modelPicker",
        "ctrl+g": "chat:externalEditor"
      }
    },
    {
      "context": "Global",
      "bindings": {
        "ctrl+shift+t": "app:toggleTodos"
      }
    }
  ]
}
```

### Chord 绑定（多键序列）

用空格分隔多个按键组合就能创建 Chord 绑定：`ctrl+k ctrl+s` 表示先按 `Ctrl+K`，松开，再按 `Ctrl+S`。这给了你远比单键组合更大的快捷键空间，几百个组合都不会冲突。

### 注意事项

- `Ctrl+C` 和 `Ctrl+D` 是硬编码的，不能修改
- 修改配置文件后自动生效，不需要重启
- 每个绑定属于一个 context（如 Chat、Global、DiffViewer），同一个按键在不同 context 下可以做不同的事
- 如果开了 Vim 模式，快捷键和 Vim 模式独立工作——Vim 处理文本输入层面的操作，快捷键处理组件层面的操作
- 用 `/doctor` 可以检查快捷键配置有没有冲突

## 快速配置的推荐起点

对于大多数项目，这个配置是个不错的起点（放在 `.claude/settings.json`）：

```json
{
  "permissions": {
    "allow": [
      "Bash(git status)",
      "Bash(git diff *)",
      "Bash(git log *)",
      "Bash(ls *)",
      "Bash(find *)",
      "Bash(grep *)",
      "Bash(cat *)"
    ],
    "ask": [
      "Bash(git commit *)",
      "Bash(git push *)"
    ]
  },
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "cd \"$CLAUDE_PROJECT_DIR\" && pnpm lint --fix 2>/dev/null || true"
          }
        ]
      }
    ]
  }
}
```

然后在 `settings.local.json` 里放不提交的个人配置（如 API Token）。

## 小结

配置和 Hooks 是 Claude Code 和你的工作流深度集成的关键。六种权限模式让你在安全和效率之间找到合适的平衡点；`allow`/`deny`/`ask` 规则让你精细控制每个操作；Hooks 让你在 Claude Code 操作的几乎每个节点都能插入自定义逻辑——从简单的自动格式化到复杂的安全审查。花一小时配好这些，之后每天都能省时间。
