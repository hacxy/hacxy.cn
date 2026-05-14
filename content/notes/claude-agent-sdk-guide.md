---
title: "Claude Agent SDK 入门：从概念到构建你的第一个 AI Agent"
date: 2026-05-14
tags:
  - AI
  - Agent
  - Claude
  - Anthropic
summary: 从"什么是 Agent"讲起，理清 Anthropic 的三套工具（Client SDK、Agent SDK、Claude Code CLI）各自的定位，然后手把手用 Agent SDK 构建一个能读代码、查问题、写报告的项目分析 Agent。
---

# Claude Agent SDK 入门

Anthropic 围绕 Claude 搞了好几套开发工具，名字还长得像：Client SDK、Agent SDK、Claude Code CLI……第一次接触容易晕。

其实它们解决的问题完全不同。下面先理清概念，再动手写一个真正能跑的 Agent。

## 什么是 Agent

先说说"Agent"到底是什么——这个词被用滥了，每个人理解的不一样。

最简单的 AI 应用是"一问一答"：你给 Claude 一段话，它回你一段话，结束。这就像给一个聪明人打电话问问题——能聊，但他做不了任何事。

Agent 不一样。Agent 是一个能**自主行动**的 AI 系统：你给它一个目标，它自己决定要做什么、用什么工具、按什么顺序来完成。它会读文件、跑命令、搜索代码、修改代码，遇到问题还会调整策略——这个循环一直跑到任务完成。

- 普通 AI 对话 = 你问路人"这附近有什么好吃的？"，他告诉你一个地名
- Agent = 你跟一个助理说"帮我订今晚的餐厅"，他自己搜餐厅、比价、打电话预约、把确认信息发给你

Agent 的核心就是那个自主循环——思考、行动、观察结果、再思考。

## Client SDK、Agent SDK、Claude Code CLI 的区别

Anthropic 的三套工具对应三个抽象层次：

<img src="/images/claude-agent-sdk/sdk-layers.svg" alt="Client SDK、Agent SDK、Claude Code CLI 三层架构" width="100%" style="max-width:560px" />

### Client SDK — "我只要 API"

[Anthropic Client SDK](https://platform.claude.com/docs/en/api/client-sdks) 是最底层的 API 客户端库。支持 Python、TypeScript、Java、Go、Ruby、C#、PHP。

它的职责很简单：帮你调 [Messages API](https://platform.claude.com/docs/en/api/messages)，发消息、收回复。如果你想用它做 Agent，得自己写工具执行逻辑和循环控制：

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// 一问一答，很简单
const message = await client.messages.create({
  model: "claude-opus-4-7",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Hello, Claude" }],
});

// 但要做 Agent？你得自己管这个循环：
// 定义工具 → Claude 决定调哪个 → 你执行 → 结果喂回去 → 再来一轮……
```

说白了：Client SDK 只负责帮你跟 Claude 通信，其他全是你的事。

### Agent SDK — "帮我跑 Agent"

[Claude Agent SDK](https://code.claude.com/docs/en/agent-sdk/overview) 完全不一样——它不只是 API 客户端，它是一个完整的 Agent 运行时。目前支持 Python 和 TypeScript。

你给它一个目标和允许的工具列表，它自己跑起来：读文件、执行命令、搜代码、改文件……直到任务完成。工具执行、循环管理、上下文维护——全帮你做了。

### Claude Code CLI — "我自己就是用户"

[Claude Code](https://claude.ai/code) 是 Anthropic 基于 Agent SDK 做的终端产品——你在命令行里用自然语言跟它对话，它直接帮你干活。底层能力和 Agent SDK 完全一致。

CLI 是给人用的，Agent SDK 是给程序用的。

### 对比总览

| | Client SDK | Agent SDK | Claude Code CLI |
|------|-----------|-----------|----------------|
| 定位 | API 客户端 | Agent 运行时 | 终端 Agent 应用 |
| 工具执行 | 你自己实现 | SDK 内置 | 内置 |
| Agent 循环 | 你自己写 | SDK 管理 | 内置 |
| 支持语言 | Python/TS/Java/Go/Ruby/C#/PHP | Python/TypeScript | N/A（命令行） |
| 构建 Agent 的门槛 | 高（自己写循环） | 低 | 最低（开箱即用） |

怎么选？简单说，想在自己的代码里跑 Agent，用 Agent SDK；只想调 API 自己控制一切，用 Client SDK；不想写代码直接用，那就 Claude Code CLI。

---

## 动手：用 Agent SDK 构建你的第一个 Agent

概念讲完了，来动手。我们要做一个"项目分析 Agent"——给它一个代码目录，它自动分析项目结构、找出潜在问题、生成一份分析报告。

### 第一步：装环境

```bash
npm install @anthropic-ai/claude-agent-sdk
```

设好 API Key：

```bash
export ANTHROPIC_API_KEY="sk-..."
```

就这样。TypeScript 版的 SDK 会自动下载 Claude Code 的 native binary，不用额外装什么。

### 第二步：最小 Agent — 几行能跑

先确认环境通了：

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "What files are in this directory?",
  options: { allowedTools: ["Bash", "Glob"] },
})) {
  if ("result" in message) console.log(message.result);
}
```

跑一下，如果能看到当前目录的文件列表，说明一切正常。

这里有两个关键参数：
- `prompt` — 你想让 Agent 做什么
- `allowedTools` — Agent 可以使用哪些工具

Agent SDK 内置了这些工具：

| 工具 | 功能 |
|------|------|
| Read | 读取文件内容 |
| Write | 创建新文件 |
| Edit | 精确编辑现有文件 |
| Bash | 执行终端命令 |
| Glob | 按模式查找文件 |
| Grep | 用正则搜索文件内容 |
| WebSearch | 搜索网页 |
| WebFetch | 抓取网页内容 |

你不用实现这些工具——SDK 全帮你做好了，你只需要告诉它"可以用哪些"。

### 第三步：加点肉 — 项目分析 Agent

现在做个真正有用的东西。这个 Agent 会扫描项目、分析结构、生成报告：

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

const projectPath = ".";

for await (const message of query({
  prompt: `分析 ${projectPath} 这个项目，生成一份结构化的分析报告，包含：
1. 项目概况：用了什么技术栈、框架、包管理器
2. 目录结构：主要目录和文件的用途
3. 代码质量观察：有没有明显的问题
4. 改进建议：2-3 条具体可执行的建议
报告写成 Markdown 格式，保存到 ${projectPath}/ANALYSIS.md`,
  options: {
    allowedTools: ["Read", "Glob", "Grep", "Bash", "Write"],
    permissionMode: "acceptEdits",
  },
})) {
  if (message.type === "assistant" && message.message?.content) {
    for (const block of message.message.content) {
      if ("text" in block) console.log(block.text);
      if ("name" in block) console.log(`  → 使用工具: ${block.name}`);
    }
  } else if ("result" in message) {
    console.log("\n✓ 分析完成");
  }
}
```

跑起来之后你会看到 Claude 的思考过程：它先用 Glob 找文件、用 Read 读配置和代码、用 Grep 搜索特定模式，最后用 Write 把报告写入文件。

`permissionMode: "acceptEdits"` 让它创建报告文件时不用逐个问你——在自动化场景下这很重要。

### 第四步：处理消息流 — 做个漂亮的输出

上面的例子只是简单 log，实际项目里你肯定想更精细地处理消息。Agent SDK 返回的消息有好几种类型：

<img src="/images/claude-agent-sdk/message-flow.svg" alt="Agent SDK 消息流：SystemMessage → AssistantMessage（循环）→ ResultMessage" width="100%" style="max-width:560px" />

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

let sessionId: string | undefined;

for await (const message of query({
  prompt: "检查当前项目的 package.json，列出所有过时的依赖",
  options: { allowedTools: ["Read", "Glob", "Bash"] },
})) {
  if (message.type === "system" && message.subtype === "init") {
    sessionId = message.session_id;
    console.log(`Session: ${sessionId}`);
  } else if (message.type === "assistant" && message.message?.content) {
    for (const block of message.message.content) {
      if ("text" in block) console.log(block.text);
      if ("name" in block) console.log(`  [Tool] ${block.name}`);
    }
  } else if ("result" in message) {
    console.log(`\nResult: ${message.result}`);
  }
}
```

- `system` + `init` — 系统级消息，session 初始化。拿到 `session_id` 就能在后续 query 里恢复上下文
- `assistant` — Claude 的输出，包含文本推理和工具调用
- `result` — 最终结果

### 第五步：多轮对话 — Session

上一步你已经看到 system 消息里能拿到 `session_id`——这个 ID 是实现多轮对话的关键。Agent 跑完一轮，你想追问？用 session 把上下文串起来：

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

let sessionId: string | undefined;

// 第一轮：分析项目
for await (const message of query({
  prompt: "Read the project structure and tell me what this project does",
  options: { allowedTools: ["Read", "Glob", "Grep"] },
})) {
  if (message.type === "system" && message.subtype === "init") {
    sessionId = message.session_id;
  }
  if ("result" in message) {
    console.log(`第一轮: ${message.result}`);
  }
}

// 第二轮：基于第一轮的上下文追问
for await (const message of query({
  prompt: "Based on what you just read, what are the top 3 areas that need improvement?",
  options: { resume: sessionId },
})) {
  if ("result" in message) {
    console.log(`第二轮: ${message.result}`);
  }
}
```

`resume: sessionId` 让第二轮继承了第一轮的全部上下文——Claude 记得它读过的所有文件和分析结果。

### 第六步：加自定义工具 — MCP

内置工具不够用？你可以通过 [MCP（Model Context Protocol）](https://modelcontextprotocol.io/) 协议接入自定义工具。比如给 Agent 加个查天气的能力：

```typescript
import { query, tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

const weatherServer = createSdkMcpServer({
  name: "weather",
  version: "1.0.0",
  tools: [
    tool(
      "check_weather",
      "查询城市天气",
      { city: z.string().describe("城市名称") },
      async (args) => {
        // 简化示例：经纬度写死为杭州，实际应根据 city 参数做地理编码
        const res = await fetch(
          "https://api.open-meteo.com/v1/forecast?latitude=30.25&longitude=120.17&current=temperature_2m"
        );
        const data = await res.json();
        return {
          content: [{
            type: "text",
            text: `${args.city}当前气温: ${data.current.temperature_2m}°C`,
          }],
        };
      }
    ),
  ],
});

for await (const message of query({
  prompt: "杭州现在多少度？",
  options: {
    mcpServers: { weather: weatherServer },
    allowedTools: ["mcp__weather__check_weather"],
  },
})) {
  if ("result" in message) console.log(message.result);
}
```

`tool()` 函数定义了工具的名称、描述、参数 schema（用 Zod）和执行逻辑。`createSdkMcpServer` 把它封装成一个 MCP 服务，Agent 就能调用了。

工具名在 `allowedTools` 里的格式是 `mcp__<服务名>__<工具名>`。

### 第七步：Hooks — 给 Agent 加监控

Agent 在自己跑的时候，你有时候想插手——记个日志、拦截危险操作、或者收集指标。Hooks 就是干这个的：

```typescript
import { query, HookCallback } from "@anthropic-ai/claude-agent-sdk";
import { appendFile } from "fs/promises";

const auditLog: HookCallback = async (input) => {
  const toolName = (input as any).tool_name ?? "unknown";
  await appendFile("./agent_audit.log", `[${new Date().toISOString()}] tool=${toolName}\n`);
  return {};
};

const blockRm: HookCallback = async (input) => {
  const command = (input as any).tool_input?.command ?? "";
  if (command.includes("rm -rf")) {
    return { decision: "deny", message: "不允许执行 rm -rf" };
  }
  return {};
};

for await (const message of query({
  prompt: "Clean up temporary files in this project",
  options: {
    allowedTools: ["Bash", "Glob", "Read"],
    hooks: {
      PostToolUse: [{ matcher: ".*", hooks: [auditLog] }],
      PreToolUse: [{ matcher: "Bash", hooks: [blockRm] }],
    },
  },
})) {
  if ("result" in message) console.log(message.result);
}
```

两个 hook 在干两件事：
- `PostToolUse` + `auditLog`：每次工具调用完，写一行日志
- `PreToolUse` + `blockRm`：Bash 工具调用前检查命令，如果是 `rm -rf` 直接拒绝

这在生产环境里很有用——不用砍掉 Agent 的能力，但危险操作拦得住、每步操作查得到。

### 第八步：Sub-agent — 分工协作

大任务拆给多个专门的 Agent 做：

<img src="/images/claude-agent-sdk/sub-agents.svg" alt="Sub-agent 协作：主 Agent 分发任务给 code-reviewer 和 security-scanner" width="100%" style="max-width:560px" />

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "对这个项目做一次全面检查：先做代码审查，再做安全扫描",
  options: {
    allowedTools: ["Read", "Glob", "Grep", "Agent"],
    agents: {
      "code-reviewer": {
        description: "代码质量审查专家",
        prompt: "审查代码质量，找出坏味道、重复代码、类型安全问题。",
        tools: ["Read", "Glob", "Grep"],
      },
      "security-scanner": {
        description: "安全漏洞扫描专家",
        prompt: "扫描代码中的安全风险：硬编码密钥、注入漏洞、不安全的依赖。",
        tools: ["Read", "Glob", "Grep", "Bash"],
      },
    },
  },
})) {
  if ("result" in message) console.log(message.result);
}
```

主 Agent 拿到任务后，会自己判断什么时候该派活给 `code-reviewer`、什么时候该用 `security-scanner`。注意 `allowedTools` 里要加上 `"Agent"` 才能启用 sub-agent 能力。

### 第九步：使用 Skills — 复用能力模块

如果你在 Claude Code CLI 里积累了一些 [Skills](https://code.claude.com/docs/en/skills)（`.claude/skills/*/SKILL.md`），Agent SDK 可以直接加载它们。

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "帮我写一篇关于 React Server Components 的博客",
  options: {
    cwd: "/path/to/my-blog",
    settingSources: ["user", "project"],
    skills: "all",
    allowedTools: ["Read", "Write", "Bash", "Glob", "Grep", "WebSearch"],
  },
})) {
  if ("result" in message) console.log(message.result);
}
```

这里有几个要点：

- `settingSources: ["user", "project"]` — 告诉 SDK 从文件系统加载配置，包括 Skills。不设这个，Skills 不会被发现
- `skills: "all"` — 启用所有发现的 Skill。也可以只启用指定的：`skills: ["write-post", "find-docs"]`
- `cwd` — 工作目录，SDK 会从这个目录的 `.claude/skills/` 以及所有父级目录一直到仓库根目录去扫描 Skills

有个容易误解的地方：**你不能在代码里"主动调用"某个 Skill**。Skills 是由 Claude 自主判断是否触发的——你的 prompt 匹配到 Skill 描述里的关键词时，Claude 会自动加载并使用它。`skills` 选项只控制"哪些 Skill 对 Claude 可见"，不是"调用哪个 Skill"。

如果发现 Skill 没被触发，检查两件事：一是 `settingSources` 是否包含了 `"project"`；二是 Skill 的 `description` 字段是否覆盖了你 prompt 中的关键词。

---

## Agent SDK 的运行机制和部署

到这里你可能会想：Agent SDK 到底是怎么跑的？我要部署到服务器上，需要装 Claude Code 吗？

### 它不是纯 API 客户端

这一点很关键——Agent SDK 跟 Client SDK 有本质区别。Client SDK 是纯 HTTP 客户端，只管发请求收响应。Agent SDK 不一样，它在你的机器上跑了一个 Claude Code 的 native binary，所有工具（Read、Write、Bash 等）都在本地执行。

npm 安装的时候，SDK 会自动下载对应平台的 binary 作为 optional dependency，不需要你单独装 Claude Code CLI。但这也意味着：

- Bash 命令跑在你的服务器上
- Read/Write 操作的是你服务器的文件系统
- 部署时要注意平台架构匹配（Linux x64、ARM 等）

### 生产部署怎么选

如果你要做一个面向用户的 Agent 服务，需要认真考虑安全隔离问题——Agent 能跑任意 Bash 命令，直接放在生产服务器上跑是有风险的。

Anthropic 提供了另一个方案：[Managed Agents](https://platform.claude.com/docs/en/managed-agents/overview)，一套托管式的 REST API。

| | Agent SDK | Managed Agents |
|------|-----------|---------------|
| 运行位置 | 你的服务器 | Anthropic 托管的沙箱 |
| 接口 | TypeScript / Python 库 | REST API |
| 工具执行 | 在你的基础设施上 | 在隔离的沙箱里 |
| 自定义工具 | 本地函数 | Claude 触发 → 你执行 → 返回结果 |
| 适合场景 | 本地开发、CI/CD、内部工具 | 面向用户的产品、长期运行的任务 |

一个常见的路径：先用 Agent SDK 在本地快速验证想法，跑通之后迁移到 Managed Agents 做生产部署。

---

## 安装和认证汇总

| | 安装 | 认证 |
|------|------|------|
| Client SDK | `npm install @anthropic-ai/sdk` | `ANTHROPIC_API_KEY` |
| Agent SDK | `npm install @anthropic-ai/claude-agent-sdk` | `ANTHROPIC_API_KEY` |
| Claude Code CLI | `npm install -g @anthropic-ai/claude-code` | 首次运行引导登录 |

Agent SDK 还支持 [Amazon Bedrock](https://code.claude.com/docs/en/amazon-bedrock)、[Google Vertex AI](https://code.claude.com/docs/en/google-vertex-ai)、[Microsoft Azure](https://code.claude.com/docs/en/microsoft-foundry) 等平台。订阅计划用户从 2026 年 6 月 15 日起有独立的 [Agent SDK 额度](https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan)，不占用交互式用量。

## 从 Client SDK 迁移

如果你已经在用 Client SDK 写 Agent 了，迁移过来不难——把自己写的工具执行和循环管理删掉就行：

```typescript
// 之前：Client SDK，自己管循环
// 定义工具 schema、写 executor、管 messages 数组、处理 tool_result……
// 几十行循环代码

// 现在：Agent SDK
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "Fix the bug in auth.ts",
  options: { allowedTools: ["Read", "Edit", "Bash"] },
})) {
  console.log(message);
}
```

你之前手写的 `readFile`、`writeFile`、`runCommand` 这些工具？Agent SDK 内置了更成熟的版本，直接用就行。

## 接下来

- [Agent SDK 官方文档](https://code.claude.com/docs/en/agent-sdk/overview) — 完整 API 参考
- [Quickstart](https://code.claude.com/docs/en/agent-sdk/quickstart) — 官方入门教程
- [示例 Agents](https://github.com/anthropics/claude-agent-sdk-demos) — 邮件助手、研究 Agent 等实际案例
- [Python SDK GitHub](https://github.com/anthropics/claude-agent-sdk-python) / [TypeScript SDK GitHub](https://github.com/anthropics/claude-agent-sdk-typescript)
