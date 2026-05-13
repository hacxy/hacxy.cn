---
title: "第二章：安装与快速上手"
date: 2026-05-12
tags:
  - AI
  - ClaudeCode
  - 入门
sort: 2
summary: 从零开始安装 Claude Code，完成首次登录配置，并通过几个真实场景体验它的基本工作方式。
---

# 第二章：安装与快速上手

## 系统要求

先看看你的机器够不够格：

- 操作系统：macOS 13.0+、Ubuntu 20.04+ / Debian 10+、Windows 10 (1809+)
- 硬件：4 GB 内存起步，x64 或 ARM64 处理器
- Node.js 18+（仅 npm 安装方式需要）
- 网络：必须联网，所有 AI 推理都在 Anthropic 服务器上跑
- 账号：Claude Pro / Max / Team / Enterprise，或者 Anthropic Console 的 API Key。免费的 Claude.ai 账号不行

不需要 GPU。你的电脑只负责跑 CLI 客户端和发请求，重活都在云端。

## 安装

安装方式有好几种，挑一个顺手的就行。

### 原生安装（推荐）

这是官方最推荐的方式，装完会自动后台更新：

macOS / Linux / WSL：

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

Windows PowerShell：

```powershell
irm https://claude.ai/install.ps1 | iex
```

Windows CMD：

```batch
curl -fsSL https://claude.ai/install.cmd -o install.cmd && install.cmd && del install.cmd
```

### npm 安装

如果你是 Node.js 用户，这个方式可能更熟悉：

```bash
npm install -g @anthropic-ai/claude-code
```

npm 包本质上还是装了同一个原生二进制文件，`claude` 命令本身并不依赖 Node 运行。不过 npm 安装不会自动更新，得手动升级。

注意别用 `sudo npm install -g`，会引起权限问题。如果碰到权限报错，用 [nvm](https://github.com/nvm-sh/nvm) 管理 Node.js 是更干净的做法。

### Homebrew（macOS）

```bash
brew install --cask claude-code
```

Homebrew 有两个 cask：`claude-code` 跟踪稳定版，大概延迟一周；`claude-code@latest` 跟踪最新版。Homebrew 装的不会自动更新，需要手动 `brew upgrade claude-code`。

### Windows 补充说明

Windows 上有两条路：

1. 原生 Windows + Git Bash —— 装好 [Git for Windows](https://git-scm.com/downloads/win)，然后用上面的 PowerShell 或 CMD 命令安装。装完后从 PowerShell、CMD、Git Bash 哪个启动都行，Claude Code 内部会自动用 Git Bash 执行命令。如果没装 Git for Windows，会退回到 PowerShell。
2. WSL（推荐）—— 在 WSL 里用 Linux 安装命令，体验和 macOS / Linux 一样。

### 验证安装

装完跑一下：

```bash
claude --version
```

看到版本号就说明装好了。如果报 `command not found`，检查一下 PATH 有没有配对。

还有个更全面的诊断命令：

```bash
claude doctor
```

它会检查你的环境配置、网络连接、认证状态，有问题会告诉你怎么修。遇到奇怪的报错先跑这个。

### 更新

原生安装会自动后台更新。想手动触发的话：

```bash
claude update
```

npm 用户得这样升级：

```bash
npm install -g @anthropic-ai/claude-code@latest
```

别用 `npm update -g`，它受 semver 约束，可能不会升到最新版本。

想装某个特定版本也行：

```bash
# 原生安装方式
curl -fsSL https://claude.ai/install.sh | bash -s 2.1.89

# 或者装稳定版渠道
curl -fsSL https://claude.ai/install.sh | bash -s stable
```

### 使用第三方 API（可选）

如果你没有 Anthropic 官方订阅，或者想用第三方 API 提供商（比如 OpenRouter、自建代理之类的），可以用 [CC Switch](https://github.com/farion1231/cc-switch) 来管理。

CC Switch 是一个跨平台桌面应用，提供可视化界面来配置 Claude Code 的 API 端点——不用手动改配置文件，也不用记一堆环境变量。除了 Claude Code，它还支持 Codex、Gemini CLI 等其他 AI CLI 工具的统一管理。

安装方式：

```bash
# macOS
brew install --cask cc-switch

# Windows / Linux
# 从 GitHub Releases 页面下载对应安装包
# https://github.com/farion1231/cc-switch/releases
```

装好后打开 CC Switch，点"Add Provider"添加你的 API 提供商，选对应的预设或自定义填入 API 地址和密钥，然后点"Enable"就行了。Claude Code 支持热切换，改完不需要重启终端。

用第三方 API 还有个额外好处：可以跳过 Anthropic 的官方登录流程，直接就能开始用。对于网络环境受限的场景，这条路可能更顺畅。

### IDE 插件

#### VS Code

在扩展市场搜索 Claude Code，或者命令面板里运行：

```
ext install anthropic.claude-code
```

安装后在编辑器工具栏、活动栏或状态栏都能找到 Claude 图标。

#### JetBrains（IntelliJ IDEA / WebStorm / PyCharm 等）

打开 Settings → Plugins → Marketplace，搜索 "Claude Code" 安装。装完重启 IDE。

插件装好后，在 IDE 的内置终端里跑 `claude` 完成认证，集成功能就会激活。快捷键 `Cmd+Esc`（Mac）或 `Ctrl+Esc`（Windows/Linux）可以直接在编辑器里打开 Claude Code。

JetBrains 插件有几个好用的地方：代码修改会直接在 IDE 的 diff 查看器里展示，当前选中的代码会自动作为上下文传给 Claude，IDE 里的 lint 和语法错误也会自动同步过去。

## 首次登录

安装完成后，在任意目录运行：

```bash
claude
```

第一次运行会引导你完成两件事：

1. 选择登录方式 —— 用 Claude 账号（通过浏览器 OAuth 认证）或者 Anthropic Console 的 API Key
2. 选择权限模式 —— 决定 Claude 在操作你的文件时需要多少确认（后面会详细说）

登录成功后，命令行进入交互模式，看到提示符就可以开始用了。

如果你想直接用 API Key 登录，可以跳过浏览器流程：

```bash
claude auth login --console
```

登录状态随时可以查：

```bash
claude auth status
```

### 终端配置（可选）

如果你想在输入时用 Shift+Enter 换行（而不是直接发送），可以跑一下终端配置：

```bash
claude terminal-setup
```

或者在交互模式里输入 `/terminal-setup`。这个命令会往你的 shell 配置里加一小段设置，让终端正确处理 Shift+Enter。不过说实话，用 `\` + Enter 或者 Ctrl+J 换行也完全够用，这步是可选的。

## 第一次使用

找一个你熟悉的项目，进入目录：

```bash
cd ~/Projects/my-project
claude
```

### 先问问项目结构

```
你: 这个项目大概是做什么的？主要的代码在哪里？
```

Claude Code 会自己去读文件，然后给你一个概述。这步不是必须的，但能帮你感受到它"真的看到了你的代码"——跟普通 AI 聊天贴代码片段的感觉完全不同。

### 让它做一件具体的事

```
你: 找出所有用 console.log 调试的地方，告诉我在哪些文件的哪些行
```

它会搜索代码库，列出结果。

```
你: 帮我把 src/utils/date.ts 里的函数加上 JSDoc 注释
```

它会读取文件，添加注释，并展示差异（diff）让你确认。

### 确认和拒绝修改

Claude Code 在修改文件之前，通常会展示 diff 并请求确认。看到 diff 后：

- 按 `y` 或 `Enter` 接受
- 按 `n` 拒绝
- 直接输入新的指令让它重新来

这是 Claude Code 最核心的安全机制：你始终掌控最终决定权。

## 权限模式

刚才说的"每次都要确认"只是默认行为。Claude Code 有好几种权限模式，适合不同场景。按 `Shift+Tab` 可以在模式之间循环切换。

### Default（默认模式）

读文件不需要确认，写文件和执行命令都要你点头。最保守的模式，刚上手用这个就对了。

### AcceptEdits（自动接受编辑）

文件修改自动通过，但 Bash 命令还是要确认。适合已经建立了信任感，不想每个文件改动都按一次 Enter 的时候。反正改了什么 git diff 一看就知道。

### Plan（规划模式）

Claude 只读代码、做分析、给方案，但不会动你的文件。适合你想先看看它打算怎么做，确认思路对了再放手。你可以用 `Shift+Tab` 切到 Plan 模式，也可以在单条消息前加 `/plan` 临时进入。

说实话，复杂任务先用 Plan 模式出方案，是个好习惯。

### Auto（自动模式）

Claude 自己做权限决策，有一个独立的分类器模型在背后审查每个操作，拦截明显危险的行为。

这个模式比较新，目前只对 Max、Team、Enterprise 和 API 用户开放，Pro 用户暂时用不了。Auto 模式不是无脑放开所有权限——它有内置的安全护栏，比 `--dangerously-skip-permissions` 安全得多。

适合你已经对 Claude Code 很熟悉、被确认弹窗烦到不行的时候。一个有意思的观点：一个永远不会疲劳的 AI 分类器，可能比一个连续点了二十次"确认"、早就不看内容了的人类更安全。

### bypassPermissions（跳过所有权限检查）

跳过所有确认，什么都直接执行。只应该在完全隔离的环境里用——容器、虚拟机、一次性 CI runner 之类的。日常开发别用这个。

## 基础交互模式

### 一问一答

直接描述任务：

```
帮我给这个 API 接口加上请求参数校验
```

### 带上下文引用

用 `@` 指定文件，让它聚焦在特定内容上（这个用法在[第三章](./03-core-features)会详细展开）：

```
看一下 @src/api/user.ts，这里的错误处理方式不对，帮我改成统一的 AppError 格式
```

### 分步骤工作

复杂任务可以分步推进：

```
你: 先帮我分析一下现在的数据库查询有没有 N+1 问题
Claude: [分析结果]
你: 把第一个问题修掉，用 eager loading 解决
```

## 常用快捷键

这些快捷键值得记一下，用多了会很顺手：

| 快捷键 | 作用 |
|--------|------|
| `Esc` | 打断 Claude 的输出 |
| `Esc` `Esc` | 打开回溯菜单，可以撤销之前的操作 |
| `Ctrl+C` | 取消当前输入 |
| `Ctrl+D` | 退出 Claude Code |
| `Ctrl+L` | 清屏 |
| `\` + `Enter` 或 `Ctrl+J` | 输入多行内容（不发送） |
| `Shift+Tab` | 切换权限模式 |
| `Option+P`（Mac）/ `Alt+P` | 切换模型 |
| `?` | 显示所有可用快捷键 |

重点说一下 `Esc Esc`，这个功能叫"回溯"（rewind），非常实用。按两下 Esc 会打开一个菜单，你可以选择回退到之前的某个对话节点。它提供几个选项：

- 同时恢复代码和对话（最彻底的撤销）
- 只恢复对话，保留代码改动
- 只恢复代码，保留对话历史
- 从某个点开始总结压缩

比如 Claude 改了一堆代码但你觉得方向不对，`Esc Esc` 直接回退，比手动 `git stash` 快得多。

## 退出和恢复

退出当前会话：`Ctrl+D`

Claude Code 的会话会自动保存到磁盘（在 `~/.claude/projects/` 下），所以你随时可以恢复之前的对话。

### 继续上次的对话

```bash
claude -c    # 继续当前目录最近一次会话
```

### 恢复特定会话

```bash
claude -r              # 打开会话选择器，从列表里挑
claude -r "abc123"     # 通过 session ID 恢复
claude -r "auth-refactor"   # 通过会话名称恢复
```

### 给会话命名

在会话里输入 `/rename my-feature` 就能起个名字。起过名的会话在列表里更容易找到。也可以启动时直接指定：

```bash
claude -n "auth-refactor"
```

好的命名习惯能省不少事，比如用 `feature-xxx`、`bugfix-xxx`、`refactor-xxx` 这样的前缀。

### 分叉对话

有时候你想从某个点岔出去试另一条路，但又不想丢掉原来的对话。两种方式：

```bash
# 在会话里输入
/branch

# 或者从命令行
claude -c --fork-session
claude -r "session-id" --fork-session
```

分叉会创建一个新的会话，拷贝原来的历史记录但从那个点开始独立发展。原来的会话完全不受影响。

## 一次性任务模式

不想进入交互模式，只想跑一个任务就走：

```bash
# 直接传入任务描述（会进入交互模式，带初始提示）
claude "帮我检查一下这个项目有没有安全漏洞"

# -p 参数：执行后直接输出结果并退出，不进入交互
claude -p "统计一下 src 目录下 TypeScript 文件的总行数"
```

`-p`（print 模式）是脚本化使用的关键。它输出结果到 stdout 然后退出，可以和其他命令组合。

### 管道输入

Claude Code 是个标准的 Unix 工具，支持管道：

```bash
# 让它 review 一个文件
cat src/api/auth.ts | claude -p "review 这段代码的安全性"

# 分析日志
tail -100 error.log | claude -p "分析这些错误日志，找出根本原因"

# review 最近的 git 改动
git diff HEAD~3 | claude -p "review 这些改动"
```

### 指定模型

```bash
claude --model opus "帮我重构这个模块"
```

### 结构化输出

在 CI/CD 或者脚本里，JSON 输出更方便解析：

```bash
claude -p "检查代码规范" --output-format json
```

输出的 JSON 包含结果文本、token 消耗、花费金额、耗时等信息。

### 限制工具权限

在自动化场景里，你可能只想让 Claude 读代码但不许改：

```bash
claude -p "分析项目架构" --allowedTools "Read,Bash"
```

### 限制预算和轮次

```bash
# 最多花 5 美元
claude -p "重构这个模块" --max-budget-usd 5.00

# 最多跑 3 个来回
claude -p "修复这个 bug" --max-turns 3
```

这俩参数在 CI 脚本里挺有用，防止 Claude 无限循环烧钱。

## 常见疑问

**Q：它会不会直接删掉我的文件？**

默认模式下，执行文件修改和命令前都会请求确认。你可以通过权限模式调整这个行为，具体见[第五章](./05-settings-and-hooks)。

**Q：用的是哪个模型？**

默认是 Claude Sonnet 4.6，可以用 `Shift+Tab` 菜单或 `Option+P`（Mac）切换。Opus 处理复杂任务更好，但消耗 token 更多；Haiku 更快更省，适合简单任务。也可以用 `--model` 参数在启动时指定。

**Q：会不会把我的代码发给第三方？**

代码发送给 Anthropic 的 API 进行处理，适用 [Anthropic 隐私政策](https://anthropic.com/privacy)。Enterprise 版有更严格的数据隔离保证。如果你用第三方 API 提供商，数据则发给对应的提供商，注意看他们的隐私条款。

**Q：用 git 管理的项目能正常用吗？**

完全没问题。Claude Code 会尊重 `.gitignore`，不会去读被忽略的文件。它做的修改就是普通的文件编辑，你用 `git diff` 就能看到所有改动，不满意 `git checkout -- .` 一键还原。

**Q：必须联网吗？**

是的。Claude Code 本身只是个客户端，所有推理都在云端完成，断网没法用。

**Q：能同时开多个 Claude Code 吗？**

可以。不同终端窗口、不同项目目录下同时跑多个实例，互不干扰。如果是同一个项目想并行探索不同方向，用 git worktree 配合效果更好。

## 小结

上手成本很低：一条安装命令，一次登录，进入项目目录，`claude`。核心使用模式就是在终端里和它对话，告诉它做什么，审查它的修改，确认或拒绝。碰到问题 `claude doctor` 先诊断一下。

下一章深入看它的核心功能——你能用它做哪些具体的事。
