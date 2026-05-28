---
title: "Hermes Agent vs OpenClaw：两款开源 AI Agent 全面对比"
date: 2026-05-28
tags:
  - AI Agent
  - 开源工具
  - Hermes
  - OpenClaw
summary: 从架构、模型支持、工具系统、消息平台、部署方式等维度，基于官方文档和 GitHub 仓库对比 Hermes Agent 与 OpenClaw 两款开源 AI Agent。
---

Hermes Agent 和 OpenClaw 是目前开源 AI Agent 领域最受关注的两个项目。两者都定位为"自主式 AI 助手"，都支持多平台消息交互、工具调用、定时任务，但在技术架构、核心理念和生态规模上有明显差异。

这篇文章基于两个项目的 GitHub 仓库、官方文档进行对比，尽量做到有据可查。

## 项目背景

**Hermes Agent** 由 [Nous Research](https://nousresearch.com) 开发，核心卖点是"自我进化的 Agent"——它会从使用中学习，自动创建和改进技能（Skills），并在跨会话之间保持记忆。GitHub 仓库：[NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent)（170k stars, 28.5k forks）。

**OpenClaw** 由奥地利开发者 Peter Steinberger 创建，前身经历了 Clawdbot → Moltbot → OpenClaw 三次更名。2025 年 11 月首次发布，是 GitHub 历史上增长最快的开源项目之一。GitHub 仓库：[openclaw/openclaw](https://github.com/openclaw/openclaw)（375k+ stars, 78.2k forks, 53k+ commits）。Peter Steinberger 于 2026 年 2 月加入 OpenAI，项目随后由非营利基金会接管。

两个项目都采用 **MIT 许可证**，完全开源，用户自备 API Key。

## 技术栈对比

| 维度 | Hermes Agent | OpenClaw |
|------|-------------|----------|
| 主要语言 | Python | TypeScript + Swift |
| 运行时 | Python 3.10+ | Node.js 24（推荐）/ 22.19+ |
| 安装方式 | `curl` 安装脚本 | `npm install -g openclaw@latest` |
| 平台支持 | Linux, macOS, WSL2, Android/Termux | macOS, Linux, Windows(WSL2), iOS, Android |

语言选择的差异会直接影响插件开发生态：Hermes 的技能和插件用 Python 写，OpenClaw 的用 TypeScript 写。对开发者来说，选哪个可能取决于你更熟悉哪个语言。

## 模型支持

**Hermes Agent** 采用 provider-agnostic 设计，通过 `hermes model` 命令切换模型，支持：
- Nous Portal（官方订阅服务，捆绑 300+ 模型）
- OpenRouter（200+ 模型）
- NovitaAI, NVIDIA NIM (Nemotron), Xiaomi MiMo, z.ai/GLM, Kimi/Moonshot, MiniMax, Hugging Face
- OpenAI 及任意自定义 endpoint

**OpenClaw** 同样支持多模型，主要包括：
- Anthropic Claude
- OpenAI GPT 系列
- DeepSeek
- Google Gemini（2.5 Pro, Flash, Flash-Lite）
- 内置模型故障转移和 profile 轮换

两者都不锁定特定模型提供商。Hermes 在模型数量上覆盖面更广（尤其通过 OpenRouter 和 Nous Portal），OpenClaw 在主流模型的切换体验上更简洁。

## 工具系统

这是两个项目差异最大的地方之一。

**Hermes Agent** 内置 70+ 工具，采用 toolset 分组机制：
- 终端/Shell 操作
- Web 搜索（Firecrawl）
- 图片生成（FAL）
- 文字转语音
- 云浏览器（Browser Use）
- 文件操作、代码执行
- **MCP（Model Context Protocol）集成**——可以连接外部 MCP 工具服务器
- **子 Agent 委派**——支持并行启动多个隔离的子 Agent 处理独立任务

**OpenClaw** 的工具系统围绕 Skills 构建：
- Skills 存储为目录 + `SKILL.md` 元数据文件
- ClawHub 社区技能注册表（13K+ 技能）
- 浏览器自动化
- **Live Canvas**（A2UI 可视化工作区）——Agent 驱动的实时可视化界面
- Cron 定时任务
- 支持 per-workspace 技能覆盖

Hermes 的 MCP 集成意味着它可以接入任何兼容 MCP 标准的外部工具，扩展性更强。OpenClaw 的 ClawHub 生态规模更大（13K+ 技能 vs Hermes 的技能系统更偏向 Agent 自主创建）。

## 消息平台支持

**Hermes Agent**：Telegram, Discord, Slack, WhatsApp, Signal, Email, Home Assistant——通过单一 Gateway 进程统一管理。

**OpenClaw** 支持 24+ 个平台：WhatsApp, Telegram, Slack, Discord, Google Chat, Signal, iMessage, IRC, Microsoft Teams, Matrix, Feishu, LINE, Mattermost, Nextcloud Talk, Nostr, Synology Chat, Tlon, Twitch, Zalo, WeChat, QQ, WebChat 等。

在消息平台覆盖面上，OpenClaw 明显更广。特别是对国内用户来说，OpenClaw 原生支持微信和 QQ，而 Hermes 目前通过 iLink 等第三方桥接方案实现微信接入。

## 部署方式

**Hermes Agent** 提供 6 种终端后端：
- **Local**——本机直接运行
- **Docker**
- **SSH**——连接远程服务器
- **Singularity**
- **Modal**——Serverless，环境休眠/按需唤醒
- **Daytona**——类似 Modal 的 Serverless 方案

核心设计理念是"不绑定笔记本"——可以部署在云 VM 上，通过 Telegram 等消息平台远程控制。

**OpenClaw** 主要采用：
- 本机 Daemon 模式（launchd/systemd 用户服务）
- Docker 部署
- Nix 支持
- VPS 部署指南

Hermes 的 Modal/Daytona Serverless 方案是一个独特优势——闲置时自动休眠，有请求时唤醒，成本更低。

## 独特功能

### Hermes Agent 的差异化能力

1. **自进化技能系统**：Agent 在完成复杂任务后会自动创建可复用的技能，并在后续使用中持续改进。这不是预设的模板，而是 Agent 自己总结出来的操作流程。

2. **跨会话记忆**：基于 FTS5 全文搜索的会话记忆系统，配合 LLM 摘要，可以在历史对话中检索相关信息。还有 Honcho 用户建模，随时间构建用户画像。

3. **子 Agent 并行化**：可以启动多个隔离的子 Agent 并行处理独立任务，适合需要分而治之的复杂场景。

4. **研究就绪**：支持批量轨迹生成和压缩，用于训练下一代工具调用模型。

### OpenClaw 的差异化能力

1. **语音唤醒 + 对话模式**：macOS/iOS 支持唤醒词，Android 支持持续语音交互（ElevenLabs + 系统 TTS）。

2. **Live Canvas**：Agent 驱动的实时可视化工作区，可以直接在画布上展示和操作内容。

3. **伴侣应用**：macOS 菜单栏应用 + iOS/Android 原生节点，提供原生桌面/移动端体验。

4. **DM 配对安全机制**：未知发送者需要配对码验证，公共 DM 需要显式 opt-in。

5. **多 Agent 路由**：可以将不同的渠道/账户/对等方路由到隔离的 Agent，每个 Agent 有独立会话。

## 生态规模

| 指标 | Hermes Agent | OpenClaw |
|------|-------------|----------|
| GitHub Stars | 170k | 375k+ |
| GitHub Forks | 28.5k | 78.2k |
| Commits | 9,724 | 53k+ |
| 技能/插件生态 | Agent 自主创建 + agentskills.io 标准 | ClawHub 13K+ 社区技能 |
| 消息平台 | 7 个 | 24+ 个 |

OpenClaw 在社区规模上占据明显优势。但 Hermes 的技能系统更强调"Agent 自己学"，而不是依赖社区贡献。

## 安全性

OpenClaw 在安全方面收到过更多关注——Cisco 研究团队发现了恶意第三方技能的风险，以及 prompt injection 攻击的可能性。2026 年 3 月，中国政府限制了 OpenClaw 在政府机构中的使用。

Hermes Agent 相对来说安全讨论较少，但这可能是因为社区规模较小、关注度较低，不代表安全性更好或更差。

## 迁移路径

Hermes Agent 提供了从 OpenClaw 的自动迁移工具：`hermes claw migrate`。这说明两个项目之间有一定的兼容性，也暗示 Hermes 可能在某些方面参考了 OpenClaw 的设计。

## 优缺点对比

### Hermes Agent

**优点：**

1. **Agent 自进化能力强**：这是 Hermes 最核心的差异化。完成复杂任务后自动创建技能，后续使用中持续改进，不需要用户手动编写或从市场安装。用得越多，Agent 越懂你的工作方式。

2. **跨会话记忆系统成熟**：FTS5 全文搜索 + LLM 摘要的组合，加上 Honcho 用户建模，让 Agent 能在历史对话中精准检索信息。不是简单的"记住上下文"，而是主动构建用户画像。

3. **MCP 标准支持**：通过 Model Context Protocol 接入外部工具服务器，这意味着只要工具兼容 MCP 标准，就能无缝集成，不需要为每个工具写适配代码。

4. **Serverless 部署方案**：Modal 和 Daytone 后端让 Agent 可以按需运行，闲置时自动休眠，对成本敏感的用户很友好。跑在 $5 VPS 上就能用。

5. **Provider 切换无摩擦**：`hermes model` 一条命令切换模型提供商，不需要改配置文件或代码。通过 OpenRouter 覆盖 200+ 模型，避免被单一供应商锁定。

6. **子 Agent 并行化**：可以同时启动多个隔离的子 Agent 处理独立任务，适合需要分而治之的复杂工作流。

**缺点：**

1. **社区规模较小**：170k stars 虽然不少，但和 OpenClaw 的 375k+ 相比差距明显。社区技能数量也远少于 ClawHub 的 13K+。

2. **消息平台覆盖有限**：原生只支持 7 个平台，缺少微信、QQ、iMessage、Teams 等国内和企业常用平台的原生支持。微信需要通过第三方桥接方案实现。

3. **移动端体验弱**：没有原生 iOS/Android 应用，移动交互主要依赖消息平台，缺少桌面端那样的 TUI 体验。

4. **学习曲线较陡**：自进化技能系统、记忆管理、profile 系统等概念对新用户来说需要时间理解。配置项也比较多。

5. **Python 依赖管理**：Python 生态的依赖冲突问题是老生常谈，安装时可能遇到版本兼容问题。

---

### OpenClaw

**优点：**

1. **社区生态庞大**：375k+ stars、78k+ forks、ClawHub 13K+ 技能——这是目前开源 AI Agent 领域最大的社区。遇到问题更容易找到解决方案，现成的技能也更多。

2. **消息平台覆盖最广**：24+ 个平台原生支持，包括微信、QQ、iMessage、Teams、Matrix 等。对国内用户来说，原生微信/QQ 支持是很大的加分项。

3. **原生伴侣应用**：macOS 菜单栏应用 + iOS/Android 原生节点，提供了比纯消息交互更好的桌面/移动端体验。

4. **语音交互成熟**：唤醒词支持（macOS/iOS）+ 持续语音对话（Android），配合 ElevenLabs TTS，语音体验比 Hermes 更完整。

5. **Live Canvas**：Agent 驱动的实时可视化工作区，可以把 Agent 的输出直接渲染成可交互的界面，不只是纯文本回复。

6. **多 Agent 路由**：不同渠道/账户可以路由到不同 Agent，每个 Agent 有独立会话和配置，适合多场景并行使用。

7. **TypeScript 生态**：对前端开发者来说更友好，npm 安装即用，Node.js 生态的包管理也更成熟。

**缺点：**

1. **安全争议较多**：Cisco 研究团队发现过恶意第三方技能的风险，prompt injection 攻击面较大。2026 年 3 月中国政府限制了其在政府机构的使用。虽然项目方在持续修复，但安全阴影短期内难以消除。

2. **缺少自进化能力**：技能主要依赖社区贡献和用户手动安装，Agent 不会自动从使用中学习和创建技能。记忆系统相对基础。

3. **无 MCP 标准支持**：工具扩展主要依赖 ClawHub 技能生态，没有采用开放的 MCP 标准，存在一定封闭性。

4. **创始人离开**：Peter Steinberger 于 2026 年 2 月加入 OpenAI，项目转由非营利基金会管理。虽然项目仍在活跃开发，但核心人物离开对长期发展的影响有待观察。

5. **依赖 Node.js 运行时**：需要 Node.js 24（推荐），对服务器环境有一定要求。相比 Python，Node.js 在某些 VPS 上的内存占用更高。

6. **模型故障转移机制有局限**：虽然支持模型故障转移和 profile 轮换，但切换模型时可能需要调整技能兼容性，不如 Hermes 的 provider-agnostic 设计灵活。

---

## 选哪个？

- 如果你看重 **Agent 自主学习能力**、**跨会话记忆**、**MCP 标准扩展**，以及 Python 生态——选 Hermes Agent
- 如果你看重 **更大的社区生态**、**更多消息平台支持**（特别是微信/QQ）、**语音交互**、**原生伴侣应用**——选 OpenClaw
- 如果你想用 **Serverless 部署**（Modal/Daytona）——Hermes Agent 独有
- 如果你想要 **Live Canvas 可视化工作区**——OpenClaw 独有

两个项目都在快速迭代，功能差距可能很快缩小。建议关注各自的 GitHub 仓库和文档，以获取最新信息。

## 信息来源

- [Hermes Agent GitHub 仓库](https://github.com/NousResearch/hermes-agent)
- [Hermes Agent 官方文档](https://hermes-agent.nousresearch.com/docs)
- [OpenClaw GitHub 仓库](https://github.com/openclaw/openclaw)
- [OpenClaw 官方网站](https://openclaw.ai)
- [OpenClaw Wikipedia 页面](https://en.wikipedia.org/wiki/OpenClaw)
