---
title: "Anthropic 团队如何使用 Claude Code：官方最佳实践深度解析"
date: 2026-06-01
tags:
  - AI
  - Claude
  - Claude Code
  - 最佳实践
summary: 基于 Anthropic 官方文档，深入解析 Claude Code 的核心使用方法：CLAUDE.md 配置、多代理架构、Dynamic Workflows、Plan Mode 等，帮开发者掌握 AI 编程工具的正确打开方式。
---

# Anthropic 团队如何使用 Claude Code

Claude Code 不只是"能写代码的 AI"。Anthropic 的产品研发团队日常就用它干活，踩了不少坑，也攒了不少经验。

本文基于 [Anthropic 官方文档](https://code.claude.com/docs/en/best-practices)，把这些经验整理出来。不是官方文档的复读，是我理解后重新组织的。

## CLAUDE.md：让 Claude 记住你的项目

每次启动 Claude Code，它都会读一个叫 `CLAUDE.md` 的文件。这个文件相当于项目的"记忆"——告诉 Claude 构建命令、代码风格、常见坑。

没这个文件，Claude 每次都要重新理解你的项目。有了它，能省不少事。

### 加载优先级

Claude Code 按层级加载 CLAUDE.md，**越靠近当前目录优先级越高**：

| 位置 | 说明 |
|------|------|
| `~/.claude/CLAUDE.md` | 用户级，所有项目生效 |
| `~/.claude/projects/<路径>/CLAUDE.md` | 项目级用户配置 |
| `项目根目录/CLAUDE.md` | 项目级，团队共享 |
| `子目录/CLAUDE.md` | 子目录级，特定模块规则 |

同名指令冲突时，更近的覆盖更远的。

<img src="/images/claude-code-best-practices/claude-md-levels.svg" alt="CLAUDE.md 加载层级示意图" width="100%" style="max-width:560px" />

### 写什么

```markdown
# 构建与测试
- 构建：`npm run build`
- 测试：`npm test`
- Lint：`npm run lint`

# 代码风格
- TypeScript strict 模式
- 组件用函数式写法
- 测试放 __tests__/ 目录

# 坑
- 改 src/config/ 前先确认环境变量
- API 路由变更要同步更新 docs/api.md
```

说白了，就是把"只有老员工才知道的那些事"写下来。

## Plan Mode：先想清楚再动手

复杂任务最怕"边做边改"——改了半天发现方向错了，白忙活。Plan Mode 就是解决这个问题的。

### 怎么触发

- 直接输入 `/plan`
- 或者说"先规划一下"，Claude 会自动进入

### 流程

1. Claude 进入计划模式，先探索代码库（读文件、搜代码）
2. 设计实现方案
3. 写出计划供你审批
4. 你批准后，才开始改代码

<img src="/images/claude-code-best-practices/plan-mode-flow.svg" alt="Plan Mode 流程图" width="100%" style="max-width:560px" />

适合的场景：新功能、多文件重构、架构决策、需求不明确的时候。

## 多代理：让 AI 组队干活

单个 Claude 干活有局限——上下文窗口就那么大，塞太多信息容易"忘事"。多代理就是把任务拆开，让多个 Claude 各干各的。

### 内置代理类型

| 代理 | 干什么 |
|------|--------|
| Explore | 只读搜索，快速扫描代码库 |
| Frontend Engineer | 前端组件开发 |
| Backend Engineer | 后端 API 和数据层 |
| Code Reviewer | 代码审查 |
| Test Engineer | 测试编写 |
| Plan | 软件架构设计 |

### 怎么创建子代理

```
Agent({
  description: "搜索所有 API 路由",
  prompt: "找到所有 Express 路由定义",
  subagent_type: "Explore"
})
```

关键参数：
- `isolation: "worktree"` — 给子代理独立的 git 分支（[git worktree](https://git-scm.com/docs/git-worktree)），多个代理同时改代码时不会冲突，最后合并
- `run_in_background: true` — 后台运行，完成时通知

## Dynamic Workflows：大规模编排

Dynamic Workflows 是 Claude Code 里最实用的功能之一。它把"计划"变成"脚本"，可以重复运行、并行执行、交叉验证。

### 为什么用它

- **可重复** — 脚本保存后随时再跑
- **并行** — 最多 16 个代理同时干活
- **可验证** — 用独立代理交叉检查发现
- **可控** — 不同阶段可以用不同模型

<img src="/images/claude-code-best-practices/dynamic-workflows.svg" alt="Dynamic Workflows 三种编排模式" width="100%" style="max-width:560px" />

### 编排模式

| 模式 | 说明 |
|------|------|
| `pipeline()` | 流水线，每个 item 独立流经各阶段 |
| `parallel()` | 并行屏障，所有任务完成才返回 |
| `phase()` | 阶段分组，方便看进度 |

### 验证模式

这是最实用的部分：

- **对抗验证**：N 个独立"怀疑者"验证发现，多数反驳就排除
- **多视角验证**：从正确性、安全、性能等不同角度审查
- **循环搜索**：持续搜索直到连续 N 轮无新发现

### 使用方式

在提示中包含 `workflow` 关键词，Claude 会自动编写工作流脚本：

```
Run a workflow to audit every API endpoint...
```

用 `/workflows` 查看运行状态。

### 保存工作流

运行中按 `s` 可以保存脚本：
- 项目级：`.claude/workflows/`
- 用户级：`~/.claude/workflows/`

## 工具使用原则

前面说了怎么用多代理，这里补一些日常使用的细节。

### 专用工具优先

| 场景 | 用这个 | 别用这个 |
|------|--------|----------|
| 搜索代码 | `Grep` | `grep` 命令 |
| 读文件 | `Read` | `cat` 命令 |
| 找文件 | `Glob` | `find` 命令 |

专用工具输出更结构化，不会被 shell 环境影响。

### 并行调用

独立操作尽量并行。同时读 3 个文件？调用 3 次 Read，别一个一个来。

### 委托给子代理

跨多个文件的搜索，交给 Explore agent。别让主上下文被大量文件内容淹没。

## 权限模式

Claude Code 有三种权限模式：

| 模式 | 说明 |
|------|------|
| Default | 每次工具调用都需要确认 |
| Auto-accept | 自动批准所有操作 |
| Plan Mode | 只读探索（详见前文） |

配置文件：
- `~/.claude/settings.json` — 用户级
- `.claude/settings.json` — 项目级
- `allowedTools` — 允许自动执行的工具
- `blockedTools` — 禁止使用的工具

## 成本控制

Claude Code 用起来不贵不便宜，看你怎么花。

### 模型选择

- 日常用 Sonnet（性价比高）
- 复杂推理用 Opus（能力强但贵）

在 `/model` 里切换。

### 工作流成本

Dynamic Workflows 可能消耗大量 token。建议：
- 不需要强模型的阶段用便宜的模型
- 大规模运行前先小规模测试

### 禁用工作流

不需要的话可以关掉：
- `/config` 切换
- `settings.json` 设 `"disableWorkflows": true`
- 环境变量 `CLAUDE_CODE_DISABLE_WORKFLOWS=1`

## 写在最后

Anthropic 团队用 Claude Code 的套路，说穿了就这几条：

1. **配置先行** — CLAUDE.md 建立项目知识库
2. **规划优先** — 复杂任务先 Plan Mode
3. **合理分工** — 多代理协作，各司其职
4. **脚本化** — 确定性逻辑提取为工作流
5. **安全意识** — 破坏性操作必须确认
6. **成本控制** — 日常 Sonnet，大活 Opus，别乱烧

说到底，Claude Code 就是个带脑子的工具，怎么用取决于你。

---

**参考资料：**
- [Claude Code Best Practices](https://code.claude.com/docs/en/best-practices)
- [Agents and Parallel Work](https://code.claude.com/docs/en/agents)
- [Claude Code Overview](https://code.claude.com/docs/en/overview)
