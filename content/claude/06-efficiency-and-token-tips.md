---
title: "第六章：效率技巧与 Token 节省"
date: 2026-05-12
tags:
  - AI
  - ClaudeCode
  - 进阶
  - 经验总结
sort: 6
summary: 从提示词写法、上下文管理、任务拆分到工作流设计，全面介绍在节省 token 的同时最大化 Claude Code 输出质量的实践技巧。
---

# 第六章：效率技巧与 Token 节省

用 Claude Code 一段时间后，你会发现同样的任务，不同的做法差距很大。有些方式能让它快速给出准确的结果，有些则反复来回、消耗大量 token 却得不到好结果。

这一章是实战经验的总结，写的都是我觉得真正有用的东西。

## 提示词：具体比通用好十倍

最常见的问题是指令太模糊。Claude Code 不会拒绝模糊的指令，但它会做出"最合理的猜测"，而那个猜测往往不是你想要的。

**差的写法：**
```
帮我优化一下这个项目
```

**好的写法：**
```
src/api/user.ts 里的 getUserList 函数有 N+1 查询问题。
当前逻辑是在循环里逐个查用户的 profile，导致 N 次额外查询。
请改成用 profileIds 批量查询，然后在内存里关联，不要改函数签名。
```

好的指令包含三个要素：
1. **在哪**：具体的文件和函数
2. **有什么问题**：当前状态的具体描述
3. **要做什么**：期望结果和约束条件

### 给 Claude Code 提供验证手段

"告诉它怎么验证是否成功"，这会让结果好很多：

```
帮我重构 parseConfig 函数，确保 src/utils/__tests__/parseConfig.test.ts 里的所有测试都能通过
```

它知道有测试可以跑，会自动跑测试验证，而不是改完就交差。

```
帮我修复首页加载慢的问题，修复后在 Chrome DevTools 的 Network 面板里首屏资源总大小应该在 500KB 以内
```

有了量化指标，它知道什么叫"成功"。

## 上下文管理：最影响质量的因素

Claude Code 的上下文窗口是有限的。对话越长，早期内容越容易被压缩或遗忘，Claude Code 开始"忘事"。

说实话，这个问题我一开始没当回事，直到有次做了一半的重构，发现 Claude 完全忘记了前面说好的约束，开始往完全相反的方向走。

### 在合适的时候清除上下文

完成一个任务后，开始新任务前，先清理：

```
/clear
```

这不会撤销已做的文件修改，只是重置对话历史。新任务用新鲜的上下文，避免前一个任务的信息干扰。

### 用 `/compact` 代替 `/clear`

如果当前任务还没完成但对话已经很长：

```
/compact
```

这会把对话历史压缩成摘要，保留重要信息，释放上下文空间。比直接清除更安全，但摘要可能丢失细节。

你还可以告诉它压缩时侧重保留什么：

```
/compact 重点保留代码示例和 API 用法
```

这样压缩出来的摘要会更精准，不会丢掉关键信息。

### 子任务用子 Agent

调查性的工作（"看看整个项目有哪些地方用了已废弃的 API"）用子 Agent 做，它完成后把摘要返回主对话，不污染主上下文：

```
在不占用当前对话太多空间的情况下，帮我搜索整个代码库里所有用到 XMLHttpRequest 的地方，只需要给我一个文件列表
```

子 Agent 会自动使用 Haiku 这样的轻量模型来执行搜索任务，又快又省。

## Effort 级别和 Fast 模式

这两个功能直接影响响应速度和 token 消耗，值得专门说说。

### `/effort`：控制思考深度

`/effort` 命令控制 Claude 花多少精力思考。可选的级别：

| 级别 | 适用场景 |
|------|---------|
| `low` | 简单问答、文件查找、格式化 |
| `medium` | 日常编码、小修改（多数计划的默认值） |
| `high` | 复杂调试、架构设计 |
| `xhigh` | 需要深度推理的问题，比如跨模块的架构重构 |
| `max` | 最难的问题，让 Claude 想多久就想多久 |
| `auto` | 让 Claude 自己判断（重置到默认行为） |

用法很简单：

```
/effort low
```

这不是严格的 token 预算，而是行为信号。设成 `low` 的时候，如果问题确实很难，Claude 还是会多想一想，只是比 `high` 想得少。

**实用策略**：探索阶段用 `low`，定位到问题后切 `high` 或 `max` 来解决。比如你在排查一个诡异的 bug，先用 `low` 快速搜索相关代码、缩小范围，然后切 `high` 让它深入分析根因。

也可以在命令行启动时指定：

```bash
claude --effort low
```

### `/fast`：加速输出

`/fast` 切换 Fast 模式，这是一个容易被误解的功能。它不会降级模型——你用的还是同一个 Opus，只是用了速度优化的 API 设置，输出速度最多能快 2.5 倍。

```
/fast
```

开启后终端会显示一个闪电图标。这个设置会跨会话保持，不用每次都开。

不过有个坑：**在会话中途开启 Fast 模式，之前的所有上下文会按 Fast 模式的价格重新计费**。而且切换会让 Prompt Cache 失效，如果频繁切来切去，成本反而会上升。所以建议在会话开始时就决定好用不用 Fast 模式，别中途反复切换。

**Effort + Fast 的组合**：

- `Fast + low effort` = 极致速度，适合简单任务
- `Fast + high effort` = 高质量 + 快速输出，适合复杂但紧急的任务

### 快捷键切换

不用输入斜杠命令，用快捷键更方便：

- `Option+T`（macOS）：切换 Extended Thinking（深度思考）
- `Option+O`（macOS）：切换 Fast 模式

## 用 `@` 引用代替描述

不要用语言描述文件内容，直接用 `@` 引用：

**低效：**
```
在 src/components/UserCard.tsx 里，有一个叫 UserCard 的组件，它接收 user 对象作为 props，现在我想给它加一个 loading 状态……
```

**高效：**
```
给 @src/components/UserCard.tsx 加一个 loading prop，显示骨架屏
```

`@` 引用让 Claude Code 直接读取文件，比你描述更准确，而且你描述文件内容本身就在消耗 token。

## 图片和截图

Claude Code 是多模态的，能看懂图片。这在调试 UI 问题时特别有用——与其费半天劲用文字描述"按钮偏了 3 像素"，不如直接截个图给它看。

### 怎么给它看图

**剪贴板粘贴**（最常用）：

macOS 上按 `Cmd+Ctrl+Shift+4` 截屏到剪贴板，然后在 Claude Code 里按 `Ctrl+V` 粘贴。注意是 `Ctrl+V` 不是 `Cmd+V`——`Cmd+V` 会被终端应用截获，图片到不了 Claude Code。

**拖拽文件**：

把图片文件直接从 Finder 拖到终端窗口里就行。如果图片变成打开新标签而不是附加到 Claude Code，试试按住 `Shift` 再拖。

**引用文件路径**：

也可以直接在提示词里写路径：

```
分析一下这个截图，UI 哪里有问题：/Users/me/Desktop/screenshot.png
```

### 实际用途

- **调试 UI bug**：截个图，Claude 能看到 CSS 布局问题、z-index 层叠错误、对齐偏移这些视觉问题
- **实现设计稿**：把设计师给的 mockup 图片贴进去，让 Claude 照着实现
- **看报错截图**：有时候错误信息在浏览器弹窗里，截个图比手打错误信息快多了
- **手绘草图**：画个大概的布局草图拍照传进去，Claude 能理解你想要的结构

## 任务拆分：大任务拆成小任务

把大任务一次性丢给 Claude Code，往往效果不好：它可能理解偏差、中途迷失方向、或者做了很多但都不对。

**一次性大任务（容易出问题）：**
```
帮我重构整个认证系统，从 session 改成 JWT，包括前端登录组件、后端 API、中间件、token 刷新逻辑，还要更新测试
```

**拆分成小步骤（效果更好）：**
```
# 第一步
帮我在后端添加 JWT 生成和验证的工具函数，放在 src/utils/jwt.ts，
先不要改现有的 session 逻辑

# 确认后继续：
# 第二步
用新的 JWT 工具函数更新 POST /api/login 接口，
同时保留 session 方案作为 fallback（用环境变量控制）

# 以此类推...
```

小步骤的好处：
- 每步都能验证结果
- 出错了容易回滚
- Claude Code 不会在中途"迷路"

## Plan 模式的正确使用场景

[Plan 模式](./03-core-features#plan-模式先想清楚再动手)不是每次都要用，它有成本（多一轮对话）。在这些情况下值得用：

- 任务涉及 5+ 个文件的修改
- 有架构层面的决策需要你确认
- 你对这块代码不熟悉，想先看懂再改
- 历史上这类任务经常跑偏

对于简单明确的任务，直接做就行，不用 Plan。

一个进阶技巧：用 `Shift+Tab` 切换到 Plan 模式，把精力花在打磨计划上，确认后切到自动接受修改模式让 Claude 一口气执行。典型流程是：进入 Plan 模式 → 反复讨论细化方案 → 切换到自动接受 → Claude 一次性完成实现。

## 模型选择：用对模型省很多钱

| 任务类型 | 推荐模型 | 原因 |
|---------|---------|------|
| 探索代码库、搜索 | Haiku | 简单任务，快且省 |
| 日常修改、小功能 | Sonnet（默认） | 综合最优 |
| 架构设计、复杂重构 | Opus | 需要强推理能力 |

### 切换模型的几种方式

**斜杠命令**——支持简写别名，不用记完整的模型 ID：

```
/model haiku
/model sonnet
/model opus
```

直接输入 `haiku`、`sonnet`、`opus` 就行，Claude Code 会自动匹配到对应的最新版本。

**快捷键**——按 `Option+P`（macOS）打开模型选择器，用方向键选择，回车确认。在写代码途中临时想切模型时特别方便，不用打断思路去输命令。

**命令行启动时指定**：

```bash
claude --model haiku
```

### 实用策略

探索阶段用 Haiku，想清楚了再切回 Sonnet 或 Opus 执行。Haiku 搜代码、找文件特别快，这部分不需要大模型。

子 Agent 会自动用合适的模型——探索型子任务默认用 Haiku，不需要你手动指定。

其实我日常大部分工作用 Sonnet 就够了，Opus 只有在遇到真正复杂的架构决策或者诡异 bug 时才切过去。如果你是 Max 或 Team Premium 订阅用户，可以用到最新的 Opus 4.7。

## 多目录和 Monorepo

如果你的项目是 monorepo 结构，或者需要同时看多个仓库的代码，`--add-dir` 功能很实用。

### 两种添加方式

**启动时指定**：

```bash
claude --add-dir ../shared-lib --add-dir ../api-service
```

**会话中随时添加**：

```
/add-dir ../another-package
```

### 典型场景

**Monorepo 子包之间的协作**：你在 `packages/frontend` 里启动了 Claude Code，但需要参考 `packages/shared` 里的类型定义：

```bash
claude --add-dir ../shared
```

**前后端联调**：同时让 Claude 看到前端和后端的代码，理解接口契约：

```bash
claude --add-dir ../backend
```

**微服务架构**：多个服务共享公共代码：

```bash
claude --add-dir ../user-service --add-dir ../auth-service --add-dir ../shared-models
```

### 子目录的 CLAUDE.md

在 monorepo 里，每个子包可以有自己的 `CLAUDE.md`。比如：

```
monorepo/
  CLAUDE.md                    # 全局规则
  packages/
    frontend/
      CLAUDE.md                # 前端特有的规则
    backend/
      CLAUDE.md                # 后端特有的规则
```

Claude Code 会自动加载当前目录及其父目录的 `CLAUDE.md`，所以子包的规则会和全局规则叠加生效。

不过有个注意点：不要加太多目录。目录越多，Claude 的搜索范围越大，效率会下降。只加当前任务真正需要的目录就好。

## 自动化工作流

Claude Code 不只是一个交互式工具，它的 `-p`（pipe）模式让你可以把它嵌入脚本和 CI/CD 流程里。

### 基本的非交互用法

```bash
# 一次性提问
claude -p "解释一下这个项目的整体架构"

# 管道输入
cat error.log | claude -p "分析这个错误日志，找出根因"

# 结构化输出，方便脚本解析
claude -p "列出所有 API 端点" --output-format json
```

`--output-format json` 会返回一个 JSON 对象，包含 `result`、`total_cost_usd`、`duration_ms`、`num_turns` 等字段，很方便在脚本里解析。

### `--allowedTools`：控制权限

在无人值守的场景下，你需要明确告诉 Claude 它能做什么：

```bash
# 只允许读和写文件
claude -p "修复 src/utils.ts 里的类型错误" --allowedTools "Read,Write,Edit"

# 允许特定的 bash 命令（支持前缀匹配）
claude -p "运行测试并修复失败项" --allowedTools "Read,Edit,Bash(pnpm test *),Bash(pnpm lint *)"
```

注意前缀匹配的细节：`Bash(git diff *)` 里 `*` 前面的空格是有意义的。没有空格的 `Bash(git diff*)` 会额外匹配到 `git diff-index` 这样的命令。

### `--max-turns`：防止跑飞

在 CI 里一定要设 `--max-turns`，防止 Claude 在某个问题上无限循环：

```bash
claude -p "审查这个 PR 的代码" --max-turns 10
```

### `--bare`：干净环境

加 `--bare` 会跳过所有自动发现机制——不加载 hooks、skills、MCP 服务器、CLAUDE.md。只有你明确传入的参数生效，这让 CI 运行结果在不同机器上完全一致：

```bash
claude -p "检查代码风格" --bare --allowedTools "Read,Bash(pnpm lint *)"
```

### 实际用法示例

**Git pre-commit hook 里用 Claude 审查代码**：

```bash
#!/bin/bash
# .git/hooks/pre-commit
DIFF=$(git diff --cached)
echo "$DIFF" | claude -p "审查这段 diff，如果有明显的 bug 或安全问题就输出'BLOCK'并说明原因，否则输出'PASS'" \
  --allowedTools "Read" --max-turns 3 --output-format json
```

**CI 里自动审查 PR**：

```bash
claude -p "审查当前分支相对于 main 的所有改动，给出代码质量评分和改进建议" \
  --allowedTools "Read,Bash(git *)" --max-turns 15 --output-format json
```

**批量处理**：

```bash
# 批量分析多个文件
for file in src/api/*.ts; do
  claude -p "分析 $file 的错误处理是否完善" --allowedTools "Read" --max-turns 3
done
```

### 关于成本

在 CI 里用 Claude Code 要特别注意成本控制。开发者手动用的时候能看到花了多少钱，但 CI 是在后台跑的，一不小心 40 个 PR 同时触发，费用就上去了。建议设好 `--max-turns`，必要时用 `--model sonnet` 降低成本。

## 减少重复解释

### 用 CLAUDE.md 一劳永逸

每次都要告诉 Claude Code 相同的事（"项目用 pnpm"、"不要用 any"），就应该把它写进 [CLAUDE.md](./03-core-features#claudemd给-claude-的项目说明书)，永远不用再说第二遍。

不过 CLAUDE.md 不要写太长，建议控制在 200 行以内。太长的话本身也会消耗不少 token，而且里面的信息密度下降后 Claude 也不一定能很好地遵循所有规则。

### 用 Memory 记住你的偏好

纠正了 Claude Code 的行为后，告诉它记住：

```
这个改法不对，应该用 AppError 而不是直接 throw Error。
记住这个项目的错误处理约定。
```

下次它会主动用 AppError。

### 用 Skills 复用工作流

第三次向 Claude Code 解释同一件事的时候，把它打包成 Skill。写好一次，之后用斜杠命令触发，不消耗任何对话 token。

### 让 Claude 用 CLI 工具

和外部服务交互时，告诉 Claude 用 CLI 工具比用 API 更省上下文。比如操作 GitHub 用 `gh`，操作 AWS 用 `aws`，操作 Sentry 用 `sentry-cli`。CLI 工具的输出通常比 API 响应精炼得多，不会往上下文里塞一大堆 JSON。

## 成本监控

用了一会儿 Claude Code，你可能会好奇"刚才那个任务到底花了我多少钱"。

### `/cost` 查看当前费用

```
/cost
```

这是 API 用户最常用的命令，会显示当前会话的 token 消耗和预估费用。对 Pro/Max 订阅用户来说，显示的是用量统计而不是费用（因为已经包含在订阅里了）。

`/usage` 和 `/stats` 是等价的别名，显示的信息更全面，包括计划用量限制、速率限制、当前会话的各项统计。

### Token 花在哪了

一个看似简单的"帮我改一下这个文件"操作，实际上可能消耗 5 万到 15 万 token。因为每次交互都会发送系统提示词、对话历史、文件内容、工具调用结果——这些全部计入 token。

所以 `/compact` 和 `/clear` 的价值就体现在这里：对话越长，每一轮发送的历史越多，token 消耗呈线性增长。

### Prompt Cache：为什么它这么重要

Claude Code 底层会自动使用 Prompt Cache。简单说，就是重复发送的内容（系统提示词、前面的对话历史）不用每次都重新处理，命中缓存的部分只收正常价格的 10%。

没有 Prompt Cache 的话，一个长对话下来（100 轮加上压缩周期）可能花 50-100 美元的输入 token 费。有了缓存，可以降到 10-19 美元。

但缓存有 5 分钟的有效期（TTL）。也就是说，如果你超过 5 分钟没有继续对话，缓存就失效了，下一轮会重新创建缓存，产生额外费用。所以连续工作比断断续续更省钱。

**会破坏缓存的操作**：
- 中途切换模型
- 添加或移除 MCP 工具
- 系统提示词里有时间戳这种每次变化的内容

这些操作会让整个缓存失效，那一轮的成本可能突然变成正常的 5 倍。所以建议在会话开始时就确定好模型和工具配置，尽量别中途改。

## 避免反模式

**反模式一：让它"自由发挥"**

```
不好：帮我优化这个项目
好：  把 src/pages/Home.tsx 的首屏渲染时间优化到 1s 以内，只优化前端，不改后端接口
```

**反模式二：一次性提太多问题**

```
不好：你能帮我做A、B、C、D、E这五件事吗？顺便看看F有没有问题，还有G……
好：  先做A，完成后再讨论B
```

**反模式三：不提供上下文就让它修 bug**

```
不好：这里有个 bug，帮我修
好：  运行 pnpm test 后，UserService.test.ts 的第 42 行报错：
      Expected 200 but received 401
      这是因为测试里没有模拟认证 token，帮我加上
```

**反模式四：让它做完再审查**

对于大修改，边做边审查：每完成一小步就检查一下方向是否正确，而不是等它改了 20 个文件再看。我觉得这个习惯要比任何技巧都重要——做错了才发现，比什么都费时间。

**反模式五：不写 CLAUDE.md**

我见过有人用了几个月 Claude Code 都没写 CLAUDE.md，每次都在对话里重复说"用 pnpm 不要用 npm"、"遵循项目已有的代码风格"。这些话本身就在消耗 token，而且每次新会话都要重说一遍。花 20 分钟写好 CLAUDE.md，后面每天都在省钱。

**反模式六：什么都用 Opus**

Opus 很强，但简单任务用它就是浪费。搜个文件、格式化一段代码、写个简单的工具函数，Sonnet 甚至 Haiku 就够了。养成根据任务复杂度切换模型的习惯。

**反模式七：长对话不清理**

对话超过 30-40 轮后，上下文会变得很"脏"——早期的信息被压缩、Claude 开始出现前后矛盾、响应质量明显下降。阶段性任务完成后及时 `/clear` 或 `/compact`。

**反模式八：不看 diff 就接受修改**

Claude Code 给出修改后会显示 diff，一定要看。不要无脑接受所有修改。尤其是大范围修改，花 30 秒扫一眼 diff 比事后花 30 分钟排查问题划算多了。

## 键盘快捷键

熟练使用快捷键能显著提升操作效率。下面是完整的快捷键列表。

### 基础操作

| 操作 | 快捷键 |
|------|--------|
| 中断 Claude 的输出 | `Esc` |
| 撤销/回滚到之前的状态 | `Esc Esc`（连按两次） |
| 取消当前输入 | `Ctrl+C` |
| 退出 Claude Code | `Ctrl+D` |
| 重绘屏幕 | `Ctrl+L` |
| 查看历史命令 | `↑` / `↓` |
| 反向搜索命令历史 | `Ctrl+R` |
| 查看所有快捷键 | `?` |

### 多行输入

终端里默认按回车就发送了，但有时候你需要写多行提示词：

| 方式 | 说明 |
|------|------|
| `Ctrl+J` | 插入换行 |
| `\` + `Enter` | 行末打反斜杠再回车，继续下一行 |
| `Option+Enter`（macOS） | 插入换行 |
| `Shift+Enter` | 在 iTerm2/WezTerm/Ghostty/Kitty/Warp 中插入换行 |

### 编辑和外部编辑器

| 操作 | 快捷键 |
|------|--------|
| 用外部编辑器写长提示词 | `Ctrl+G` 或 `Ctrl+X Ctrl+E` |

`Ctrl+G` 特别值得一提。它会打开你系统默认的文本编辑器（取决于 `$EDITOR` 环境变量），让你在真正的编辑器里写多段落的复杂提示词，保存关闭后自动发送。对于需要写很长指令的场景，比在终端单行输入框里挤来挤去好太多了。

### 模式和模型切换

| 操作 | 快捷键 |
|------|--------|
| 切换模型 | `Option+P` |
| 切换 Extended Thinking | `Option+T` |
| 切换 Fast 模式 | `Option+O` |
| 循环切换权限模式 | `Shift+Tab` |

macOS 用户注意：使用 `Option` 键的快捷键需要先在终端里把 Option 键配置为 Meta 键。在 iTerm2 里：设置 → Profiles → Keys，把 Left/Right Option 设为 "Esc+"。在 Terminal.app 里：Profiles → Keyboard，勾选 "Use Option as Meta Key"。不确定配置对不对的话，在 Claude Code 里运行 `/terminal-setup`。

### 后台任务和图片

| 操作 | 快捷键 |
|------|--------|
| 把当前任务放到后台 | `Ctrl+B` |
| 查看后台任务列表 | `Ctrl+T` |
| 终止所有后台 Agent | `Ctrl+F`（按两次确认） |
| 粘贴剪贴板图片 | `Ctrl+V` |
| 查看会话记录 | `Ctrl+O` |

`Ctrl+B` 的用法：Claude 在处理一个耗时的任务时，按 `Ctrl+B` 把它推到后台，你可以继续做别的事或者开始新的前台任务。用 `Ctrl+T` 查看后台任务的进度。（tmux 用户注意：tmux 的前缀键也是 `Ctrl+B`，你需要按两次。）

### VS Code 插件额外快捷键

| 操作 | 快捷键 |
|------|--------|
| 切换焦点（编辑器/Claude） | `Cmd+Esc` |
| 打开新对话标签页 | `Cmd+Shift+Esc` |
| 插入 @ 引用 | `Option+K` |

### 自定义快捷键

如果默认快捷键和你的习惯冲突，可以在 `~/.claude/keybindings.json` 里自定义。支持单键、组合键、连续键序列。不过 `Ctrl+C` 和 `Ctrl+D` 是硬编码的，不能改。

## Token 优化的总原则

1. **精确而不是详细**：指令精确，不等于字数多。具体的文件名 + 简短的任务描述，胜过大段模糊的描述
2. **任务完成就清理**：完成阶段性任务后，用 `/clear` 或 `/compact` 重置上下文
3. **让代码说话**：用 `@` 引用代替描述，减少冗余信息
4. **匹配模型和 Effort**：简单任务用 Haiku + low effort，复杂任务才上 Opus + high effort
5. **固化重复信息**：CLAUDE.md、Memory、Skills 三层固化机制，让重复信息只说一次
6. **保护缓存**：避免中途切换模型或工具配置，让 Prompt Cache 保持命中
7. **善用非交互模式**：重复性的检查和审查工作交给 `claude -p` 自动化

## 小结

效率高的使用方式有共同特征：指令具体、任务小、上下文干净、提供验证手段。这些习惯形成之后，Claude Code 的输出质量会明显提高，来回修改的次数减少，整体消耗的 token 反而更少。

好工具需要磨合期，Claude Code 也一样。花几周时间把 CLAUDE.md 写好、把常用工作流打包成 Skills、把模型和权限配置调到顺手，这些前期投入会在后续每天的工作里不断回报。

说到底，省 token 的核心不是"少说话"，而是"说对的话"。一条精准的指令胜过十条模糊的尝试，一个干净的上下文胜过一段充满噪音的长对话。掌握了这些，你会发现 Claude Code 用起来既快又省。
