---
title: "evilsocket/audit：8 阶段自动化漏洞发现 Agent"
date: 2026-05-25
tags:
  - AI
  - Agent
  - 安全
  - 漏洞发现
  - Claude
summary: 基于 Claude Code Agent SDK 构建的 8 阶段自动化漏洞发现工具，灵感来自 Cloudflare Project Glasswing。多窄范围 Agent 并行扫描 + 对抗性验证 + 可达性追踪，用 Claude Pro/Max 订阅就能跑，无需额外 API Key。
---

# evilsocket/audit：8 阶段自动化漏洞发现 Agent

> 🔗 [GitHub 仓库](https://github.com/evilsocket/audit) | ⭐ 470+ Stars | 📄 MIT License

## 项目简介

`audit` 是一个 **8 阶段自动化漏洞发现 Agent**，基于 Anthropic 官方的 Claude Code Agent SDK 构建。最酷的是——**不需要额外的 API Key**，只要你是 Claude Pro 或 Max 订阅用户，用 `claude login` 登录就能直接运行。

这个项目是 Cloudflare [Project Glasswing](https://blog.cloudflare.com/cyber-frontier-models/) 博客文章中描述的漏洞发现流水线的**完整复现**。Cloudflare 在那篇文章中用 Anthropic 的 Mythos 预览模型测试了自家代码库，得出的核心观点是：

> 真正的漏洞发现不是让一个大模型「找找这里的 bug」，而是通过**多个窄范围 Agent 并行工作 + 对抗性验证 + 可达性追踪**的组合拳来实现的。

## 核心设计理念

### 1. 多个窄范围 Agent（Many Narrow Agents）

不是让一个 Agent 做所有事情，而是把任务拆得很细——每个 Hunt Agent 只负责**一个特定的攻击类型**，范围精确到「检查这个函数是否存在命令注入，信任边界在这里」。多个 Agent 并行工作，效率远超单个全能 Agent。

### 2. 故意的分歧（Deliberate Disagreement）

这是整个架构最精妙的设计。**第二个 Agent（Validate 阶段）的职责是「反驳」第一个 Agent 的发现**，而且它使用的是不同的模型（Hunt 用 Sonnet 4.6，Validate 用 Opus 4.7）。这种对抗性设计大幅减少了误报。

### 3. 可达性追踪（Reachability Trace）

很多「这段代码有 bug」的发现其实都是噪音——除非攻击者控制的输入**真的能从系统外部到达漏洞点**。Trace 阶段会证明（或证伪）这种可达性。

### 4. 反馈循环（Feedback Loop）

当发现一个可达的漏洞后，系统会自动生成新的 Hunt 任务，在代码库的其他地方搜索同类模式。这让漏洞发现具有**自我扩展**的能力。

## 8 个阶段详解

| 阶段 | 名称 | 默认模型 | 职责 |
|:---:|------|---------|------|
| 1 | **Recon** | Opus 4.7 | 映射仓库，生成窄范围的 Hunt 任务 |
| 2 | **Hunt** | Sonnet 4.6 | 每个 Agent 负责一个攻击类型；编译/运行 PoC |
| 3 | **Validate** | Opus 4.7 | 对抗性重读；尝试**反驳**发现（使用不同模型） |
| 4 | **Gapfill** | Sonnet 4.6 | 重新排队覆盖不足的区域 |
| 5 | **Dedupe** | Sonnet 4.6 | 按根因对发现进行聚类去重 |
| 6 | **Trace** | Opus 4.7 | 证明攻击者控制的输入能到达漏洞点 |
| 7 | **Feedback** | Sonnet 4.6 | 将可达的追踪转化为新的 Hunt 任务 |
| 8 | **Report** | Sonnet 4.6 | 生成 Schema 验证的结构化报告 |

每个阶段对应 `prompts/` 目录下的一个 Markdown 提示文件和 `schemas/` 目录下的一个 JSON Schema。编排器将 Schema 注入系统提示，确保每个输出在第一次尝试时就符合预期格式。

## 快速开始

### 安装

```bash
# 克隆仓库
git clone https://github.com/evilsocket/audit.git
cd audit

# 创建虚拟环境并安装
python -m venv .venv && source .venv/bin/activate
pip install -e .
```

### 认证

```bash
# 方式一：如果你已经 claude login 过，直接可用
# 方式二：生成一年有效的 OAuth Token（适合 CI 环境）
claude setup-token
echo "CLAUDE_CODE_OAUTH_TOKEN=***" > .env

# 验证认证状态
audit auth-check
```

### 运行

```bash
# 基本用法
audit run --repo /path/to/target --run-id my-run

# 查看状态
audit status --run-id my-run

# 生成报告
audit report --run-id my-run --format md > report.md
```

默认情况下，Agent 使用你的 **Claude.ai 订阅计费**，不会调用 Anthropic 的计量 API。

## 成本控制

一个真实的生产代码库可能产生 15-50 个 Hunt 任务和 25+ 个需要验证的发现。在默认并发度下，这可能会花费不少。项目提供了几个控制成本的参数：

```bash
audit run --repo /path/to/target \
  --max-concurrency 1 \        # 同时只运行一个 claude 子进程
  --max-recon-tasks 15 \       # 限制初始 Hunt 任务数量
  --max-cost-usd 30            # 超过预算自动终止
```

预算守护器会在阶段之间和阶段内部都触发检查——Hunt 阶段的每个任务都会协作性地中止，而不是在超限后还继续跑 30 个任务。

## 灵活的模型配置

### 使用 OpenRouter

如果你想用 OpenRouter 积分而不是 Anthropic 订阅：

```bash
export ANTHROPIC_BASE_URL="https://openrouter.ai/api"
export ANTHROPIC_AUTH_TOKEN="$OPENROUTESR_API_KEY"
export ANTHROPIC_API_KEY=""              # 必须清空
export ANTHROPIC_MODEL="anthropic/claude-sonnet-4-6"  # 可选，指定模型

audit auth-check  # 确认使用了 LLM 网关
audit run --repo /path/to/target --run-id orun --max-cost-usd 30
```

甚至可以用非 Claude 模型，比如 `openai/gpt-5`、`google/gemini-2.5-pro`、`qwen/qwen3-coder-480b` 等。不过非 Claude 模型的 Schema 合规性可能会稍差。

### 自定义网关

任何暴露 Anthropic Messages API 的代理都可以使用：

```bash
export ANTHROPIC_BASE_URL="https://your-proxy.example.com"
export ANTHROPIC_AUTH_TOKEN="***"
unset ANTHROPIC_API_KEY
```

## 高级功能

### 实时目标复现

如果目标有运行中的部署，可以指向它进行实时验证：

```bash
audit run --repo /path/to/target --run-id live \
  --target-url http://server.local:8888 \
  --target-creds email=admin@system.com \
  --target-creds password=changechangeme
```

当设置 `--target-url` 时：
- 网络出口限制为该主机 + `127.0.0.1`
- 无法在实时目标上复现的发现会被丢弃或拒绝
- 凭证会流入每个相关阶段的 user_input

### 范围说明

有些接口是设计上就比较宽松的（比如明文 API Key 是特性而不是 bug），可以通过 `--scope-notes` 参数排除：

```bash
audit run --repo /path/to/target --scope-notes target_scope.md
```

`target_scope.md` 示例：

```markdown
- Mailpit (port 1025) is test-only; ignore.
- Plaintext API keys in the database are a required feature.
- Don't flag rate-limit absence on anonymous /ping endpoints.
- Only consider critical/high severity.
```

### Git 历史挖掘

Recon 阶段会挖掘 git 历史，寻找过去的安全补丁（`CVE`、`sec:`、`fix.*auth`、`sanitize` 等）。已打补丁的文件是加固过的，但**使用相同模式的兄弟文件往往没有被加固**——系统会针对这些未打补丁的副本生成发现任务。

### 逻辑链

除了默认的「一个任务一个攻击类型」模式，Recon 还可以生成 `logic_chain` 任务，用于高影响的多组件路径（比如 auth-bypass + IDOR + path-traversal 组合成 RCE）。这是单攻击类型范围规则的唯一允许例外。

## 项目结构

```
audit/
├── prompts/          # 8 个阶段的提示词（Markdown，作为系统提示加载）
├── schemas/          # 9 个 JSON Schema（每个 Agent 输出都经过验证）
├── config/           # stages.yaml — 每个阶段的模型、并发、工具配置
├── audit/            # Python 包
│   ├── auth.py       # OAuth 检查 + ANTHROPIC_API_KEY 清理
│   ├── state.py      # SQLite DAO（运行、任务、发现、追踪、去重、成本）
│   ├── runner.py     # claude-agent-sdk 封装 + Schema 验证 + 修复轮次
│   ├── orchestrator.py  # 流水线驱动器
│   └── stages/       # 每个阶段一个模块
├── work/             # 每个 Hunt 任务的临时目录（PoC 编译/运行沙盒）
└── results/          # 每个阶段的 JSONL 产物 + 最终 report.json
```

## 安全注意事项

⚠️ Hunt Agent 拥有 Bash 权限，运行在每个任务的临时目录中，但**没有操作系统级别的沙盒**。在审计不受信任的代码库时，建议在一次性虚拟机或容器中运行——恶意构建脚本可能会在 PoC 编译期间在宿主机上执行。

## 总结

`audit` 是目前我见过的**最工程化的开源漏洞发现 Agent**。它的价值不仅在于能自动找漏洞，更在于它的架构设计：

1. **模块化流水线**：8 个阶段各司其职，可独立调优
2. **对抗性验证**：用不同模型互相质疑，大幅降低误报
3. **可达性追踪**：只报告真正可利用的漏洞
4. **反馈循环**：发现一个漏洞后自动扩展搜索
5. **零额外成本**：利用现有 Claude 订阅，无需额外 API Key

对于安全研究者来说，这是一个即拿即用的代码审计工具。对于 AI Agent 开发者来说，它的多 Agent 协作架构设计更是值得深入研究的参考实现。

---

*项目地址：https://github.com/evilsocket/audit*
*协议：MIT*
*基于 Cloudflare Project Glasswing 架构*
