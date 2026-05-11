---
title: "第二章：安装与快速上手"
date: 2026-05-11
tags:
  - AI
  - ClaudeCode
  - 入门
sort: 2
summary: 从零开始安装 Claude Code，完成首次登录配置，并通过几个真实场景体验它的基本工作方式。
---

# 第二章：安装与快速上手

## 安装

### macOS / Linux / WSL

打开终端，运行一行命令：

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

或者用 Homebrew：

```bash
brew install --cask claude-code
```

### Windows

PowerShell：

```powershell
irm https://claude.ai/install.ps1 | iex
```

CMD：

```cmd
curl -fsSL https://claude.ai/install.cmd -o install.cmd && install.cmd && del install.cmd
```

或者用 WinGet：

```cmd
winget install Anthropic.ClaudeCode
```

### VS Code 插件

在扩展市场搜索 **Claude Code**，或者直接访问：

```
vscode:extension/anthropic.claude-code
```

安装后在编辑器工具栏、活动栏或状态栏都能找到 Claude 图标。

## 首次登录

安装完成后，在任意目录运行：

```bash
claude
```

第一次运行会提示你登录。按提示用 Claude 账号（或 Anthropic Console API Key）完成认证。登录成功后，命令行进入交互模式，看到提示符就可以开始用了。

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

Claude Code 会自己去读文件，然后给你一个概述。这步不是必须的，但有助于你感受它"真的看到了你的代码"。

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

Claude Code 在修改文件之前，通常会展示 diff 并请求你的确认。这是一个关键机制：**你始终掌控最终决定权**。

看到 diff 后：
- 按 `y` 或 `Enter` 接受
- 按 `n` 拒绝
- 直接输入新的指令让它重新来

## 基础交互模式

### 一问一答

直接描述任务：

```
帮我给这个 API 接口加上请求参数校验
```

### 带上下文引用

用 `@` 指定文件，让它聚焦在特定内容上：

```
看一下 @src/api/user.ts，这里的错误处理方式不对，帮我改成统一的 AppError 格式
```

### 分步骤工作

对于复杂任务，可以分步推进：

```
你: 先帮我分析一下现在的数据库查询有没有 N+1 问题
Claude: [分析结果]
你: 把第一个问题修掉，用 eager loading 解决
```

## 退出和恢复

退出当前会话：`Ctrl+D` 或 `Cmd+D`

下次想继续上次的对话：

```bash
claude -c    # 继续最近一次会话
claude -r    # 列出历史会话，选择恢复
```

## 一次性任务模式

不想进入交互模式，只想执行单个任务后退出：

```bash
# 直接传入任务描述
claude "帮我检查一下这个项目有没有安全漏洞"

# -p 参数：执行后立即退出，不进入交互
claude -p "统计一下 src 目录下 TypeScript 文件的总行数"
```

## 常见疑问

**Q：它会不会直接删掉我的文件？**

默认情况下，执行高风险操作前会请求你的确认。可以在设置里调整权限策略，具体见后面的配置章节。

**Q：用的是哪个模型？**

默认是 Claude Sonnet 4.6，可以用 `/model` 命令切换。Opus 处理复杂任务更好，但消耗 token 更多；Haiku 更快更省，适合简单任务。

**Q：会不会把我的代码发给第三方？**

代码发送给 Anthropic 的 API 进行处理，适用 Anthropic 的隐私政策。企业版（Enterprise）有更严格的数据隔离保证。

## 小结

Claude Code 的上手成本很低：一条安装命令，一次登录，进入项目目录，`claude`。核心使用模式就是在终端里和它对话，告诉它做什么，审查它的修改，确认或拒绝。

下一章我们深入看它的核心功能——你能用它做哪些具体的事。
