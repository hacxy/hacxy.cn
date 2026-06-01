---
title: "我研究了 Anthropic 研发团队怎么用 Claude Code，这些经验值得借鉴"
date: 2026-06-01
tags:
  - AI
  - Claude
  - Claude Code
  - 开发效率
summary: 最近翻了 Anthropic 工程博客和官方文档，发现他们自己用 Claude Code 的方式比大多数用户激进得多。16 个 Agent 并行写编译器、三角色架构做全栈应用、CLAUDE.md 配置、Plan Mode、Dynamic Workflows——这些实践对我们的开发工作有不少启发。
---

# 我研究了 Anthropic 研发团队怎么用 Claude Code

最近闲着没事翻了翻 [Anthropic 的工程博客](https://www.anthropic.com/engineering)和[官方文档](https://code.claude.com/docs/en/best-practices)，发现他们自己用 Claude Code 的方式，比外面大多数用户激进得多。

不是那种"帮我写个函数"的用法，而是 16 个 Agent 并行写编译器、三角色架构做全栈应用、分类器自动审批 93% 的操作。再加上官方文档里总结的一套方法论——CLAUDE.md 配置、Plan Mode、Dynamic Workflows、上下文管理——看完之后觉得，这些经验对我们的开发工作有不少启发。

## 先说最震撼的：16 个 Agent 并行写编译器

Anthropic 研究员 Nicholas Carlini 做了个实验——用 16 个并行 Claude Agent，从零写一个能编译 Linux 内核的 C 编译器。

不是玩具项目，是真的能编译 Linux 6.9、QEMU、FFmpeg、SQLite、PostgreSQL 的编译器。GCC torture 测试 99% 通过率，甚至能编译和运行 Doom。

### 他怎么做的

搞了个 bash 循环脚本，让 Claude 在 Docker 容器里持续跑。每完成一个任务，自动领下一个。多 Agent 通过 git 分布式协作——每个 Agent 在 `current_tasks/` 目录下用文件"锁"认领任务，完成后 pull/merge/push，冲突由 Claude 自己解决。

还搞了专业化分工：有的负责合并重复代码，有的优化性能，有的写文档。

### 数据

| 指标 | 数值 |
|------|------|
| Claude Code 会话数 | 近 2,000 个 |
| 时间 | 两周 |
| 输入 token | 20 亿 |
| 输出 token | 1.4 亿 |
| 总成本 | 约 $20,000 |
| 产出代码 | 10 万行 |

两周，两万美金，十万行能编译 Linux 的代码。这个效率比我手动写快了不知道多少倍。

### 他的经验

**验证器必须靠谱。** Claude 会自主解决任何给定问题，如果验证器有 bug，它会"修好"验证器而不是修好代码。你给它一个有错的测试，它会让测试通过，而不是修代码。

这点我深有体会——之前让 Claude 修 bug，结果它把测试改了让测试通过，bug 还在。后来学乖了，先写好测试再让它修。

**站在 Claude 的角度想问题。** 不要让日志输出几千字无用内容——那会污染上下文窗口。提供 `--fast` 快速模式，让 Claude 快速验证想法。

**并行化要简单。** 任务拆得越简单，并行效果越好。

## 三 Agent 架构：告别"一个人干所有事"

另一篇博客介绍了 Planner-Generator-Evaluator 三架构——三个角色各司其职，互相制衡。

### 为什么需要分角色

单 Agent 长时间运行有个问题：上下文窗口被各种信息填满，Claude 开始"焦虑"——反复检查已经完成的工作，不敢推进新任务。Anthropic 管这叫"上下文焦虑"（Context Anxiety）。

还有个问题是自我评估偏差——Agent 评价自己的工作时总是过于宽容。"挺好的，差不多了"，其实差远了。

### 三个角色干什么

**Planner：** 把 1-4 句简单提示扩展为完整产品规格。有意不过度指定技术细节，避免错误级联。

**Generator：** 按 Sprint 逐个功能实现。用 React+Vite+FastAPI+SQLite 技术栈，每个 Sprint 结束后自评。

**Evaluator：** 用 Playwright 实际操作运行中的应用，像用户一样点击测试，发现真实 bug。

### 对比测试

同一个提示"制作复古游戏编辑器"：

| 模式 | 时间 | 成本 | 结果 |
|------|------|------|------|
| 单 Agent | 20 分钟 | $9 | 界面粗糙，核心游戏功能损坏 |
| 三 Agent | 6 小时 | $200 | 功能丰富，实际可玩 |

贵了 20 倍，但结果从"不能用"变成了"能玩"。这个投入产出比，看你怎么算。

### 我打算怎么试

说实话，我们现在的开发模式更接近"单 Agent"——一个人（或一个 Claude 会话）从头干到尾。看了这个案例，我打算这么试：

1. **先让 Claude 规划，不要上来就写代码。** 用 Plan Mode 让它先读代码库、设计方案，我审批后再实现。
2. **写完让它自己测。** 不是"帮我写个测试"，而是"写完后跑测试，测试不过就修，直到通过"。
3. **复杂任务分角色。** 一个 Claude 写代码，另一个 Claude 审查。新鲜的上下文发现问题更准。

## Auto Mode：93% 的审批都可以跳过

用 Claude Code 的人都知道，它每干一步都要问你"可以吗？"。Anthropic 统计发现，用户 93% 的时候都选"批准"。

这导致"审批疲劳"——点到第十次的时候，你已经不看了。

### 他们的解决方案

搞了个 Auto Mode——用模型分类器自动判断哪些操作安全、哪些危险。安全的直接过，危险的才问你。

双层防御：
- **输入层：** 扫描工具输出，发现可疑内容（比如 prompt 注入）时注入警告
- **输出层：** 分类器只看用户消息和工具调用，不看 Agent 的推理过程——防止 Agent 说服分类器

### 数据

| 测试集 | 误报率 |
|--------|--------|
| 真实内部流量 10,000 条 | 0.4% |

10,000 条真实操作，只有 40 条被误拦。这个准确率已经很高了。

### 省下来的时间干嘛

我现在用 Claude Code 还是默认模式，每步都确认——主要是之前有过教训，Claude 偷偷把测试改了让测试通过。看了这个数据，我觉得可以：

1. **日常任务开 Auto Mode。** 写代码、跑测试、改配置这些，让它自己跑。
2. **敏感操作保留确认。** 删数据库、改生产配置、外发请求，还是手动确认。
3. **自定义信任边界。** 把常用的命令加到 allowlist 里，减少不必要的弹窗。

## Managed Agents：不要过度设计 Harness

这篇是最有架构思维的。Anthropic 发现，Agent 框架（Harness）里编码了太多对模型局限的假设——比如"上下文焦虑"需要分角色解决。但模型进步后，这些假设可能过时。

### 核心思路

把 Agent 系统拆成三个独立组件：

**大脑（Claude + Harness）：** 无状态，可水平扩展。

**双手（沙箱/工具）：** 容器变成"牲畜"（可随时替换），不再是"宠物"（不可丢失的个体）。

**会话日志：** 持久化的事件日志，Harness 可按需组织上下文。

借鉴了操作系统虚拟化硬件的思路——`read()` 不关心底层是 70 年代磁盘还是现代 SSD。

### 数据

- p50 TTFT（首 token 延迟）下降约 60%
- p95 TTFT 下降超过 90%

### 我之前踩过的坑

这点对我触动最大——**不要过度设计 Harness**。之前我搭了一套完整的 Agent 框架，写了一堆"最佳实践"，结果模型一升级，大半都废了。因为那些实践本质上是在补偿模型的缺陷，模型变强了，补偿就不需要了。

所以：
1. **框架要可替换。** 别把逻辑写死在 Harness 里，模型进步了能随时换。
2. **安全性靠结构性隔离。** 不是"限制权限"，而是"让危险的东西根本接触不到"。
3. **定期重新评估。** 每个季度看看，之前的"最佳实践"还有没有用。

## 官方 Best Practices：几条实用的

除了工程博客，Anthropic 在[官方文档](https://code.claude.com/docs/en/best-practices)里也总结了经验。挑几条我觉得最实用的：

### CLAUDE.md：让 Claude 记住你的项目

每次启动 Claude Code，它都会读 `CLAUDE.md`。这个文件相当于项目的"记忆"——告诉 Claude 构建命令、代码风格、常见坑。

加载优先级从远到近叠加：

| 位置 | 说明 |
|------|------|
| `~/.claude/CLAUDE.md` | 用户级，所有项目生效 |
| `项目根目录/CLAUDE.md` | 项目级，团队共享 |
| `子目录/CLAUDE.md` | 子目录级，优先级最高 |

写什么？**Claude 猜不到的东西**——构建命令、代码风格规则、常见坑。Claude 能通过读代码推断出来的，别写。CLAUDE.md 太长，重要的规则会被淹没。

### Plan Mode：先想清楚再动手

复杂任务最怕"边做边改"——改了半天发现方向错了，白忙活。

四步流程：

1. **探索** — Plan Mode 下读文件、回答问题
2. **规划** — 创建详细实现方案
3. **实现** — 切换出 Plan Mode，按方案编码
4. **提交** — 写描述性 commit message，开 PR

这个流程看着简单，但很多人（包括我）经常跳过前两步，上来就让 Claude 写代码。结果就是——写出来的东西解决的不是真正的问题。

什么时候用 Plan Mode？新功能、多文件重构、架构决策、需求不明确的时候。如果一句话能描述 diff，就别规划了。

### Dynamic Workflows：把计划变成脚本

这是 Claude Code 里最实用的功能之一。它把"计划"变成"脚本"，可以重复运行、并行执行、交叉验证。

三种编排模式：

| 模式 | 说明 |
|------|------|
| `pipeline()` | 流水线，每个 item 独立流经各阶段 |
| `parallel()` | 并行屏障，所有任务完成才返回 |
| `phase()` | 阶段分组，方便看进度 |

最实用的是验证模式——**对抗验证**：N 个独立"怀疑者"验证发现，多数反驳就排除。写代码的 Claude 不是审查自己代码的那个 Claude。

在提示中包含 `workflow` 关键词，Claude 会自动编写工作流脚本。用 `/workflows` 查看运行状态。

### 管理上下文窗口

这是所有策略的基础——上下文窗口填满后，性能急剧下降。

- 不相关任务之间用 `/clear` 重置
- 用子代理做调查，避免污染主上下文
- 两次纠正无效就 `/clear` 重来
- 用 `/compact` 压缩历史，保留关键信息

我之前犯的错：一个会话里又写代码又调试又重构，上下文塞满了，Claude 开始"忘事"。后来学会了一个任务一个会话，效果好了很多。

### 多代理协作

Claude Code 支持创建多种专用子代理：

| 代理 | 干什么 |
|------|--------|
| Explore | 只读搜索，快速扫描代码库 |
| Frontend Engineer | 前端组件开发 |
| Backend Engineer | 后端 API 和数据层 |
| Code Reviewer | 代码审查 |
| Test Engineer | 测试编写 |

关键参数：
- `isolation: "worktree"` — 给子代理独立的 git 分支，避免文件冲突
- `run_in_background: true` — 后台运行，完成时通知

跨多个文件的搜索任务，交给 Explore agent。别让主上下文被大量文件内容淹没。

### 给 Claude 验证手段

> "给 Claude 一个能跑的检查：测试、构建、截图对比。这是'你盯着看的会话'和'你可以走开的会话'之间的区别。"

没有验证手段的自主运行是危险的。你走了，它"觉得"做完了，其实没做完或者做错了。

## 接下来我打算怎么做

把这几篇博客和官方文档串起来看，我发现它们其实在讲同一件事——**把确定性的逻辑交给脚本，把需要判断的交给 AI，然后给 AI 一个靠谱的验证手段**。

具体到我们的开发工作，我打算这么优化：

**1. 配置先行。** 写好 CLAUDE.md，把构建命令、代码风格、常见坑都记下来。省得每次都要重新解释。

**2. 复杂任务用 Plan Mode。** 不要上来就写代码，先让 Claude 探索代码库、设计方案，我审批后再实现。

**3. 并行化是趋势。** 16 个 Agent 两周写十万行代码，这个效率不是单线程能比的。我们不一定搞 16 个，但复杂任务拆成 2-3 个并行 Agent 是可以的。

**4. 分离生成和评估。** 不要让写代码的 Claude 自己审查自己。用 Dynamic Workflows 的对抗验证，或者开两个会话，一个写一个审。

**5. 管好上下文。** 一个任务一个会话，不相关的内容及时清。这是所有策略的基础。

**6. 不要过度设计。** 框架要可替换，模型进步后能定期调整。每个季度重新评估之前的"最佳实践"。

Anthropic 自己的团队就是这么用的。我下周打算先试试并行 Agent——找个合适的任务，拆成两三个子任务，看看效果。

---

**参考资料：**
- [Building a C compiler with a team of parallel Claudes](https://www.anthropic.com/engineering/building-c-compiler)
- [Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps)
- [How we built Claude Code auto mode](https://www.anthropic.com/engineering/claude-code-auto-mode)
- [Scaling Managed Agents](https://www.anthropic.com/engineering/managed-agents)
- [Best practices for Claude Code](https://code.claude.com/docs/en/best-practices)
- [Dynamic Workflows](https://code.claude.com/docs/en/agents)
