---
title: "第五章：配置与自动化"
date: 2026-05-11
tags:
  - AI
  - ClaudeCode
  - 进阶
  - 工程化
sort: 5
summary: 通过 settings.json 配置权限策略、默认模型和环境变量；通过 Hooks 在 Claude Code 操作前后自动执行脚本，实现工作流的全面自动化。
---

# 第五章：配置与自动化

Claude Code 的行为大部分都可以配置。这一章介绍配置文件的结构和 Hooks 机制——前者控制 Claude Code 能做什么，后者让你在它做事的前后插入自己的逻辑。

## 配置文件

Claude Code 的配置文件是 JSON 格式，有四个层级，从高到低：

| 层级 | 文件路径 | 说明 |
|------|---------|------|
| 托管策略 | 组织级，由管理员下发 | 最高优先级，不可覆盖 |
| 用户配置 | `~/.claude/settings.json` | 对所有项目生效 |
| 项目配置 | `.claude/settings.json` | 提交到 git，团队共享 |
| 本地配置 | `.claude/settings.local.json` | gitignore，个人本地 |

低层级的配置会被高层级覆盖。

## 权限配置

这是最常用的配置项。Claude Code 执行 Bash 命令或操作文件时会按权限规则决定：是自动执行、请求确认，还是直接拒绝。

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
- `ask`：每次都弹确认框（这是默认行为）

**格式说明：** `Bash(命令模式)` 支持 glob，`Read(路径)` 和 `Write(路径)` 控制文件访问。

**实用配置：让只读操作免于确认**

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

这样 Claude Code 在探索代码库时不会一直弹确认框，但写操作仍然需要你确认。

## 模型配置

```json
{
  "model": "claude-sonnet-4-6"
}
```

可选值：
- `claude-opus-4-7`：最强，适合复杂架构任务，消耗 token 最多
- `claude-sonnet-4-6`：默认，综合性价比最好
- `claude-haiku-4-5-20251001`：最快最省，适合简单任务

也可以在会话中用 `/model` 命令临时切换。

## 其他配置

```json
{
  "env": {
    "CLAUDE_CODE_ENABLE_TELEMETRY": "1"
  },
  "alwaysThinkingEnabled": true,
  "defaultMode": "acceptEdits"
}
```

- `alwaysThinkingEnabled`：开启"深度思考"模式，处理复杂问题更准确，但更慢
- `defaultMode`：`"acceptEdits"` 让文件编辑类操作自动接受，减少确认次数

## MCP 服务器配置

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

Token 等敏感信息建议放在 `.claude/settings.local.json` 里，避免提交到 git。更多 MCP 服务器的配置方式见 [MCP 官方文档](https://modelcontextprotocol.io/docs)。

## Hooks：在操作前后插入逻辑

Hooks 是 Claude Code 最强大的自动化机制。你可以在它执行某类操作时，自动触发你的脚本。

### Hook 触发时机

| 事件 | 触发时机 |
|------|---------|
| `SessionStart` | 每次会话开始时，触发一次 |
| `SessionEnd` | 每次会话结束时，触发一次 |
| `UserPromptSubmit` | 你提交每条消息前 |
| `PreToolUse` | Claude Code 执行每个工具调用之前 |
| `PostToolUse` | Claude Code 执行每个工具调用之后 |
| `Stop` | Claude Code 完成一轮回复后 |
| `FileChanged` | 指定文件变化时 |

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

- `"Write"`：所有文件写操作
- `"Bash"`：所有 Bash 命令执行
- `"Bash(git commit *)"`：只匹配 git commit 命令
- `""`（空字符串）：匹配所有操作

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

**阻止删除操作（安全保护）：**

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash(rm -rf *)",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Blocked: rm -rf is not allowed' && exit 1"
          }
        ]
      }
    ]
  }
}
```

Hook 的命令如果返回非零退出码，Claude Code 会收到错误信息，并可以根据错误调整行为。

### Hook 环境变量

Hook 脚本执行时有以下环境变量可用：

| 变量 | 说明 |
|------|------|
| `CLAUDE_PROJECT_DIR` | 当前项目根目录 |
| `CLAUDE_TOOL_NAME` | 正在执行的工具名称 |
| `CLAUDE_TOOL_INPUT_FILE_PATH` | 操作的文件路径（Write 操作时） |
| `CLAUDE_TOOL_INPUT_COMMAND` | 执行的命令（Bash 操作时） |

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

配置和 Hooks 是 Claude Code 和你的工作流深度集成的关键。合理的权限配置减少不必要的确认弹窗，Hooks 让你把"每次都要手动做的事"变成自动的。花一小时配置好这些，之后每天都能省时间。
