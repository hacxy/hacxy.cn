---
title: "evilsocket/audit：8 阶段自动化漏洞发现 Agent"
date: 2026-05-25
tags:
  - AI
  - Agent
  - 安全
  - 漏洞发现
  - Claude
  - OpenRouter
summary: 基于 Claude Code Agent SDK 构建的 8 阶段自动化漏洞发现工具，灵感来自 Cloudflare Project Glasswing。多窄范围 Agent 并行扫描 + 对抗性验证 + 可达性追踪，用 Claude Pro/Max 订阅就能跑，无需额外 API Key。
---

# evilsocket/audit：8 阶段自动化漏洞发现 Agent

> 🔗 [GitHub 仓库](https://github.com/evilsocket/audit) | ⭐ 470+ Stars | 📄 MIT License

上周刷 GitHub Trending 的时候看到 [evilsocket/audit](https://github.com/evilsocket/audit)，眼前一亮。

它做的事情很简单：**用多个 AI Agent 自动找代码里的安全漏洞**。做法相当工程化——不是让一个大模型「把这段代码看一遍，告诉我有没有 bug」，而是搞了一套 8 阶段的流水线，每个阶段一个 Agent，互相验证、互相质疑。

灵感来自 Cloudflare 的 [Project Glasswing](https://blog.cloudflare.com/cyber-frontier-models/) 博客文章。Cloudflare 用 Anthropic 的 Mythos 预览模型测试了自家代码库，得出一个结论：

> 真正的漏洞发现不是靠一个全能 Agent，而是靠多个窄范围 Agent 的协作。

## 为什么不用一个大模型直接找？

这个问题我也想过。让 Claude 读一遍代码，说「这里有个 SQL 注入」，不就行了？

Cloudflare 的实验发现，这样做有几个问题：

1. **范围太大，容易漏**。一个 Agent 同时关注所有攻击面，注意力分散，很多细微的漏洞会被忽略。
2. **误报率高**。模型倾向于「宁可错杀」，很多「漏洞」其实根本不可利用。
3. **没有验证机制**。模型说「这里有 bug」，你就信了？万一它理解错了呢？

所以 audit 的设计思路是：**把任务拆细，让每个 Agent 只关注一个攻击类型，然后用另一个 Agent 来反驳它**。

## 8 个阶段，各司其职

| 阶段 | 名称 | 默认模型 | 职责 |
|:---:|------|---------|------|
| 1 | **Recon** | Opus 4.7 | 映射仓库，生成窄范围的 Hunt 任务 |
| 2 | **Hunt** | Sonnet 4.6 | 每个 Agent 负责一个攻击类型；编译/运行 PoC |
| 3 | **Validate** | Opus 4.7 | 对抗性重读；尝试**反驳**发现 |
| 4 | **Gapfill** | Sonnet 4.6 | 重新排队覆盖不足的区域 |
| 5 | **Dedupe** | Sonnet 4.6 | 按根因对发现进行聚类去重 |
| 6 | **Trace** | Opus 4.7 | 证明攻击者控制的输入能到达漏洞点 |
| 7 | **Feedback** | Sonnet 4.6 | 将可达的追踪转化为新的 Hunt 任务 |
| 8 | **Report** | Sonnet 4.6 | 生成 Schema 验证的结构化报告 |

几个值得注意的设计：

**Hunt 阶段的窄范围规则**：每个 Hunt Agent 只负责一个攻击类型。比如一个 Agent 专门找命令注入，另一个专门找路径遍历。这就像让专家各管一摊，比让一个通才看所有东西可靠得多。

**Validate 阶段的对抗性设计**：这是整个架构最精妙的地方。第二个 Agent 的职责是**反驳**第一个 Agent 的发现。而且它用的是不同的模型（Hunt 用 Sonnet 4.6，Validate 用 Opus 4.7）。这种「故意的分歧」大幅减少了误报。

**Trace 阶段的可达性验证**：很多「这段代码有 bug」的发现其实都是噪音——除非攻击者控制的输入**真的能从系统外部到达漏洞点**。Trace 阶段会证明（或证伪）这种可达性。

## 快速开始

```bash
# 克隆仓库
git clone https://github.com/evilsocket/audit.git
cd audit

# 创建虚拟环境并安装
python -m venv .venv && source .venv/bin/activate
pip install -e .

# 认证（二选一）
# 方式一：如果你已经 claude login 过，直接可用
# 方式二：生成一年有效的 OAuth Token（适合 CI）
claude setup-token
echo "CLAUDE_CODE_OAUTH_TOKEN=***" > .env

# 验证认证状态
audit auth-check

# 运行
audit run --repo /path/to/target --run-id my-run
audit status --run-id my-run
audit report --run-id my-run --format md > report.md
```

## 成本控制

默认情况下，Agent 使用你的 **Claude.ai 订阅计费**，不会调用 Anthropic 的计量 API。

一个真实的生产代码库可能产生 15-50 个 Hunt 任务和 25+ 个需要验证的发现。在默认并发度下，这可能会花费不少。

项目提供了几个控制成本的参数：

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
export ANTHROPIC_AUTH_TOKEN="$OPENROUTER_API_KEY"
export ANTHROPIC_API_KEY=""              # 必须清空
export ANTHROPIC_MODEL="anthropic/claude-sonnet-4-6"

audit auth-check
audit run --repo /path/to/target --run-id orun --max-cost-usd 30
```

甚至可以用非 Claude 模型，比如 `openai/gpt-5`、`google/gemini-2.5-pro`、`qwen/qwen3-coder-480b` 等。不过非 Claude 模型的 Schema 合规性可能会稍差。

### 自定义网关

任何暴露 [Anthropic Messages API](https://docs.anthropic.com/en/api/messages) 的代理都可以使用：

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

这个设计挺聪明的。很多安全漏洞都是「改了 A，忘了 B」导致的。

### 逻辑链

除了默认的「一个任务一个攻击类型」模式，Recon 还可以生成 `logic_chain` 任务，用于高影响的多组件路径（比如 auth-bypass + IDOR + path-traversal 组合成 RCE）。这是窄范围规则的唯一例外。

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

这个坑我踩过，很疼。有一次审计一个第三方库，它的 `setup.py` 里藏了一段恶意代码，直接执行了。幸好我当时是在 Docker 容器里跑的，不然就中招了。

**教训：永远在隔离环境里跑不受信任的代码。**

## 我的看法

`audit` 是目前我见过的**最工程化的开源漏洞发现 Agent**。

说实话，我觉得这种「多窄范围 Agent + 对抗性验证」的思路，不仅适用于安全领域，很多需要高准确性的 AI 应用都可以借鉴。比如代码审查、文档生成、测试用例设计……都可以用类似的架构来减少误报、提高质量。

对于安全研究者来说，这是个即拿即用的代码审计工具。对于 AI Agent 开发者来说，它的多 Agent 协作架构设计值得深入研究。

---

*项目地址：https://github.com/evilsocket/audit*
*协议：MIT*
*基于 [Cloudflare Project Glasswing](https://blog.cloudflare.com/cyber-frontier-models/) 架构*
