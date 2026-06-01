---
title: "Anthropic 研发团队如何使用 Claude Code：从内部实践到工程方法论"
date: 2026-06-01
tags:
  - AI
  - Claude
  - Claude Code
  - Anthropic
  - 多代理
summary: 基于 Anthropic 官方工程博客和文档，拆解其研发团队实际使用 Claude Code 的方式：16 个并行 Agent 编写 C 编译器、三 Agent 架构开发全栈应用、Auto Mode 安全机制设计等真实案例。
---

# Anthropic 研发团队如何使用 Claude Code

Anthropic 不只是做了个 Claude Code 卖给你——他们自己的研发团队天天在用，而且用法比大多数用户激进得多。

本文基于 [Anthropic 工程博客](https://www.anthropic.com/engineering) 和 [官方文档](https://code.claude.com/docs/en/best-practices)，整理了他们内部的真实使用方式。

## 16 个并行 Agent 编写 C 编译器

这是 Anthropic 研究员 Nicholas Carlini 做的实验——用 16 个并行 Claude Agent，从零写一个能编译 Linux 内核的 C 编译器。

### 怎么做的

构建了一个 bash 循环脚本，让 Claude 在 Docker 容器中持续运行。每完成一个任务，自动领取下一个。多 Agent 通过 git 分布式协作——每个 Agent 在 `current_tasks/` 目录下用文件"锁"认领任务，完成后 pull/merge/push，冲突由 Claude 自行解决。

还设计了专业化分工：有的负责合并重复代码，有的优化性能，有的负责文档。

### 数据

| 指标 | 数值 |
|------|------|
| Claude Code 会话数 | 近 2,000 个 |
| 时间 | 两周 |
| 输入 token | 20 亿 |
| 输出 token | 1.4 亿 |
| 总成本 | 约 $20,000 |
| 产出代码 | 10 万行 |

### 成果

- 能编译 Linux 6.9（x86/ARM/RISC-V）
- 能编译 QEMU、FFmpeg、SQLite、PostgreSQL、Redis
- GCC torture 测试 99% 通过率
- 甚至能编译和运行 Doom

### 关键经验

Nicholas Carlini 总结了几条：

**编写高质量测试是关键。** Claude 会自主解决任何给定问题，如果验证器不准确，Claude 会解决错误的问题。你给它一个有 bug 的测试，它会"修好"测试而不是修好代码。

**站在 Claude 的角度思考。** 不要让日志输出几千字无用内容——那会污染上下文窗口。提供 `--fast` 快速模式，让 Claude 快速验证想法。

**让并行化变简单。** 用 GCC 作为在线参考编译器，随机编译内核文件，让不同 Agent 修复不同文件的 bug。

> "充分开发的自主开发令人兴奋，但不应盲目部署未经人工验证的软件。"
> — Nicholas Carlini, Anthropic Research

## 三 Agent 架构开发全栈应用

另一篇工程博客介绍了 Planner-Generator-Evaluator 三 Agent 架构——三个角色各司其职，互相制衡。

### 三个角色

**Planner Agent：** 把 1-4 句简单提示扩展为完整产品规格。有意不过度指定技术细节，避免错误级联。

**Generator Agent：** 按 Sprint（冲刺）逐个功能实现。使用 React+Vite+FastAPI+SQLite 技术栈，每个 Sprint 结束后自评。

**Evaluator Agent：** 使用 Playwright MCP 实际操作运行中的应用，像用户一样点击测试，发现真实 bug。

### 解决的核心问题

**上下文焦虑（Context Anxiety）：** 单 Agent 长时间运行时，上下文窗口被各种信息填满，Claude 开始"焦虑"——反复检查已经完成的工作，不敢推进新任务。三 Agent 架构通过分离职责解决了这个问题。

**自我评估偏差：** Agent 评价自己的工作时总是过于宽容。Evaluator 独立于 Generator，能发现深层 bug——比如 FastAPI 路由匹配错误、事件处理逻辑缺陷。

### 对比测试

同一个提示"制作复古游戏编辑器"：

| 模式 | 时间 | 成本 | 结果 |
|------|------|------|------|
| 单 Agent | 20 分钟 | $9 | 界面粗糙，核心游戏功能损坏 |
| 三 Agent 框架 | 6 小时 | $200 | 功能丰富，实际可玩，Evaluator 发现 27 个具体 bug |

### 关键经验

**将 Agent 拆分为不同角色。** 分离生成和评估，比让 Agent 评价自己的工作有效得多。

**为评估者设定严格的评审标准。** 明确权重——设计质量和原创性 > 工艺和功能性。

**框架中的每个组件都编码了模型局限性的假设。** 随着模型进步应定期重新评估是否仍需要。

## Auto Mode：安全地跳过权限审批

用户使用 Claude Code 时，93% 的权限提示都选择"批准"。这导致"审批疲劳"——点到第十次的时候，你已经不看了。

### 双层防御架构

**输入层（Prompt 注入探测器）：** 扫描工具输出，发现可疑内容时注入警告，引导 Agent 锚定用户真实意图。

**输出层（转录分类器，Sonnet 驱动）：** 分两阶段——Stage 1 快速单 token 过滤（允许/拒绝），Stage 2 仅对 Stage 1 标记的内容进行链式推理。

分类器只看到用户消息和 Agent 工具调用，剥离了 Agent 自身的消息和工具输出——防止 Agent 说服分类器。

### 数据

| 测试集 | 误报率 (FPR) | 漏报率 (FNR) |
|--------|-------------|-------------|
| 真实内部流量 10,000 条 | 0.4% | - |
| 真实过度行为 52 条 | - | 17% |
| 合成数据泄露任务 1,000 条 | - | 5.7% |

### 拦截的真实案例

- 范围升级（删除远程分支）
- 凭证探索
- Agent 推断参数
- 数据外泄
- 绕过安全检查

### 关键经验

Auto Mode 不是 `--dangerously-skip-permissions` 的简单替代。它适用于大部分安全但需自主执行的场景，高风险基础设施仍需人工审批。

## Managed Agents：解耦大脑与双手

这是 Anthropic 最新的架构思考——把 Agent 系统拆成三个独立组件。

### 三个组件

**大脑（Claude + Harness）：** 无状态，可水平扩展。

**双手（沙箱/工具）：** 容器变成"牲畜"（可随时替换），不再是"宠物"（不可丢失的个体）。

**会话日志：** 持久化的事件日志，Harness 可按需组织上下文。

### 设计哲学

借鉴了操作系统虚拟化硬件的思路——`read()` 不关心底层是 70 年代磁盘还是现代 SSD。Managed Agents 的接口保持稳定，实现可灵活替换。

### 数据

- p50 TTFT（首 token 延迟）下降约 60%
- p95 TTFT 下降超过 90%
- 容器故障时 Claude 可自动重试并初始化新容器

### 关键经验

**不要过度设计 Harness。** 每个组件都是对模型局限的假设，应随模型进步不断简化。

**安全性应通过结构性隔离保证。** 让凭证永远不可从沙箱访问——Git token 在初始化时绑定到远程仓库，MCP OAuth token 存在独立 Vault 中。

以上是工程博客的案例。Anthropic 还在官方文档中总结了一套通用方法论。

## 官方 Best Practices

除了这些工程博客，Anthropic 在 [Best Practices 文档](https://code.claude.com/docs/en/best-practices) 中也总结了团队的使用经验：

### 给 Claude 验证手段

> "给 Claude 一个能跑的检查：测试、构建、截图对比。这是'你盯着看的会话'和'你可以走开的会话'之间的区别。"

验证方式包括：
- 测试套件
- 构建退出码
- Linter
- 浏览器截图对比

### 先探索，再规划，再编码

1. **探索** — Plan Mode 下读文件、回答问题
2. **规划** — 创建详细实现方案
3. **实现** — 切换出 Plan Mode，按方案编码
4. **提交** — 写描述性 commit message，开 PR

### 管理上下文窗口

这是所有最佳实践的核心约束——上下文窗口填满后，性能急剧下降。

- 不相关任务之间用 `/clear` 重置
- 用子代理做调查，避免污染主上下文
- 两次纠正无效就 `/clear` 重来

### 对抗性审查

实现完成后，用子代理在新上下文中审查 diff，报告漏洞。因为审查者看不到实现过程的推理，只看到结果，所以能独立评判。

## 总结

Anthropic 内部使用 Claude Code 的核心思路：

1. **并行化是关键** — 16 个 Agent 两周写出 10 万行编译器代码
2. **分离职责** — Planner/Generator/Evaluator 各司其职
3. **验证优先** — 没有验证手段的自主运行是危险的
4. **结构性安全** — 通过隔离而非权限限制保证安全
5. **上下文管理** — 这是所有策略的核心约束
6. **不要过度设计** — Harness 编码了对模型局限的假设，模型进步后要简化

Anthropic 自己的团队就是这么用的——16 个 Agent 并行写编译器，三角色架构做全栈应用，分类器自动审批 93% 的操作。这就是 Claude Code 的真实打开方式。

---

**参考资料：**
- [Building a C compiler with a team of parallel Claudes](https://www.anthropic.com/engineering/building-c-compiler)
- [Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps)
- [How we built Claude Code auto mode](https://www.anthropic.com/engineering/claude-code-auto-mode)
- [Scaling Managed Agents](https://www.anthropic.com/engineering/managed-agents)
- [Best practices for Claude Code](https://code.claude.com/docs/en/best-practices)
